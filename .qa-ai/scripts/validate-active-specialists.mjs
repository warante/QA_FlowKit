#!/usr/bin/env node
import { activeSpecialists, specialistCatalog } from './lib/project-config.mjs';
import {
  loadQaAiConfig,
  logHeader,
  parseArgs,
  pathExists,
  readText,
  relativeTo,
  resolveRepoPath
} from './lib/utils.mjs';
import { emitJson, isJsonMode, isValidatorMain } from './lib/validator-cli.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);
const jsonMode = isJsonMode(args);

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-active-specialists.mjs [options]

Options:
  --allow-missing  Return success when qa-ai.config.yaml or active.md is missing
  --json           Print machine-readable JSON only
  --help           Show this help
`);
}

function listedSpecialistIds(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*-\s+`([^`]+)`:/)?.[1])
    .filter(Boolean)
    .sort();
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  if (!jsonMode) logHeader('QA AI active specialists validator');
  const configInfo = await loadQaAiConfig(cwd);
  const activePath = resolveRepoPath(cwd, '.qa-ai/agents/specialists/active.md', {
    label: 'active specialists index'
  });

  if (!configInfo.exists) {
    if (args['allow-missing']) {
      if (jsonMode) emitJson(true);
      else console.log('No qa-ai.config.yaml found.');
      return;
    }
    if (jsonMode) emitJson(false, ['active specialist validation requires qa-ai.config.yaml.']);
    else {
      console.log('No qa-ai.config.yaml found.');
      console.log('\nFAILED - active specialist validation requires qa-ai.config.yaml.');
    }
    process.exit(1);
  }

  if (!(await pathExists(activePath))) {
    if (args['allow-missing']) {
      if (jsonMode) emitJson(true);
      else console.log('No active specialists index found at .qa-ai/agents/specialists/active.md.');
      return;
    }
    if (jsonMode) emitJson(false, ['run init or config import to generate active specialists.']);
    else {
      console.log('No active specialists index found at .qa-ai/agents/specialists/active.md.');
      console.log('\nFAILED - run init or config import to generate active specialists.');
    }
    process.exit(1);
  }

  const expected = activeSpecialists(configInfo.data)
    .map(([id]) => id)
    .sort();
  const actual = listedSpecialistIds(await readText(activePath));
  const errors = [];

  for (const id of expected.filter((id) => !actual.includes(id))) {
    errors.push(`Missing active specialist: ${id}`);
  }
  for (const id of actual.filter((id) => !expected.includes(id))) {
    errors.push(`Stale active specialist: ${id}`);
  }
  for (const id of actual) {
    if (!(id in specialistCatalog)) {
      errors.push(`Unknown active specialist: ${id}`);
      continue;
    }
    const sourcePath = resolveRepoPath(cwd, `.qa-ai/agents/specialists/available/${id}.md`, {
      label: `specialist source "${id}"`
    });
    if (!(await pathExists(sourcePath))) {
      errors.push(`Missing specialist source for ${id}: ${relativeTo(cwd, sourcePath)}`);
    }
  }

  if (uniqueSorted(actual).length !== actual.length) {
    errors.push('Duplicate specialist entries found in active.md.');
  }

  if (errors.length > 0) {
    if (jsonMode) {
      emitJson(false, errors);
    } else {
      for (const error of errors) console.log(`[FAIL] ${error}`);
      console.log(`\nFAILED - ${errors.length} active specialist validation error(s).`);
    }
    process.exit(1);
  }

  if (jsonMode) emitJson(true);
  else console.log(`[PASS] ${relativeTo(cwd, activePath)} matches qa-ai.config.yaml.`);
}

if (isValidatorMain(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
