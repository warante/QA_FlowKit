#!/usr/bin/env node
import fs from 'node:fs/promises';
import { isKarateUiFeaturePath, karateFeatureRoots, usesKarate } from './lib/automation-framework.mjs';
import { karateDuplicateIdErrors, validateKarateFeatureContent } from './lib/karate-validate.mjs';
import { listFilesRecursive, loadQaAiConfig, logHeader, parseArgs, relativeTo, resolveRepoPath } from './lib/utils.mjs';
import {
  exitSingleFileFailure,
  handleEmptyCollection,
  resolveSingleCollectionFile
} from './lib/collection-validator.mjs';
import { emitJson, finishValidatorRun, isJsonMode, isValidatorMain } from './lib/validator-cli.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);
const jsonMode = isJsonMode(args);

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-karate-features.mjs [options]

Validates executable Karate .feature files under automation.api/ui specsPath when Karate is configured.
QA design features under gherkin.featurePath use validate-features.mjs instead.

Options:
  --path <dir>     Validate a single root (must be under configured Karate paths)
  --file <path>    Validate a single Karate feature file
  --allow-empty    Success when no Karate .feature files exist
  --strict-rf      Require @rf: tags
  --no-duplicates  Skip cross-file @id duplicate check
  --json           Print machine-readable JSON only
  --help           Show this help
`);
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  if (!jsonMode) logHeader('QA AI Karate feature validator');
  const configInfo = await loadQaAiConfig(cwd);
  if (!usesKarate(configInfo.data)) {
    if (jsonMode) emitJson(true);
    else
      console.log(
        'Karate is not configured (automation.api.framework or automation.ui.framework is not karate). Skipping.'
      );
    return;
  }

  const roots = args.path ? [args.path] : karateFeatureRoots(configInfo.data);
  if (roots.length === 0) {
    if (!args['allow-empty']) {
      if (jsonMode) emitJson(false, ['configure automation.api.specsPath or automation.ui.specsPath for Karate.']);
      else {
        console.log('No Karate feature roots configured.');
        console.log('\nFAILED - configure automation.api.specsPath or automation.ui.specsPath for Karate.');
      }
      process.exit(1);
    }
    if (jsonMode) emitJson(true);
    else console.log('No Karate feature roots configured.');
    return;
  }

  const files = [];
  if (args.file) {
    const absoluteRoots = roots.map((root) => resolveRepoPath(cwd, root, { label: 'Karate root' }));
    const single = await resolveSingleCollectionFile({
      cwd,
      fileArg: args.file,
      isUnderRoot: (resolved) => absoluteRoots.some((root) => resolved.startsWith(root)),
      notUnderRootError: `file "${args.file}" is not under any configured Karate roots.`,
      fileLabel: 'single Karate feature file'
    });
    if (!single.ok) exitSingleFileFailure(single, jsonMode);
    files.push(single.file);
    args['no-duplicates'] = true;
  } else {
    for (const root of roots) {
      const rootPath = resolveRepoPath(cwd, root, { label: 'Karate feature root' });
      const listed = await listFilesRecursive(rootPath, (filePath) => filePath.endsWith('.feature'));
      files.push(...listed);
    }
  }

  if (
    handleEmptyCollection({
      fileCount: files.length,
      allowEmpty: Boolean(args['allow-empty']),
      jsonMode,
      failureErrors: [`No .feature files found under: ${roots.join(', ')}`],
      failureTextLines: [
        `No .feature files found under: ${roots.join(', ')}`,
        '\nFAILED - no Karate feature files found. Pass --allow-empty when expected.'
      ],
      successText: `No .feature files found under: ${roots.join(', ')}`
    })
  ) {
    return;
  }

  const strictRf = Boolean(args['strict-rf']);
  let totalErrors = 0;
  const aggErrors = [];
  const aggWarnings = [];
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
      for (const warning of result.warnings) aggWarnings.push(`${rel}: ${warning}`);
      if (!jsonMode) {
        console.log(`[PASS] ${rel}`);
        for (const warning of result.warnings) console.log(`  [WARN] ${warning}`);
      }
    } else {
      totalErrors += result.errors.length;
      for (const error of result.errors) aggErrors.push(`${rel}: ${error}`);
      for (const warning of result.warnings) aggWarnings.push(`${rel}: ${warning}`);
      if (!jsonMode) {
        console.log(`[FAIL] ${rel}`);
        for (const error of result.errors) console.log(`  - ${error}`);
        for (const warning of result.warnings) console.log(`  [WARN] ${warning}`);
      }
    }
  }

  if (!args['no-duplicates']) {
    const duplicateErrors = karateDuplicateIdErrors(results);
    if (duplicateErrors.length > 0) {
      totalErrors += duplicateErrors.length;
      for (const error of duplicateErrors) aggErrors.push(`Duplicate identifier: ${error}`);
      if (!jsonMode) {
        console.log('\nDuplicate identifiers:');
        for (const error of duplicateErrors) console.log(`  - ${error}`);
      }
    }
  }

  finishValidatorRun({
    ok: totalErrors === 0,
    errors: aggErrors,
    warnings: aggWarnings,
    jsonMode,
    successMessage: '\nVALID - all Karate feature files passed.',
    failureMessage: `\nFAILED - ${totalErrors} Karate validation issue(s).`
  });
}

if (isValidatorMain(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
