#!/usr/bin/env node
import { validateReleaseGateData } from './lib/release-gate.mjs';
import { validateExecutionEvidence } from './validate-execution-evidence.mjs';
import {
  getConfigValue,
  loadQaAiConfig,
  logHeader,
  parseArgs,
  parseSimpleYaml,
  pathExists,
  readText,
  resolveRepoPath,
  toPosixPath
} from './lib/utils.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-release-gate.mjs [options]

Options:
  --path <file>       Override release gate file path
  --allow-missing     Return success when the gate file is missing
  --allow-pending     Allow decision: PENDING (draft gates only)
  --json              Print machine-readable JSON only
  --help              Show this help

Validates qa-ai-output/release-gate.yaml shape and decision rules.
`);
}

export async function validateReleaseGateFile(cwd, filePath, options = {}) {
  const gatePath = resolveRepoPath(cwd, filePath, { label: 'release gate' });
  if (!(await pathExists(gatePath))) {
    if (options.allowMissing) {
      return { ok: true, skipped: true, path: filePath };
    }
    return { ok: false, errors: [`Release gate not found at ${filePath}.`] };
  }

  let data;
  try {
    data = parseSimpleYaml(await readText(gatePath), filePath);
  } catch (error) {
    return { ok: false, errors: [`${filePath} is not valid YAML: ${error.message}`] };
  }

  const result = validateReleaseGateData(data, {
    source: filePath,
    allowPending: Boolean(options.allowPending)
  });
  const errors = [...result.errors];

  for (const relPath of result.evidence || []) {
    if (!relPath || relPath.includes('..')) {
      errors.push(`${filePath}: invalid evidence_paths entry "${relPath}".`);
      continue;
    }
    if (!(await pathExists(resolveRepoPath(cwd, relPath, { label: 'evidence path' })))) {
      errors.push(`${filePath}: evidence_paths entry not found: ${relPath}`);
    }
  }

  for (const relPath of result.evidenceExecution || []) {
    if (!relPath || relPath.includes('..')) {
      errors.push(`${filePath}: invalid evidence.execution entry "${relPath}".`);
      continue;
    }
    if (!(await pathExists(resolveRepoPath(cwd, relPath, { label: 'evidence execution path' })))) {
      errors.push(`${filePath}: evidence.execution entry not found: ${relPath}`);
    }
  }

  for (const relPath of result.evidenceEvals || []) {
    if (!relPath || relPath.includes('..')) {
      errors.push(`${filePath}: invalid evidence.evals entry "${relPath}".`);
      continue;
    }
    if (!(await pathExists(resolveRepoPath(cwd, relPath, { label: 'evidence eval path' })))) {
      errors.push(`${filePath}: evidence.evals entry not found: ${relPath}`);
    }
  }

  const configInfo = await loadQaAiConfig(cwd);
  const track = getConfigValue(configInfo.data, 'project.qaTrack', 'standard');
  const resultsPaths = getConfigValue(configInfo.data, 'execution.resultsPaths', []);
  const evalResultsPaths = getConfigValue(configInfo.data, 'execution.evalResultsPaths', []);
  const aiTestingEnabled = Boolean(getConfigValue(configInfo.data, 'aiTesting.enabled', false));

  if (
    track === 'enterprise' &&
    result.decision === 'PASS' &&
    (resultsPaths.length > 0 || evalResultsPaths.length > 0 || aiTestingEnabled)
  ) {
    const evidenceRes = await validateExecutionEvidence(cwd, {
      allowMissing: Boolean(options.allowMissing)
    });
    if (!evidenceRes.ok) {
      errors.push(...evidenceRes.errors.map((e) => `${filePath}: execution evidence check failed: ${e}`));
    }
  }

  return {
    ok: errors.length === 0,
    skipped: false,
    path: filePath,
    decision: result.decision,
    errors
  };
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = Boolean(args.json);
  if (!jsonMode) logHeader('QA AI release gate validator');
  const configInfo = await loadQaAiConfig(cwd);
  const gatePath = args.path || getConfigValue(configInfo.data, 'release.gatePath', 'qa-ai-output/release-gate.yaml');

  const result = await validateReleaseGateFile(cwd, gatePath, {
    allowMissing: Boolean(args['allow-missing']),
    allowPending: Boolean(args['allow-pending'])
  });

  if (result.skipped) {
    if (jsonMode) console.log(JSON.stringify({ ok: true, skipped: true, errors: [] }));
    else console.log(`Release gate not found at ${gatePath}.`);
    return;
  }

  if (!result.ok) {
    if (jsonMode) {
      console.log(
        JSON.stringify({
          ok: false,
          errors: result.errors,
          findings: result.errors.map((message) => ({ severity: 'error', message }))
        })
      );
    } else {
      for (const error of result.errors) console.log(`[FAIL] ${error}`);
      console.log(`\nFAILED - ${result.errors.length} release gate validation error(s).`);
    }
    process.exit(1);
  }

  if (jsonMode) console.log(JSON.stringify({ ok: true, decision: result.decision, errors: [] }));
  else console.log(`[PASS] ${gatePath} decision=${result.decision}`);
}

if (import.meta.url === `file:///${toPosixPath(process.argv[1])}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
