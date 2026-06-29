#!/usr/bin/env node
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { VALIDATE_CORE_STEPS, VALIDATE_E2E_STEPS } from './lib/validate-suite-commands.mjs';
import { repoRoot, runNodeScript } from './lib/ci-helpers.mjs';

const runner = path.join(repoRoot, '.github/scripts/run-validate-suite.mjs');

function runSuite(name) {
  const startedAt = performance.now();
  const result = runNodeScript(runner, [name]);
  const durationMs = Math.round(performance.now() - startedAt);
  return { name, durationMs, ok: result.status === 0, status: result.status ?? 1 };
}

function formatDuration(ms) {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function main() {
  const results = [runSuite('core'), runSuite('e2e')];
  const failed = results.filter((result) => !result.ok);
  const core = results.find((result) => result.name === 'core');
  const e2e = results.find((result) => result.name === 'e2e');
  const fullEstimateMs = (core?.durationMs || 0) + (e2e?.durationMs || 0);

  console.log('\nValidate suite benchmark');
  console.log('========================');
  for (const result of results) {
    console.log(
      `- ${result.name}: ${formatDuration(result.durationMs)} (${result.name === 'core' ? VALIDATE_CORE_STEPS.length : VALIDATE_E2E_STEPS.length} steps, status=${result.status})`
    );
  }
  console.log(`- full (core + e2e estimate): ${formatDuration(fullEstimateMs)}`);
  console.log(
    `- CI validate-starter savings vs legacy full x4: ~${formatDuration((e2e?.durationMs || 0) * 4)} avoided E2E re-runs per PR`
  );

  if (failed.length > 0) {
    process.exit(failed[0].status || 1);
  }
}

main();
