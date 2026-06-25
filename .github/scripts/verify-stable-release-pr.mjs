#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RELEASE_NOTES_REQUIRED_LINKS,
  RELEASE_PR_REVIEW_PATHS,
  STABLE_TARGET_VERSION,
  expectedReleasePrTitle,
  isStableReleaseVersion
} from './lib/stable-release-pr.mjs';
import { resolveNpmDistTag } from './lib/npm-dist-tag.mjs';
import { verifyStableReleaseConfig } from './verify-stable-release-config.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ALLOWED_STATUS = new Set(['awaiting_release_pr', 'in_review', 'merged']);

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

export async function verifyStableReleasePr({ root = repoRoot } = {}) {
  const errors = [];
  const recordPath = path.join(root, 'docs', 'qa-ai', 'stable-release-pr.v1.json');
  const prDocPath = path.join(root, 'docs', 'qa-ai', 'stable-release-pr.md');
  const releaseDocPath = path.join(root, 'docs', 'qa-ai', 'beta-to-rc-release.md');
  const packagePath = path.join(root, 'package.json');

  const record = await readJson(recordPath);
  const packageJson = await readJson(packagePath);
  const prDoc = await fs.readFile(prDocPath, 'utf8');
  const releaseDoc = await fs.readFile(releaseDocPath, 'utf8');

  assert(record.schemaVersion === 1, 'stable-release-pr schemaVersion must be 1', errors);
  assert(record.task === 'TASK-084', 'stable-release-pr task must be TASK-084', errors);
  assert(ALLOWED_STATUS.has(record.status), `invalid release PR status: ${record.status}`, errors);
  assert(record.qaFlowKitVersion === packageJson.version, 'stable-release-pr version must match package.json', errors);
  assert(record.targetVersion === STABLE_TARGET_VERSION, 'targetVersion must be 1.0.0', errors);
  assert(record.expectedPrTitle === expectedReleasePrTitle(), 'expectedPrTitle drift', errors);
  assert(record.expectedDistTag === 'latest', 'expectedDistTag must be latest', errors);
  assert(record.configRecord === 'docs/qa-ai/stable-release-config.v1.json', 'configRecord path drift', errors);
  assert(
    record.releaseNotesTemplate === 'docs/qa-ai/stable-release-notes.template.md',
    'releaseNotesTemplate path drift',
    errors
  );
  assert(record.publishWorkflow === '.github/workflows/release-please.yml', 'publishWorkflow path drift', errors);
  assert(
    resolveNpmDistTag(record.targetVersion) === record.expectedDistTag,
    'dist-tag policy must map 1.0.0 to latest',
    errors
  );

  const config = await verifyStableReleaseConfig({ root });
  assert(config.ok, `stable config must pass: ${config.errors.join('; ')}`, errors);

  for (const relativePath of record.reviewPaths || RELEASE_PR_REVIEW_PATHS) {
    assert(await pathExists(root, relativePath), `missing Release PR review path: ${relativePath}`, errors);
  }

  const notesTemplate = await fs.readFile(path.join(root, record.releaseNotesTemplate), 'utf8');
  for (const link of RELEASE_NOTES_REQUIRED_LINKS) {
    assert(notesTemplate.includes(link), `release notes template missing link ${link}`, errors);
  }

  const workflow = await fs.readFile(path.join(root, record.publishWorkflow), 'utf8');
  assert(workflow.includes('release-please'), 'publish workflow must use release-please', errors);
  assert(workflow.includes('tag=latest'), 'publish workflow must document latest dist-tag path', errors);
  assert(
    !workflow.includes('npm publish') || workflow.includes('--tag'),
    'publish workflow must set npm dist-tag',
    errors
  );

  if (record.status === 'merged') {
    assert(record.releasePrUrl, 'merged status requires releasePrUrl', errors);
    assert(record.mergedAt, 'merged status requires mergedAt', errors);
    assert(record.ciGreenOnPr === true, 'merged status requires ciGreenOnPr true', errors);
    assert(config.status === 'merged', 'merged Release PR requires TASK-083 config merged', errors);
    assert(
      packageJson.version === STABLE_TARGET_VERSION,
      'merged Release PR requires package.json 1.0.0 on main',
      errors
    );
    const manifest = await readJson(path.join(root, '.release-please-manifest.json'));
    assert(manifest['.'] === STABLE_TARGET_VERSION, 'merged Release PR requires manifest 1.0.0', errors);
    assert(isStableReleaseVersion(packageJson.version), 'merged Release PR version must be stable semver', errors);
  }

  assert(prDoc.includes('stable-release-pr.v1.json'), 'stable-release-pr.md must link JSON record', errors);
  assert(releaseDoc.includes('TASK-084'), 'beta-to-rc-release.md must include TASK-084 guidance', errors);
  assert(
    releaseDoc.includes('stable-release-pr.v1.json'),
    'beta-to-rc-release.md must reference release PR record',
    errors
  );

  const rehearsalScript = String(record.rehearsalCommand || '').replace('npm run ', '');
  assert(packageJson.scripts?.[rehearsalScript], `missing rehearsal npm script ${rehearsalScript}`, errors);

  return { ok: errors.length === 0, errors, status: record.status };
}

async function main() {
  const result = await verifyStableReleasePr();
  if (!result.ok) {
    console.error('Stable release PR verification failed:\n');
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`Stable release PR verification passed (status=${result.status}).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
