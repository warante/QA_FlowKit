#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ANNOUNCEMENT_REQUIRED_LINKS,
  ANNOUNCEMENT_REQUIRED_SECTIONS,
  RC_LIFECYCLE_EN,
  RC_LIFECYCLE_ES,
  STABLE_LIFECYCLE_EN,
  STABLE_LIFECYCLE_ES,
  STABLE_PRIMARY_COMMANDS,
  UNSUPPORTED_CLAIM_PATTERNS
} from './lib/stable-announcement.mjs';
import { verifyStablePostPublishStatus } from './verify-stable-post-publish-status.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ALLOWED_STATUS = new Set(['prepared', 'published']);

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function pathExists(root, relativePath) {
  try {
    await fs.access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

function assertNoUnsupportedClaims(content, label, errors) {
  for (const pattern of UNSUPPORTED_CLAIM_PATTERNS) {
    assert(!pattern.test(content), `${label} must not include unsupported claim matching ${pattern}`, errors);
  }
}

export async function verifyStableAnnouncement({ root = repoRoot } = {}) {
  const errors = [];
  const recordPath = path.join(root, 'docs', 'qa-ai', 'stable-announcement.v1.json');
  const entrypointsPath = path.join(root, 'docs', 'qa-ai', 'stable-public-entrypoints.v1.json');
  const guidePath = path.join(root, 'docs', 'qa-ai', 'stable-announcement.md');
  const packagePath = path.join(root, 'package.json');

  const record = await readJson(recordPath);
  const entrypoints = await readJson(entrypointsPath);
  const packageJson = await readJson(packagePath);
  const guide = await fs.readFile(guidePath, 'utf8');
  const readme = await fs.readFile(path.join(root, 'README.md'), 'utf8');
  const readmeEs = await fs.readFile(path.join(root, 'README.es.md'), 'utf8');
  const template = await fs.readFile(path.join(root, record.announcementTemplate), 'utf8');
  const policyStable = await fs.readFile(path.join(root, record.stabilityPolicyStable), 'utf8');

  assert(record.schemaVersion === 1, 'stable-announcement schemaVersion must be 1', errors);
  assert(record.task === 'TASK-086', 'stable-announcement task must be TASK-086', errors);
  assert(ALLOWED_STATUS.has(record.status), `invalid announcement status: ${record.status}`, errors);
  assert(
    record.qaFlowKitVersion === packageJson.version,
    'stable-announcement version must match package.json',
    errors
  );
  assert(
    entrypoints.qaFlowKitVersion === packageJson.version,
    'stable-public-entrypoints version must match package.json',
    errors
  );
  assert(entrypoints.lifecycle === 'rc' || entrypoints.lifecycle === 'stable', 'invalid entrypoints lifecycle', errors);

  assert(
    await pathExists(root, record.feedbackTemplate),
    `missing feedback template ${record.feedbackTemplate}`,
    errors
  );
  assert(
    Array.isArray(entrypoints.flipToStable) && entrypoints.flipToStable.length >= 4,
    'flipToStable checklist required',
    errors
  );

  for (const link of ANNOUNCEMENT_REQUIRED_LINKS) {
    assert(template.includes(link), `announcement template missing link ${link}`, errors);
  }
  for (const section of ANNOUNCEMENT_REQUIRED_SECTIONS) {
    assert(template.includes(section), `announcement template missing section ${section}`, errors);
  }
  assertNoUnsupportedClaims(template, 'announcement template', errors);
  assert(policyStable.includes('public-contracts.md'), 'stability-policy-stable must link public contracts', errors);

  const postPublish = await verifyStablePostPublishStatus({ root });
  assert(postPublish.ok, `stable post-publish record must pass: ${postPublish.errors.join('; ')}`, errors);

  if (record.status === 'prepared') {
    assert(entrypoints.lifecycle === 'rc', 'prepared announcement expects entrypoints lifecycle rc', errors);
    assert(RC_LIFECYCLE_EN.test(readme), 'prepared state expects README Release Candidate lifecycle', errors);
    assert(RC_LIFECYCLE_ES.test(readmeEs), 'prepared state expects README.es Release Candidate lifecycle', errors);
  }

  if (record.status === 'published') {
    assert(entrypoints.lifecycle === 'stable', 'published announcement requires entrypoints lifecycle stable', errors);
    assert(STABLE_LIFECYCLE_EN.test(readme), 'published state requires README Stable lifecycle', errors);
    assert(STABLE_LIFECYCLE_ES.test(readmeEs), 'published state requires README.es Estable lifecycle', errors);
    assert(
      STABLE_PRIMARY_COMMANDS.some((command) => readme.includes(command)),
      'published README must document @latest install',
      errors
    );
    assert(
      postPublish.status === 'completed',
      'published announcement requires TASK-085 post-publish completed',
      errors
    );
  }

  assert(guide.includes('stable-announcement.v1.json'), 'stable-announcement.md must link JSON record', errors);
  assert(
    guide.includes('stable-public-entrypoints.v1.json'),
    'stable-announcement.md must link entrypoints manifest',
    errors
  );

  return { ok: errors.length === 0, errors, status: record.status };
}

async function main() {
  const result = await verifyStableAnnouncement();
  if (!result.ok) {
    console.error('Stable announcement verification failed:\n');
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`Stable announcement verification passed (status=${result.status}).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
