#!/usr/bin/env node
/**
 * Validates npm pack output against the package files allowlist.
 * Used in CI (dry-run) and before publish in release workflows.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePackOutput, validatePackFileList } from '../../.qa-ai/scripts/lib/npm-pack-allowlist.mjs';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const node = process.execPath;
const npmExecPath = process.env.npm_execpath || '';
const bundledNpmCli = path.join(path.dirname(node), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const npmScriptPath = npmExecPath || (process.platform === 'win32' && existsSync(bundledNpmCli) ? bundledNpmCli : '');

function runNpm(args) {
  const command = npmScriptPath ? node : npmCommand;
  const commandArgs = npmScriptPath ? [npmScriptPath, ...args] : args;
  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      npm_config_cache: process.env.npm_config_cache || path.join(process.cwd(), '.npm-cache')
    },
    shell: process.platform === 'win32' && !npmScriptPath
  });
  if (result.status !== 0) {
    throw new Error(
      [`npm ${args.join(' ')} failed (${result.status})`, result.stderr, result.stdout].filter(Boolean).join('\n')
    );
  }
  return result.stdout;
}

export { parsePackOutput, validatePackFileList } from '../../.qa-ai/scripts/lib/npm-pack-allowlist.mjs';

function main() {
  const stdout = runNpm(['pack', '--dry-run', '--json']);
  const packInfo = parsePackOutput(stdout);
  const fileCount = validatePackFileList(packInfo.files);
  console.log(`npm pack allowlist check passed (${fileCount} files, tarball ${packInfo.filename}).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
