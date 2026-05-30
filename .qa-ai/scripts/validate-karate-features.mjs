#!/usr/bin/env node
import fs from 'node:fs/promises';
import { isKarateUiFeaturePath, karateFeatureRoots, usesKarate } from './lib/automation-framework.mjs';
import { karateDuplicateIdErrors, validateKarateFeatureContent } from './lib/karate-validate.mjs';
import { listFilesRecursive, loadQaAiConfig, logHeader, parseArgs, relativeTo, resolveRepoPath } from './lib/utils.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-karate-features.mjs [options]

Validates executable Karate .feature files under automation.api/ui specsPath when Karate is configured.
QA design features under gherkin.featurePath use validate-features.mjs instead.

Options:
  --path <dir>     Validate a single root (must be under configured Karate paths)
  --allow-empty    Success when no Karate .feature files exist
  --strict-rf      Require @rf: tags
  --no-duplicates  Skip cross-file @id duplicate check
  --help           Show this help
`);
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  logHeader('QA AI Karate feature validator');
  const configInfo = await loadQaAiConfig(cwd);
  if (!usesKarate(configInfo.data)) {
    console.log(
      'Karate is not configured (automation.api.framework or automation.ui.framework is not karate). Skipping.'
    );
    return;
  }

  const roots = args.path ? [args.path] : karateFeatureRoots(configInfo.data);
  if (roots.length === 0) {
    console.log('No Karate feature roots configured.');
    if (!args['allow-empty']) {
      console.log('\nFAILED - configure automation.api.specsPath or automation.ui.specsPath for Karate.');
      process.exit(1);
    }
    return;
  }

  const files = [];
  for (const root of roots) {
    const rootPath = resolveRepoPath(cwd, root, { label: 'Karate feature root' });
    const listed = await listFilesRecursive(rootPath, (filePath) => filePath.endsWith('.feature'));
    files.push(...listed);
  }

  if (files.length === 0) {
    console.log(`No .feature files found under: ${roots.join(', ')}`);
    if (!args['allow-empty']) {
      console.log('\nFAILED - no Karate feature files found. Pass --allow-empty when expected.');
      process.exit(1);
    }
    return;
  }

  const strictRf = Boolean(args['strict-rf']);
  let totalErrors = 0;
  const results = [];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const isUiPath = isKarateUiFeaturePath(file, configInfo.data);
    const result = validateKarateFeatureContent(content, file, {
      strictRf,
      isUiPath
    });
    results.push(result);

    const rel = relativeTo(cwd, file);
    if (result.errors.length === 0) {
      console.log(`[PASS] ${rel}`);
      for (const warning of result.warnings) console.log(`  [WARN] ${warning}`);
    } else {
      totalErrors += result.errors.length;
      console.log(`[FAIL] ${rel}`);
      for (const error of result.errors) console.log(`  - ${error}`);
      for (const warning of result.warnings) console.log(`  [WARN] ${warning}`);
    }
  }

  if (!args['no-duplicates']) {
    const duplicateErrors = karateDuplicateIdErrors(results);
    if (duplicateErrors.length > 0) {
      totalErrors += duplicateErrors.length;
      console.log('\nDuplicate identifiers:');
      for (const error of duplicateErrors) console.log(`  - ${error}`);
    }
  }

  if (totalErrors > 0) {
    console.log(`\nFAILED - ${totalErrors} Karate validation issue(s).`);
    process.exit(1);
  }
  console.log('\nVALID - all Karate feature files passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
