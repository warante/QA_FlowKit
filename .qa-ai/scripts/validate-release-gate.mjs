#!/usr/bin/env node
import path from 'node:path';
import { validateReleaseGateData } from './lib/release-gate.mjs';
import {
  getConfigValue,
  loadQaAiConfig,
  logHeader,
  parseArgs,
  parseSimpleYaml,
  pathExists,
  readText,
  resolveRepoPath
} from './lib/utils.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-release-gate.mjs [options]

Options:
  --path <file>       Override release gate file path
  --allow-missing     Return success when the gate file is missing
  --allow-pending     Allow decision: PENDING (draft gates only)
  --help              Show this help

Validates qa-ai-output/release-gate.yaml shape and decision rules.
`);
}

export async function validateReleaseGateFile(cwd, filePath, options = {}) {
  const gatePath = resolveRepoPath(cwd, filePath, { label: 'release gate' });
  if (!await pathExists(gatePath)) {
    if (options.allowMissing) {
      return { ok: true, skipped: true, path: filePath };
    }
    return { ok: false, errors: [`Release gate not found at ${filePath}.`] };
  }

  let data;
  try {
    data = parseSimpleYaml(await readText(gatePath));
  } catch (error) {
    return { ok: false, errors: [`${filePath} is not valid YAML: ${error.message}`] };
  }

  const result = validateReleaseGateData(data, { source: filePath });
  const errors = [...result.errors];

  if (result.decision === 'PENDING' && !options.allowPending) {
    errors.push(`${filePath}: decision is PENDING; pass --allow-pending for draft gates.`);
  }

  for (const relPath of result.evidence) {
    if (!relPath || relPath.includes('..')) {
      errors.push(`${filePath}: invalid evidence_paths entry "${relPath}".`);
      continue;
    }
    if (!await pathExists(resolveRepoPath(cwd, relPath, { label: 'evidence path' }))) {
      errors.push(`${filePath}: evidence_paths entry not found: ${relPath}`);
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

  logHeader('QA AI release gate validator');
  const configInfo = await loadQaAiConfig(cwd);
  const gatePath = args.path
    || getConfigValue(configInfo.data, 'release.gatePath', 'qa-ai-output/release-gate.yaml');

  const result = await validateReleaseGateFile(cwd, gatePath, {
    allowMissing: Boolean(args['allow-missing']),
    allowPending: Boolean(args['allow-pending'])
  });

  if (result.skipped) {
    console.log(`Release gate not found at ${gatePath}.`);
    return;
  }

  if (!result.ok) {
    for (const error of result.errors) console.log(`[FAIL] ${error}`);
    console.log(`\nFAILED - ${result.errors.length} release gate validation error(s).`);
    process.exit(1);
  }

  console.log(`[PASS] ${gatePath} decision=${result.decision}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
