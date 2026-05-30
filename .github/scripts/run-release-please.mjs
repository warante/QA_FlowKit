#!/usr/bin/env node
/**
 * Run release-please via CLI (no third-party Actions).
 * Required when the repo only allows actions from GitHub or the owner org.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const outputFile = process.env.GITHUB_OUTPUT;
const targetBranch = process.env.RELEASE_PLEASE_TARGET_BRANCH || 'main';

if (!repo || !token) {
  console.error('GITHUB_REPOSITORY and GITHUB_TOKEN are required.');
  process.exit(1);
}

function runReleasePlease(args) {
  const bin = process.platform === 'win32' ? 'release-please.cmd' : 'release-please';
  const localBin = `${process.cwd()}/node_modules/.bin/${bin}`;
  const cmd = fs.existsSync(localBin) ? localBin : 'npx';
  const cmdArgs = fs.existsSync(localBin) ? args : ['--yes', 'release-please@17.6.1', ...args];
  const logArgs = cmdArgs.map((arg) => (arg.startsWith('--token=') ? '--token=***' : arg));
  console.log(`> ${cmd} ${logArgs.join(' ')}`);
  return execFileSync(cmd, cmdArgs, {
    encoding: 'utf8',
    env: { ...process.env, GITHUB_TOKEN: token },
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 10 * 1024 * 1024
  });
}

function gh(args) {
  return execFileSync('gh', args, {
    encoding: 'utf8',
    env: { ...process.env, GITHUB_TOKEN: token, GH_TOKEN: token }
  }).trim();
}

function readManifestVersion() {
  const raw = JSON.parse(fs.readFileSync('.release-please-manifest.json', 'utf8'));
  return String(raw['.'] || '').trim();
}

function writeOutputs({ releaseCreated, version, tagName }) {
  if (!outputFile) return;
  const lines = [`release_created=${releaseCreated ? 'true' : 'false'}`, `version=${version}`, `tag_name=${tagName}`];
  fs.appendFileSync(outputFile, `${lines.join('\n')}\n`);
}

function latestReleaseTag() {
  try {
    return gh(['release', 'list', '--repo', repo, '--limit', '1', '--json', 'tagName', '-q', '.[0].tagName']);
  } catch {
    return '';
  }
}

const configFile = process.env.RELEASE_PLEASE_CONFIG_FILE || '.release-please-config.json';
const manifestFile = process.env.RELEASE_PLEASE_MANIFEST_FILE || '.release-please-manifest.json';

const baseArgs = [
  `--token=${token}`,
  `--repo-url=${repo}`,
  `--target-branch=${targetBranch}`,
  `--config-file=${configFile}`,
  `--manifest-file=${manifestFile}`
];

function isActionsCannotOpenPrError(text) {
  return /not permitted to create or approve pull requests/i.test(text);
}

function printPrPermissionHelp() {
  console.error(`
::error::GitHub Actions cannot open pull requests with the default GITHUB_TOKEN.

Fix (repository maintainer):
  Settings → Actions → General → Workflow permissions
  → enable "Allow GitHub Actions to create and approve pull requests"

Or add a classic PAT with repo scope as repository secret RELEASE_PLEASE_TOKEN
and re-run the workflow (see docs/qa-ai/release-checklist.md).
`);
}

console.log('=== release-please release-pr ===');
try {
  const prOut = runReleasePlease(['release-pr', ...baseArgs]);
  if (prOut) console.log(prOut);
} catch (error) {
  const detail = `${error.stderr || ''}${error.stdout || ''}${error.message || ''}`;
  if (isActionsCannotOpenPrError(detail)) {
    printPrPermissionHelp();
  } else {
    console.error(error.stderr || error.message);
  }
  process.exit(error.status || 1);
}

const tagBefore = latestReleaseTag();
console.log(`Latest release tag before github-release: ${tagBefore || '(none)'}`);

console.log('=== release-please github-release ===');
try {
  const releaseOut = runReleasePlease(['github-release', ...baseArgs]);
  if (releaseOut) console.log(releaseOut);
} catch (error) {
  const stderr = String(error.stderr || '');
  const stdout = String(error.stdout || '');
  if (stdout) console.log(stdout);
  if (!/no releases created|nothing to release|No release found/i.test(`${stderr}${stdout}`)) {
    console.error(stderr || error.message);
    process.exit(error.status || 1);
  }
  console.log('No GitHub release created on this run (expected when no Release PR was merged).');
}

const version = readManifestVersion();
const tagName = version ? `v${version}` : '';
const tagAfter = latestReleaseTag();
const releaseCreated = Boolean(tagName && tagAfter === tagName && tagAfter !== tagBefore);

writeOutputs({ releaseCreated, version, tagName });
console.log(
  JSON.stringify(
    { release_created: releaseCreated, version, tag_name: tagName, tag_before: tagBefore, tag_after: tagAfter },
    null,
    2
  )
);
