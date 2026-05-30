#!/usr/bin/env node
/**
 * Validates npm pack output against the package files allowlist.
 * Used in CI (dry-run) and before publish in release workflows.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const node = process.execPath;
const npmExecPath = process.env.npm_execpath || '';

function runNpm(args) {
  const command = npmExecPath ? node : npmCommand;
  const commandArgs = npmExecPath ? [npmExecPath, ...args] : args;
  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: process.platform === 'win32' && !npmExecPath
  });
  if (result.status !== 0) {
    throw new Error(
      [`npm ${args.join(' ')} failed (${result.status})`, result.stderr, result.stdout].filter(Boolean).join('\n')
    );
  }
  return result.stdout;
}

export function validatePackFileList(files) {
  const names = files.map((file) => file.path).sort();
  const required = [
    'bin/qa-flowkit.mjs',
    '.qa-ai/scripts/init.mjs',
    '.qa-ai/scripts/doctor.mjs',
    '.qa-ai/adapters/opencode/commands/qa-init.md',
    'README.md',
    'README.es.md',
    'LICENSE',
    'package.json'
  ];
  const forbiddenPrefixes = [
    '.github/',
    '.claude/',
    '.opencode/',
    '.npm-cache/',
    'qa-ai-output/',
    'features/',
    'tests/'
  ];
  const forbiddenExact = [
    'qa-ai.config.yaml',
    '.qa-ai/state/init-manifest.json',
    '.qa-ai/agents/specialists/active.md'
  ];

  for (const relPath of required) {
    if (!names.includes(relPath)) {
      throw new Error(`Pack file list is missing required path: ${relPath}`);
    }
  }
  for (const relPath of names) {
    if (forbiddenExact.includes(relPath) || forbiddenPrefixes.some((prefix) => relPath.startsWith(prefix))) {
      throw new Error(`Pack file list includes forbidden path: ${relPath}`);
    }
  }
  return names.length;
}

function parsePackOutput(stdout) {
  const parsed = JSON.parse(stdout);
  const item = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!item?.filename || !Array.isArray(item.files)) {
    throw new Error('Unexpected npm pack --json output.');
  }
  return item;
}

function main() {
  const stdout = runNpm(['pack', '--dry-run', '--json']);
  const packInfo = parsePackOutput(stdout);
  const fileCount = validatePackFileList(packInfo.files);
  console.log(`npm pack allowlist check passed (${fileCount} files, tarball ${packInfo.filename}).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
