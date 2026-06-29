#!/usr/bin/env node
import fs from 'node:fs/promises';
import { isMain, repoRoot } from './lib/ci-helpers.mjs';
import path from 'node:path';

const ALLOWED_STATUS = new Set(['awaiting_publish', 'in_progress', 'completed']);
const ALLOWED_CHECK_STATUS = new Set(['pending', 'passed', 'failed', 'skipped']);

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

export async function verifyStablePostPublishStatus({ root = repoRoot } = {}) {
  const errors = [];
  const recordPath = path.join(root, 'docs', 'qa-ai', 'stable-post-publish.v1.json');
  const docPath = path.join(root, 'docs', 'qa-ai', 'stable-post-publish.md');
  const packagePath = path.join(root, 'package.json');

  const record = await readJson(recordPath);
  const packageJson = await readJson(packagePath);
  const doc = await fs.readFile(docPath, 'utf8');

  assert(record.schemaVersion === 1, 'stable-post-publish schemaVersion must be 1', errors);
  assert(record.task === 'TASK-085', 'stable-post-publish task must be TASK-085', errors);
  assert(ALLOWED_STATUS.has(record.status), `invalid post-publish status: ${record.status}`, errors);
  assert(
    record.qaFlowKitVersion === packageJson.version,
    'stable-post-publish version must match package.json',
    errors
  );
  assert(record.targetVersion === '1.0.0', 'targetVersion must be 1.0.0', errors);
  assert(record.expectedDistTag === 'latest', 'expectedDistTag must be latest', errors);
  assert(record.releasePrRecord === 'docs/qa-ai/stable-release-pr.v1.json', 'releasePrRecord path drift', errors);
  assert(
    record.validationScript === '.github/scripts/run-stable-post-publish-validation.mjs',
    'validationScript path drift',
    errors
  );

  for (const [name, check] of Object.entries(record.checks || {})) {
    assert(check && ALLOWED_CHECK_STATUS.has(check.status), `${name}.status invalid`, errors);
  }

  if (record.status === 'completed') {
    for (const [name, check] of Object.entries(record.checks || {})) {
      if (check.status === 'skipped') continue;
      assert(check.status === 'passed', `completed post-publish requires ${name} passed`, errors);
    }
  }

  const rehearsalScript = String(record.rehearsalCommand || '')
    .replace('npm run ', '')
    .split(' ')[0];
  assert(packageJson.scripts?.[rehearsalScript], `missing npm script ${rehearsalScript}`, errors);
  assert(doc.includes('stable-post-publish.v1.json'), 'stable-post-publish.md must link JSON record', errors);

  return { ok: errors.length === 0, errors, status: record.status };
}

async function main() {
  const result = await verifyStablePostPublishStatus();
  if (!result.ok) {
    console.error('Stable post-publish status verification failed:\n');
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`Stable post-publish status verification passed (status=${result.status}).`);
}

if (isMain(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
