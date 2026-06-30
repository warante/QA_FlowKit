#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { validateMaestroFlowContent } from './lib/maestro-validate.mjs';
import { maestroFlowsPath, usesMaestro } from './lib/mobile-automation.mjs';
import {
  listFilesRecursive,
  loadQaAiConfig,
  logHeader,
  parseArgs,
  pathExists,
  relativeTo,
  resolveRepoPath
} from './lib/utils.mjs';
import { exitSingleFileFailure, resolveSingleCollectionFile } from './lib/collection-validator.mjs';
import { emitJson, finishValidatorRun, isJsonMode, isValidatorMain } from './lib/validator-cli.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);
const jsonMode = isJsonMode(args);

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-maestro-flows.mjs [options]

Options:
  --path <dir>     Override automation.mobile.flowsPath
  --file <path>    Validate a single Maestro flow file
  --allow-empty    Return success when no Maestro YAML flows exist
  --json           Print machine-readable JSON only
  --help           Show this help

Validates Maestro flow front matter, sequence commands and repository-local runFlow references.
`);
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  if (!jsonMode) logHeader('QA AI Maestro flow validator');
  const configInfo = await loadQaAiConfig(cwd);
  if (!usesMaestro(configInfo.data)) {
    if (jsonMode) emitJson(true);
    else console.log('Maestro is not configured (automation.mobile.framework is not maestro). Skipping.');
    return;
  }

  const flowsRoot = args.path || maestroFlowsPath(configInfo.data);
  const flowsRootPath = resolveRepoPath(cwd, flowsRoot, { label: 'Maestro flows root' });
  if (!(await pathExists(flowsRootPath))) {
    if (args['allow-empty']) {
      if (jsonMode) emitJson(true);
      else console.log(`Maestro flows root not found at ${flowsRoot}.`);
      return;
    }
    if (jsonMode) emitJson(false, [`Maestro flows root not found at ${flowsRoot}.`]);
    else console.log(`Maestro flows root not found at ${flowsRoot}.`);
    process.exit(1);
  }

  let files;
  if (args.file) {
    const single = await resolveSingleCollectionFile({
      cwd,
      fileArg: args.file,
      isUnderRoot: (resolved) => resolved.startsWith(flowsRootPath),
      notUnderRootError: `file "${args.file}" is not under Maestro flows root "${flowsRoot}".`,
      fileLabel: 'single Maestro flow file'
    });
    if (!single.ok) exitSingleFileFailure(single, jsonMode);
    files = [single.file];
  } else {
    files = await listFilesRecursive(flowsRootPath, (filePath) => /\.ya?ml$/i.test(filePath));
  }
  if (files.length === 0) {
    if (args['allow-empty']) {
      if (jsonMode) emitJson(true);
      else console.log(`No Maestro YAML flows found under ${flowsRoot}.`);
      return;
    }
    if (jsonMode) emitJson(false, [`No Maestro YAML flows found under ${flowsRoot}.`]);
    else console.log(`No Maestro YAML flows found under ${flowsRoot}.`);
    process.exit(1);
  }

  const errors = [];
  const warnings = [];
  for (const file of files) {
    const relativePath = relativeTo(cwd, file);
    const content = await fs.readFile(file, 'utf8');
    const result = validateMaestroFlowContent(content, relativePath);
    for (const warning of result.warnings) {
      warnings.push(`${relativePath}: ${warning}`);
      if (!jsonMode) console.log(`[WARN] ${relativePath}: ${warning}`);
    }
    for (const error of result.errors) errors.push(`${relativePath}: ${error}`);

    for (const referencedFlow of result.referencedFlows) {
      const target = resolveRepoPath(path.dirname(file), referencedFlow, { label: 'Maestro runFlow target' });
      if (!(await pathExists(target))) {
        errors.push(`${relativePath}: runFlow target does not exist: ${referencedFlow}`);
      }
    }
    if (result.ok && !jsonMode) console.log(`[PASS] ${relativePath}`);
  }

  if (errors.length > 0 && !jsonMode) {
    for (const error of errors) console.log(`[FAIL] ${error}`);
  }

  finishValidatorRun({
    ok: errors.length === 0,
    errors,
    warnings,
    jsonMode,
    successMessage: '\nVALID - all Maestro flows passed.',
    failureMessage: `\nFAILED - ${errors.length} Maestro validation issue(s).`
  });
}

if (isValidatorMain(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
