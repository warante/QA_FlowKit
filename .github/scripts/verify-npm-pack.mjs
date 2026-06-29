#!/usr/bin/env node
/**
 * Validates npm pack output against the package files allowlist.
 * Used in CI (dry-run) and before publish in release workflows.
 */
import path from 'node:path';
import { parsePackOutput, validatePackFileList } from '../../.qa-ai/scripts/lib/npm-pack-allowlist.mjs';
import { isMain, repoRoot, runNpm } from './lib/ci-helpers.mjs';

export { parsePackOutput, validatePackFileList } from '../../.qa-ai/scripts/lib/npm-pack-allowlist.mjs';

function main() {
  const stdout = runNpm(['pack', '--dry-run', '--json'], {
    cwd: repoRoot,
    env: {
      npm_config_cache: process.env.npm_config_cache || path.join(repoRoot, '.npm-cache')
    }
  }).stdout;
  const packInfo = parsePackOutput(stdout);
  const fileCount = validatePackFileList(packInfo.files);
  console.log(`npm pack allowlist check passed (${fileCount} files, tarball ${packInfo.filename}).`);
}

if (isMain(import.meta.url)) {
  main();
}
