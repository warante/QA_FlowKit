#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { REQUIRED_MIN_RELEASE_AGE_DAYS, verifyNpmReleaseAgePolicy } from './lib/npm-release-age-policy.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readNpmVersion() {
  try {
    return execSync('npm --version', { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

export async function verifyNpmReleaseAgePolicyFile({
  root = repoRoot,
  checkNpmVersion = false,
  npmVersion = readNpmVersion()
} = {}) {
  const npmrcContent = await fs.readFile(path.join(root, '.npmrc'), 'utf8');
  return verifyNpmReleaseAgePolicy({ npmrcContent, npmVersion, checkNpmVersion });
}

async function main() {
  const checkNpmVersion = process.argv.includes('--check-npm-version');
  const result = await verifyNpmReleaseAgePolicyFile({ checkNpmVersion });

  if (!result.ok) {
    console.error('npm minimum release-age policy verification failed:\n');
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(
    `npm minimum release-age policy verification passed (min-release-age=${REQUIRED_MIN_RELEASE_AGE_DAYS} days).`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
