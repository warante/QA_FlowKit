#!/usr/bin/env node
import fs from 'node:fs/promises';
import { featureCoverageRecord, normalizeCoverageMode, validateCoverage } from './lib/test-coverage.mjs';
import {
  mergeCoverageResults,
  resolveNonFunctionalCoveragePolicy,
  validateSourceNfrCoverage
} from './lib/nfr-coverage.mjs';
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
  console.log(`Usage: node .qa-ai/scripts/validate-test-coverage.mjs [options]

Options:
  --path <dir>          Override the configured feature root
  --proposal-path <file> Override the per-RF proposal path
  --mode <off|advisory|strict> Override testDesign.coverage.mode
  --rf <RF-ID>          Validate only one RF
  --allow-empty         Return success when no feature files exist
  --allow-missing       Return success when the proposal is missing
  --json                Print machine-readable JSON only
  --help                Show this help
`);
}

function coveragePolicy(config) {
  return {
    requirePositive: Boolean(getConfigValue(config, 'testDesign.coverage.requirePositive', true)),
    requireNegative: Boolean(getConfigValue(config, 'testDesign.coverage.requireNegative', true)),
    requireAlternative: Boolean(getConfigValue(config, 'testDesign.coverage.requireAlternative', true)),
    requireBoundaryWhenApplicable: Boolean(
      getConfigValue(config, 'testDesign.coverage.requireBoundaryWhenApplicable', true)
    ),
    requireAccessibilityWhenApplicable: Boolean(
      getConfigValue(config, 'testDesign.coverage.requireAccessibilityWhenApplicable', false)
    ),
    requirePerformanceWhenApplicable: Boolean(
      getConfigValue(config, 'testDesign.coverage.requirePerformanceWhenApplicable', false)
    ),
    requireSecurityReview: Boolean(getConfigValue(config, 'testDesign.coverage.requireSecurityReview', false)),
    requireTechniqueTraceability: Boolean(
      getConfigValue(config, 'testDesign.coverage.requireTechniqueTraceability', false)
    )
  };
}

export async function validateTestCoverage(cwd, options = {}) {
  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};
  const mode = normalizeCoverageMode(options.mode || getConfigValue(config, 'testDesign.coverage.mode', 'off'));
  const featureRoot = options.path || getConfigValue(config, 'gherkin.featurePath', 'features');
  const proposalPath =
    options.proposalPath || getConfigValue(config, 'testDesign.proposalPath', 'qa-ai-output/test-design-proposal.md');
  const featureRootPath = resolveRepoPath(cwd, featureRoot, { label: 'feature root' });
  const files = await listFilesRecursive(featureRootPath, (filePath) => filePath.endsWith('.feature'));
  const requestedRf = String(options.rf || '')
    .trim()
    .toUpperCase();
  const features = [];
  for (const file of files) {
    const record = featureCoverageRecord(file, await fs.readFile(file, 'utf8'));
    if (!requestedRf || record.rf === requestedRf) features.push(record);
  }

  const proposalAbsolute = resolveRepoPath(cwd, proposalPath, { label: 'test design proposal' });
  const normalizedPath = options.normalizedPath || 'qa-ai-output/normalized-requirements.md';
  const normalizedAbsolute = resolveRepoPath(cwd, normalizedPath, { label: 'normalized requirements' });
  let proposalContent = '';
  let normalizedContent = '';
  if (await pathExists(proposalAbsolute)) {
    proposalContent = await readText(proposalAbsolute);
  } else if (!options.allowMissing && mode !== 'off') {
    const severity = mode === 'strict' ? 'error' : 'warning';
    const finding = {
      severity,
      rf: '',
      rule: 'proposal-missing',
      message: `Test design proposal not found: ${proposalPath}`
    };
    return {
      ok: severity !== 'error',
      mode,
      skipped: false,
      featureRoot,
      proposalPath,
      findings: [finding],
      errors: severity === 'error' ? [finding] : [],
      warnings: severity === 'warning' ? [finding] : []
    };
  }

  if (await pathExists(normalizedAbsolute)) {
    normalizedContent = await readText(normalizedAbsolute);
  }

  const preventive = validateCoverage({
    features,
    proposalContent,
    policy: coveragePolicy(config),
    mode
  });
  const nfrPolicy = resolveNonFunctionalCoveragePolicy(config);
  const sourceNfr = validateSourceNfrCoverage({
    normalizedContent,
    proposalContent,
    features,
    mode: nfrPolicy.mode,
    policy: nfrPolicy
  });
  const merged = mergeCoverageResults(preventive, sourceNfr);
  const featureGateOk = features.length > 0 || Boolean(options.allowEmpty) || mode === 'off';

  return {
    ...merged,
    ok: merged.ok && featureGateOk,
    skipped: mode === 'off' && nfrPolicy.mode === 'off',
    featureRoot,
    proposalPath,
    normalizedPath,
    message: features.length === 0 ? `No .feature files found under ${featureRoot}.` : undefined,
    features: features.map((feature) => ({
      ...feature,
      file: relativeTo(cwd, feature.file)
    }))
  };
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const result = await validateTestCoverage(cwd, {
    path: args.path,
    proposalPath: args['proposal-path'],
    mode: args.mode,
    rf: args.rf,
    allowEmpty: Boolean(args['allow-empty']),
    allowMissing: Boolean(args['allow-missing'])
  });

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    logHeader('QA AI test coverage validator');
    if (result.skipped) {
      console.log(`SKIP - coverage mode is ${result.mode}.`);
    }
    if (result.message) console.log(result.message);
    for (const finding of result.findings || []) {
      console.log(`[${finding.severity.toUpperCase()}] ${finding.rf ? `${finding.rf}: ` : ''}${finding.message}`);
    }
    if (result.ok) {
      console.log(
        `\nVALID - coverage policy completed with ${(result.warnings || []).length} warning(s) in ${result.mode} mode.`
      );
    } else {
      console.log(`\nFAILED - ${(result.errors || []).length} coverage error(s).`);
    }
  }

  if (!result.ok) process.exit(1);
}

main().catch((error) => {
  if (args.json) {
    console.log(JSON.stringify({ ok: false, error: error.message }, null, 2));
  } else {
    console.error(error);
  }
  process.exit(1);
});
