#!/usr/bin/env node
/**
 * TASK-080: validate a published (or locally simulated) 1.0.0-rc package from npm.
 *
 * Usage:
 *   node .github/scripts/run-rc-post-publish-validation.mjs --version 1.0.0-rc.1
 *   node .github/scripts/run-rc-post-publish-validation.mjs --local-simulation
 */
import { isMain } from './lib/ci-helpers.mjs';
import { runPostPublishValidation } from './lib/post-publish-validation.mjs';

export async function runRcPostPublishValidation(options = {}) {
  return runPostPublishValidation('rc', options);
}

async function main() {
  const result = await runRcPostPublishValidation();
  const mode = result.localSimulation ? 'local simulation' : 'registry';
  console.log(`RC post-publish validation passed (${mode}, ${result.source}).`);
}

if (isMain(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
