#!/usr/bin/env node
import path from 'node:path';
import { stepLabel, VALIDATE_SUITES } from './lib/validate-suite-commands.mjs';
import { isMain, repoRoot, runNodeScript, runNpmScript } from './lib/ci-helpers.mjs';

const suiteName = (process.argv[2] || 'full').trim();

function runStep(step) {
  if (step.type === 'npm') {
    return runNpmScript(step.script, step.args || []);
  }
  return runNodeScript(path.join(repoRoot, step.file), step.args || []);
}

function main() {
  const steps = VALIDATE_SUITES[suiteName];
  if (!steps) {
    console.error(`Unknown validate suite "${suiteName}". Use core, e2e or full.`);
    process.exit(1);
  }

  for (const step of steps) {
    const result = runStep(step);
    if (result.status !== 0) {
      console.error(`\nValidate suite "${suiteName}" failed at: ${stepLabel(step)}`);
      process.exit(result.status || 1);
    }
  }

  console.log(`Validate suite "${suiteName}" passed (${steps.length} steps).`);
}

if (isMain(import.meta.url)) {
  main();
}
