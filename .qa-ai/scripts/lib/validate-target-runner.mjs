import { spawnSync } from 'node:child_process';
import { getConfigValue } from './utils.mjs';
import { TARGET_VALIDATOR_PIPELINE, VALIDATOR_REGISTRY, validatorScriptPath } from './validator-registry.mjs';
import { ARTIFACT_PATHS } from './artifact-paths.mjs';
import { shouldIncludeTargetValidator } from './validate-target-conditions.mjs';
import { validateQualityReport } from './quality-report.mjs';
import {
  validateActiveSpecialists,
  validateDesignFeatures,
  validateExecutionEvidence,
  validateExternalIntake,
  validateHealingLog,
  validateKarateFeatures,
  validateMaestroFlows,
  validateReleaseGateFile,
  validateSyncDiff,
  validateSyncPlan,
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
    validateReleaseGateFile(cwd, getConfigValue(config, 'releaseGate.path', ARTIFACT_PATHS.releaseGate), opts),
  'validate-test-design': (cwd, opts) => validateTestDesignArtifacts(cwd, opts),
  'validate-sync-plan': (cwd, opts) => validateSyncPlan(cwd, opts),
  'validate-sync-diff': (cwd, opts) => validateSyncDiff(cwd, opts),
  'validate-external-intake': (cwd, opts) => validateExternalIntake(cwd, opts)
};

function subprocessArgs(id, { allowEmpty, allowMissing, strictUntrusted }) {
  const args = [validatorScriptPath(id)];
  if (['validate-sync-plan', 'validate-features'].includes(id) && allowEmpty) args.push('--allow-empty');
  if (id !== 'validate-untrusted-content' && allowMissing) args.push('--allow-missing');
  if (id === 'validate-sync-result') {
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
          if (id === 'validate-sync-plan') {
            return runner(root, { allowEmpty, allowMissing });
          }
          if (id === 'validate-sync-diff' || id === 'validate-external-intake') {
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

export function parseTextFindings(label, output) {
  const findings = [];
  const lines = output.split(/\r?\n/);
  let currentFile = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const featMatch = line.match(/^\[FAIL\]\s+(.*?\.(?:feature|spec|flow|js|ts|mjs|cjs|yaml|yml|json|md))$/);
    if (featMatch) {
      currentFile = featMatch[1];
      continue;
    }

    if (line.startsWith('  - ') && currentFile) {
      findings.push({ file: currentFile, message: line.slice(4).trim(), severity: 'error' });
      continue;
    }

    if (line.startsWith('  [WARN] ') && currentFile) {
      findings.push({ file: currentFile, message: line.slice(9).trim(), severity: 'warning' });
      continue;
    }

    if (line.startsWith('[FAIL]') || line.startsWith('[WARN]')) {
      const severity = line.startsWith('[FAIL]') ? 'error' : 'warning';
      const content = line.slice(6).trim();
      const fileLineMatch = content.match(/^([^:\s]+):(\d+)(?::)?\s*(.*)$/);
      if (fileLineMatch && (fileLineMatch[1].includes('/') || fileLineMatch[1].includes('.'))) {
        findings.push({
          file: fileLineMatch[1],
          line: parseInt(fileLineMatch[2], 10),
          message: fileLineMatch[3],
          severity
        });
      } else {
        findings.push({ message: content, severity });
      }
      continue;
    }

    if (line.startsWith('FAILED -') || line.startsWith('FAILED:')) {
      findings.push({ message: line.trim(), severity: 'error' });
    }
  }

  return findings;
}

function normalizeSubprocessFindings(parsed, passed, stepLabel, stdout, stderr) {
  if (parsed && Array.isArray(parsed.findings)) {
    return parsed.findings.map((f) => ({
      file: f.file || f.path || '',
      line: typeof f.line === 'number' ? f.line : undefined,
      message: f.message || '',
      severity: f.severity || (passed ? 'warning' : 'error')
    }));
  }
  if (parsed && Array.isArray(parsed.errors)) {
    return parsed.errors.map((err) => ({
      message: typeof err === 'string' ? err : JSON.stringify(err),
      severity: 'error'
    }));
  }
  return parseTextFindings(stepLabel, `${stdout}\n${stderr}`);
}

export function runSubprocessStepJson(cwd, step) {
  const subprocessArgs = step.args.includes('--json') ? step.args : [...step.args, '--json'];
  const result = runSubprocessStep(cwd, { ...step, args: subprocessArgs }, { quiet: true });
  const passed = result.ok;
  let findings;
  try {
    const parsed = JSON.parse(result.stdout);
    findings = normalizeSubprocessFindings(parsed, passed, step.label, result.stdout, result.stderr);
  } catch {
    findings = parseTextFindings(step.label, `${result.stdout}\n${result.stderr}`);
  }
  return {
    name: step.label,
    status: passed ? 'passed' : 'failed',
    findings
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
