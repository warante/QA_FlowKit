#!/usr/bin/env node
import fs from 'node:fs/promises';
import { isMain, repoRoot } from './lib/ci-helpers.mjs';
import path from 'node:path';
import {
  ACTIVE_CONFIG,
  STABLE_CONFIG,
  configsMatchForStableMerge,
  isActiveStablePolicy,
  isPreparedStablePolicy,
  packageKeys
} from './lib/stable-release-config.mjs';
import { resolveNpmDistTag } from './lib/npm-dist-tag.mjs';
import { verifyReleasePolicy } from './verify-release-policy.mjs';
import { verifyStableReleaseApproval } from './verify-stable-release-approval.mjs';

const ALLOWED_STATUS = new Set(['prepared', 'merged', 'verified']);

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

export async function verifyStableReleaseConfig({ root = repoRoot } = {}) {
  const errors = [];
  const recordPath = path.join(root, 'docs', 'qa-ai', 'stable-release-config.v1.json');
  const configDocPath = path.join(root, 'docs', 'qa-ai', 'stable-release-config.md');
  const releaseDocPath = path.join(root, 'docs', 'qa-ai', 'beta-to-rc-release.md');
  const packagePath = path.join(root, 'package.json');

  const record = await readJson(recordPath);
  const active = await readJson(path.join(root, ACTIVE_CONFIG));
  const prepared = await readJson(path.join(root, STABLE_CONFIG));
  const packageJson = await readJson(packagePath);
  const configDoc = await fs.readFile(configDocPath, 'utf8');
  const releaseDoc = await fs.readFile(releaseDocPath, 'utf8');

  assert(record.schemaVersion === 1, 'stable-release-config schemaVersion must be 1', errors);
  assert(record.task === 'TASK-083', 'stable-release-config task must be TASK-083', errors);
  assert(ALLOWED_STATUS.has(record.status), `invalid stable config status: ${record.status}`, errors);
  assert(
    record.qaFlowKitVersion === packageJson.version,
    'stable-release-config version must match package.json',
    errors
  );
  assert(record.activeConfig === ACTIVE_CONFIG, 'activeConfig path drift', errors);
  assert(record.preparedStableConfig === STABLE_CONFIG, 'preparedStableConfig path drift', errors);
  assert(record.expectedStableVersion === '1.0.0', 'expectedStableVersion must be 1.0.0', errors);
  assert(record.expectedDistTag === 'latest', 'expectedDistTag must be latest', errors);
  assert(record.approvalRecord === 'docs/qa-ai/stable-release-approval.v1.json', 'approvalRecord path drift', errors);

  assert(isPreparedStablePolicy(prepared), 'prepared stable config must disable prerelease', errors);
  assert(
    packageKeys(active).join('\0') === packageKeys(prepared).join('\0'),
    'stable config package map must match active config',
    errors
  );
  assert(
    resolveNpmDistTag(record.expectedStableVersion) === record.expectedDistTag,
    'dist-tag policy must map 1.0.0 to latest',
    errors
  );

  const policy = await verifyReleasePolicy({ root });
  assert(policy.ok, `release policy must pass: ${policy.errors.join('; ')}`, errors);

  const activeMatchesStable = configsMatchForStableMerge(active, prepared);

  if (record.status === 'prepared') {
    assert(active.prerelease === true, 'prepared status expects active prerelease policy until merge', errors);
    assert(active['prerelease-type'] === 'rc', 'prepared status expects active rc prerelease-type', errors);
    assert(!activeMatchesStable, 'prepared status expects active config to differ from merged stable policy', errors);
  }

  if (record.status === 'merged' || record.status === 'verified') {
    assert(record.mergedAt, 'merged/verified status requires mergedAt', errors);
    assert(record.mergePrUrl, 'merged/verified status requires mergePrUrl', errors);
    assert(activeMatchesStable, 'merged status requires active config to match prepared stable file', errors);
    assert(isActiveStablePolicy(active), 'merged status requires active stable release-please policy', errors);

    const approval = await verifyStableReleaseApproval({ root });
    assert(approval.ok, `stable approval must pass: ${approval.errors.join('; ')}`, errors);
    assert(approval.status === 'approved', 'merged stable config requires TASK-082 approval', errors);
    assert(approval.epic20Unblocked === true, 'merged stable config requires epic20Unblocked true', errors);
  }

  assert(configDoc.includes('stable-release-config.v1.json'), 'stable-release-config.md must link JSON record', errors);
  assert(
    releaseDoc.includes('stable-release-config.v1.json'),
    'beta-to-rc-release.md must reference stable config record',
    errors
  );
  assert(releaseDoc.includes('TASK-083'), 'beta-to-rc-release.md must include TASK-083 guidance', errors);

  const rehearsalScript = String(record.rehearsalCommand || '').replace('npm run ', '');
  assert(packageJson.scripts?.[rehearsalScript], `missing rehearsal npm script ${rehearsalScript}`, errors);

  return { ok: errors.length === 0, errors, status: record.status, activeMatchesStable };
}

async function main() {
  const result = await verifyStableReleaseConfig();
  if (!result.ok) {
    console.error('Stable release config verification failed:\n');
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(
    `Stable release config verification passed (status=${result.status}, activeMatchesStable=${result.activeMatchesStable}).`
  );
}

if (isMain(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
