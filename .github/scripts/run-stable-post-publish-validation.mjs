#!/usr/bin/env node
/**
 * TASK-085: validate a published (or locally simulated) stable package from npm @latest.
 *
 * Usage:
 *   node .github/scripts/run-stable-post-publish-validation.mjs --version 1.0.0
 *   node .github/scripts/run-stable-post-publish-validation.mjs --local-simulation
 */
import { isMain } from './lib/ci-helpers.mjs';
import { runPostPublishValidation } from './lib/post-publish-validation.mjs';

export async function runStablePostPublishValidation(options = {}) {
  return runPostPublishValidation('stable', options);
}

async function main() {
  const result = await runStablePostPublishValidation();
  const mode = result.localSimulation ? 'local simulation' : 'registry';
  console.log(`Stable post-publish validation passed (${mode}, ${result.source}).`);
}

if (isMain(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
