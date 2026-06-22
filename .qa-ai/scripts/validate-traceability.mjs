#!/usr/bin/env node
import fs from 'node:fs/promises';
import { featureTraceabilityIds, validateTraceabilityArtifacts } from './lib/traceability-validate.mjs';
import {
  getConfigValue,
  listFilesRecursive,
  loadQaAiConfig,
  logHeader,
  parseArgs,
  pathExists,
  readText,
  relativeTo,
  resolveRepoPath
} from './lib/utils.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-traceability.mjs [options]

Options:
  --path <file>           Override configured traceability matrix path
  --normalized-path <file> Override normalized requirements path
  --features <dir>        Override configured feature root
  --allow-empty           Return success when no .feature files exist
  --allow-missing         Return success when the traceability matrix is missing
  --json                  Print machine-readable JSON only
  --help                  Show this help

Validates functional feature coverage, traceability matrix table shape, duplicate rows and source NFR traceability.
`);
}

export async function validateTraceability(cwd, options = {}) {
  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};
  const featureRoot = options.features || getConfigValue(config, 'gherkin.featurePath', 'features');
  const matrixPath =
    options.path || getConfigValue(config, 'traceability.matrixPath', 'qa-ai-output/traceability-matrix.md');
  const normalizedPath = options.normalizedPath || 'qa-ai-output/normalized-requirements.md';
  const featureRootPath = resolveRepoPath(cwd, featureRoot, { label: 'feature root' });
  const matrixFilePath = resolveRepoPath(cwd, matrixPath, { label: 'traceability matrix' });
  const normalizedFilePath = resolveRepoPath(cwd, normalizedPath, { label: 'normalized requirements' });
  const files = await listFilesRecursive(featureRootPath, (filePath) => filePath.endsWith('.feature'));
  const features = [];
  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    features.push({
      ...featureTraceabilityIds(file, content),
      file: relativeTo(cwd, file)
    });
  }

  if (features.length === 0 && !options.allowEmpty) {
    return {
      ok: false,
      skipped: false,
      featureRoot,
      matrixPath,
      normalizedPath,
      errors: [`No .feature files found under ${featureRoot}.`],
      warnings: [],
      message: `No .feature files found under ${featureRoot}.`
    };
  }

  if (!(await pathExists(matrixFilePath))) {
    if (options.allowMissing) {
      return {
        ok: true,
        skipped: true,
        featureRoot,
        matrixPath,
        normalizedPath,
        errors: [],
        warnings: [],
        message: `Traceability matrix not found at ${matrixPath}.`
      };
    }
    return {
      ok: false,
      skipped: false,
      featureRoot,
      matrixPath,
      normalizedPath,
      errors: [`Traceability matrix not found at ${matrixPath}.`],
      warnings: [],
      message: `Traceability matrix not found at ${matrixPath}.`
    };
  }

  const matrixContent = await readText(matrixFilePath);
  const normalizedContent = (await pathExists(normalizedFilePath)) ? await readText(normalizedFilePath) : '';
  const result = validateTraceabilityArtifacts({
    matrixContent,
    normalizedContent,
    features
  });

  return {
    ...result,
    skipped: false,
    featureRoot,
    matrixPath,
    normalizedPath,
    features
  };
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const result = await validateTraceability(cwd, {
    path: args.path,
    normalizedPath: args['normalized-path'],
    features: args.features,
    allowEmpty: Boolean(args['allow-empty']),
    allowMissing: Boolean(args['allow-missing'])
  });

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exit(1);
    return;
  }

  logHeader('QA AI traceability validator');
  for (const warning of result.warnings || []) console.log(`[WARN] ${warning}`);
  for (const error of result.errors || []) console.log(`[FAIL] ${error}`);

  if (result.nfrMetrics && result.nfrMetrics.total > 0) {
    const metrics = result.nfrMetrics;
    console.log(
      `\nNFR metrics: total=${metrics.total} covered=${metrics.covered} planned=${metrics.planned} ` +
        `blocked=${metrics.blocked} residual-risk=${metrics.residualRisk} not-applicable=${metrics.notApplicable}`
    );
  }

  if (!result.ok) {
    console.log(`\nFAILED - ${(result.errors || []).length} traceability validation error(s).`);
    process.exit(1);
  }

  console.log(`\n[PASS] ${result.matrixPath} traceability validation completed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
