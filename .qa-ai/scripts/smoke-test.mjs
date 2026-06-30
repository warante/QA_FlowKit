#!/usr/bin/env node
import { copyFramework, runInWorkspace } from './test/lib/integration-helpers.mjs';
import { runSmokeScenarios } from './test/smoke-scenarios.mjs';

async function main() {
  await runSmokeScenarios({ copyFramework, run: runInWorkspace });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
