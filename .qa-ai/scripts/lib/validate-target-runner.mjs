import { spawnSync } from 'node:child_process';
import { getConfigValue } from './utils.mjs';
import { TARGET_VALIDATOR_PIPELINE, VALIDATOR_REGISTRY, validatorScriptPath } from './validator-registry.mjs';
import { shouldIncludeTargetValidator } from './validate-target-conditions.mjs';
import { validateQualityReport } from './quality-report.mjs';
import {
  validateActiveSpecialists,
  validateDesignFeatures,
  validateExecutionEvidence,
  validateHealingLog,
  validateKarateFeatures,
  validateMaestroFlows,
  validateReleaseGateFile,
  validateTestCoverage,
  validateTestDesignArtifacts,
  validateTestImpact,
  validateTraceability,
  validateUntrustedContent,
  toFindings
} from './validator-api.mjs';

/** @typedef {{ label: string, kind: 'inProcess', run: (cwd: string, options: object) => Promise<object> } | { label: string, kind: 'subprocess', args: string[] }} TargetValidatorStep */

const IN_PROCESS_RUNNERS = {
  'validate-features': (cwd, opts) => validateDesignFeatures(cwd, opts),
  'validate-test-coverage': (cwd, opts) => validateTestCoverage(cwd, opts),
  'validate-quality-report': (cwd, opts) => validateQualityReport(cwd, opts),
  'validate-karate-features': (cwd, opts) => validateKarateFeatures(cwd, opts),
  'validate-maestro-flows': (cwd, opts) => validateMaestroFlows(cwd, opts),
  'validate-execution-evidence': (cwd, opts) => validateExecutionEvidence(cwd, opts),
  'validate-healing-log': (cwd, opts) => validateHealingLog(cwd, opts),
  'validate-test-impact': (cwd, opts) => validateTestImpact(cwd, opts),
  'validate-traceability': (cwd, opts) => validateTraceability(cwd, opts),
  'validate-untrusted-content': (cwd, opts) => validateUntrustedContent(cwd, opts),
  'validate-active-specialists': (cwd, opts) => validateActiveSpecialists(cwd, opts),
  'validate-release-gate': (cwd, opts, config) =>
    validateReleaseGateFile(cwd, getConfigValue(config, 'releaseGate.path', 'qa-ai-output/release-gate.yaml'), opts),
  'validate-test-design': (cwd, opts) => validateTestDesignArtifacts(cwd, opts)
};

function subprocessArgs(id, { allowEmpty, allowMissing, strictUntrusted }) {
  const args = [validatorScriptPath(id)];
  if (['validate-sync-plan', 'validate-features'].includes(id) && allowEmpty) args.push('--allow-empty');
  if (id !== 'validate-untrusted-content' && allowMissing) args.push('--allow-missing');
  if (['validate-sync-diff', 'validate-sync-result', 'validate-external-intake'].includes(id)) {
    args.push('--json');
  }
  if (id === 'validate-untrusted-content') {
    args.push('--allow-missing');
    if (strictUntrusted) args.push('--strict');
  }
  return args;
}

/**
 * Build ordered validator steps for validate-target from registry metadata.
 * @returns {Promise<TargetValidatorStep[]>}
 */
export async function buildTargetValidatorSteps(context) {
  const { config, args } = context;
  const allowEmpty = Boolean(args['allow-empty']);
  const allowMissing = Boolean(args['allow-missing']);
  const strictDoctor = !args['no-strict-doctor'];
  const featureOpts = { allowEmpty };
  const artifactOpts = { allowEmpty, allowMissing };
  const strictUntrusted = Boolean(args['strict-untrusted-content']);

  /** @type {TargetValidatorStep[]} */
  const steps = [
    {
      label: 'doctor',
      kind: 'subprocess',
      args: ['.qa-ai/scripts/doctor.mjs', ...(strictDoctor ? ['--strict'] : [])]
    }
  ];

  for (const id of TARGET_VALIDATOR_PIPELINE) {
    const entry = VALIDATOR_REGISTRY[id];
    if (!entry?.targetLabel) continue;
    const include = await shouldIncludeTargetValidator(entry, context);
    if (!include) continue;

    if (entry.targetKind === 'inProcess') {
      const runner = IN_PROCESS_RUNNERS[id];
      if (!runner) continue;
      steps.push({
        label: entry.targetLabel,
        kind: 'inProcess',
        run: (root) => {
          if (id === 'validate-untrusted-content') {
            return runner(root, { allowMissing: true, strict: strictUntrusted });
          }
          if (id === 'validate-active-specialists') {
            return runner(root, { allowMissing });
          }
          if (id === 'validate-release-gate') {
            return runner(root, { allowMissing, allowPending: Boolean(args['allow-pending']) }, config);
          }
          if (id === 'validate-test-design') {
            return runner(root, { allowMissing });
          }
          const opts = ['validate-features', 'validate-karate-features', 'validate-maestro-flows'].includes(id)
            ? featureOpts
            : artifactOpts;
          return runner(root, opts);
        }
      });
      continue;
    }

    if (entry.targetKind === 'subprocess') {
      steps.push({
        label: entry.targetLabel,
        kind: 'subprocess',
        args: subprocessArgs(id, { allowEmpty, allowMissing, strictUntrusted })
      });
    }
  }

  return steps;
}

export function runSubprocessStep(cwd, step, { quiet = false } = {}) {
  const result = spawnSync(process.execPath, step.args, {
    cwd,
    encoding: 'utf8',
    stdio: quiet ? 'pipe' : 'inherit',
    shell: false
  });
  return {
    ok: (result.status ?? 1) === 0,
    status: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
}

export async function runInProcessStep(cwd, step) {
  const result = await step.run(cwd, {});
  return {
    ok: Boolean(result.ok),
    result,
    findings: toFindings(result)
  };
}

export { toFindings };
