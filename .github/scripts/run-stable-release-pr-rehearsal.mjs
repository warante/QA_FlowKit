#!/usr/bin/env node
/**
 * TASK-084 rehearsal: validate Release PR review assets and publish workflow readiness.
 */
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { STABLE_TARGET_VERSION, expectedReleasePrTitle } from './lib/stable-release-pr.mjs';
import { resolveNpmDistTag } from './lib/npm-dist-tag.mjs';
import { verifyStableReleasePr } from './verify-stable-release-pr.mjs';

export async function runStableReleasePrRehearsal() {
  const pr = await verifyStableReleasePr();
  assert.equal(pr.ok, true, pr.errors.join('\n'));
  assert.equal(resolveNpmDistTag(STABLE_TARGET_VERSION), 'latest');
  assert.equal(expectedReleasePrTitle(), 'chore: release 1.0.0');
  return { ok: true, status: pr.status, targetVersion: STABLE_TARGET_VERSION };
}

async function main() {
  const result = await runStableReleasePrRehearsal();
  console.log(`Stable release PR rehearsal passed (status=${result.status}, target=${result.targetVersion}).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
