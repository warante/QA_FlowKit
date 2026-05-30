#!/usr/bin/env node
import fs from 'node:fs/promises';
import { validateFeatureFilePlacement } from './lib/feature-layout.mjs';
import { duplicateIdErrors, normalizeLanguage, validateFeatureContent } from './lib/gherkin-validate.mjs';
import {
  getConfigValue,
  listFilesRecursive,
  loadQaAiConfig,
  logHeader,
  parseArgs,
  relativeTo,
  resolveRepoPath
} from './lib/utils.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-features.mjs [options]

Options:
  --path <dir>   Override the configured feature root
  --gherkin-language <en|es> Override the configured Gherkin language
  --allow-empty  Return success when no .feature files exist
  --no-duplicates Skip cross-file duplicate ID validation
  --strict-tags  Require recommended @rf: and @id: tags
  --strict-layout  Treat folder placement warnings as errors
  --help         Show this help

Validates QA design .feature files under gherkin.featurePath only.
For executable Karate features, use validate-karate-features.mjs.
`);
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  logHeader('QA AI feature validator');
  const configInfo = await loadQaAiConfig(cwd);
  const featureRoot = args.path || getConfigValue(configInfo.data, 'gherkin.featurePath', 'features');
  const language = normalizeLanguage(
    args['gherkin-language'] ||
      args.gherkinLanguage ||
      args.gherkin ||
      getConfigValue(configInfo.data, 'gherkin.language', 'en')
  );
  const requiredTags = getConfigValue(configInfo.data, 'gherkin.tags.required', ['priority', 'type', 'manual']);
  const tagNames =
    Array.isArray(requiredTags) && requiredTags.length > 0 ? requiredTags : ['priority', 'type', 'manual'];
  const featureRootPath = resolveRepoPath(cwd, featureRoot, { label: 'feature root' });
  const files = await listFilesRecursive(featureRootPath, (filePath) => filePath.endsWith('.feature'));
  const strictTags = Boolean(args['strict-tags']);
  const strictLayout = Boolean(args['strict-layout']);

  if (files.length === 0) {
    console.log(`No .feature files found under ${featureRoot}.`);
    if (!args['allow-empty']) {
      console.log('\nFAILED - no feature files found. Pass --allow-empty when this is expected.');
      process.exit(1);
    }
    return;
  }

  let totalErrors = 0;
  const results = [];
  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const result = {
      file,
      ...validateFeatureContent(content, file, tagNames, language, { strictTags })
    };
    results.push(result);
    const placement = validateFeatureFilePlacement(file, featureRootPath, content);
    result.placementWarnings = placement.warnings;

    if (result.errors.length === 0 && placement.warnings.length === 0) {
      console.log(`[PASS] ${relativeTo(cwd, file)}`);
    } else if (result.errors.length === 0 && placement.warnings.length > 0) {
      if (strictLayout) {
        totalErrors += placement.warnings.length;
        console.log(`[FAIL] ${relativeTo(cwd, file)}`);
        for (const warning of placement.warnings) console.log(`  - ${warning}`);
      } else {
        console.log(`[PASS] ${relativeTo(cwd, file)}`);
        for (const warning of placement.warnings) console.log(`  [WARN] ${warning}`);
      }
    } else {
      totalErrors += result.errors.length;
      if (strictLayout) totalErrors += placement.warnings.length;
      console.log(`[FAIL] ${relativeTo(cwd, file)}`);
      for (const error of result.errors) console.log(`  - ${error}`);
      for (const warning of placement.warnings) console.log(`  - ${warning}`);
    }
  }

  if (!args['no-duplicates']) {
    const duplicateErrors = duplicateIdErrors(results);
    if (duplicateErrors.length > 0) {
      totalErrors += duplicateErrors.length;
      console.log('[FAIL] Duplicate identifier validation');
      for (const error of duplicateErrors) console.log(`  - ${error}`);
    }
  }

  if (totalErrors > 0) {
    console.log(`\nFAILED - ${totalErrors} validation errors.`);
    process.exit(1);
  }
  console.log('\nVALID - all feature files passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
