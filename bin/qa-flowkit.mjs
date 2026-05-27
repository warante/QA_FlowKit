#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagedFramework = path.join(packageRoot, '.qa-ai');
const cwd = process.cwd();
const targetFramework = path.join(cwd, '.qa-ai');

const commandMap = {
  doctor: 'doctor.mjs',
  'validate-target': 'validate-target.mjs',
  'validate-features': 'validate-features.mjs',
  'sync-adapters': 'sync-agent-adapters.mjs',
  help: 'qa-help.mjs',
  clean: 'clean.mjs'
};

function printHelp() {
  console.log(`QA FlowKit

Usage:
  qa-flowkit init [options]
  qa-flowkit update [options]
  qa-flowkit doctor [options]
  qa-flowkit validate-target [options]
  qa-flowkit validate-features [options]
  qa-flowkit sync-adapters [options]
  qa-flowkit help [options]
  qa-flowkit clean [options]

Examples:
  npx qa-flowkit init
  npx qa-flowkit init --preset manual-only --interface-language es --gherkin-language es
  npx qa-flowkit update
  npx qa-flowkit validate-target --allow-empty --allow-missing --no-strict-doctor
`);
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function hasFlag(args, name) {
  return args.includes(`--${name}`);
}

function withoutCliOnlyFlags(args) {
  return args.filter((arg) => !['--skip-doctor'].includes(arg));
}

async function assertPackagedFramework() {
  if (!await pathExists(path.join(packagedFramework, 'scripts', 'init.mjs'))) {
    console.error(`Packaged QA FlowKit framework is incomplete: ${packagedFramework}`);
    process.exit(1);
  }
}

async function assertTargetFramework(command) {
  if (!await pathExists(path.join(targetFramework, 'scripts'))) {
    console.error(`Missing .qa-ai framework folder. Run "qa-flowkit init" before "qa-flowkit ${command}".`);
    process.exit(1);
  }
}

function runNodeScript(scriptName, args = [], { allowWarnings = false } = {}) {
  const scriptPath = path.join(targetFramework, 'scripts', scriptName);
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd,
    stdio: 'inherit',
    shell: false
  });
  const status = result.status ?? 1;
  if (status !== 0 && !allowWarnings) process.exit(status);
  return status;
}

async function copyPackagedFramework(target) {
  await fs.cp(packagedFramework, target, {
    recursive: true,
    force: false,
    errorOnExist: true
  });
}

async function copyIfExists(source, target) {
  if (!await pathExists(source)) return false;
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.cp(source, target, { recursive: true, force: true });
  return true;
}

async function restoreIfExists(source, target) {
  if (!await pathExists(source)) return false;
  await fs.rm(target, { recursive: true, force: true });
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.cp(source, target, { recursive: true, force: true });
  return true;
}

async function selectedExistingAdapters() {
  const candidates = [
    ['claude', '.claude'],
    ['codex', '.codex'],
    ['opencode', '.opencode'],
    ['cline', '.cline'],
    ['continue', '.continue'],
    ['aider', '.aider'],
    ['goose', '.goose'],
    ['gemini', 'GEMINI.md']
  ];
  const names = [];
  for (const [name, relPath] of candidates) {
    if (await pathExists(path.join(cwd, relPath))) names.push(name);
  }
  if (await pathExists(path.join(cwd, '.clinerules'))) names.push('cline');
  if (await pathExists(path.join(cwd, '.aider.conf.yml'))) names.push('aider');
  if (await pathExists(path.join(cwd, 'AGENTS.md'))) names.unshift('generic');
  return [...new Set(names)];
}

async function init(args) {
  await assertPackagedFramework();
  if (await pathExists(targetFramework)) {
    console.error('A .qa-ai framework folder already exists in this repository.');
    console.error('Run "qa-flowkit update" to refresh it, or remove it intentionally before running init.');
    process.exit(1);
  }

  await copyPackagedFramework(targetFramework);
  runNodeScript('init.mjs', withoutCliOnlyFlags(args));
  if (!hasFlag(args, 'skip-doctor')) {
    runNodeScript('doctor.mjs', [], { allowWarnings: true });
  }
}

async function update(args) {
  await assertPackagedFramework();
  await assertTargetFramework('update');

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-flowkit-update-'));
  const backupFramework = path.join(tempRoot, '.qa-ai');
  try {
    await copyIfExists(path.join(targetFramework, 'state'), path.join(backupFramework, 'state'));
    await copyIfExists(path.join(targetFramework, 'config-profiles'), path.join(backupFramework, 'config-profiles'));

    await fs.rm(targetFramework, { recursive: true, force: true });
    await fs.cp(packagedFramework, targetFramework, { recursive: true, force: true });

    await restoreIfExists(path.join(backupFramework, 'state'), path.join(targetFramework, 'state'));
    await restoreIfExists(path.join(backupFramework, 'config-profiles'), path.join(targetFramework, 'config-profiles'));
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }

  console.log('Updated .qa-ai framework from the installed QA FlowKit package.');
  runNodeScript('init.mjs', ['--no-adapters']);

  const adapters = await selectedExistingAdapters();
  if (adapters.length > 0) {
    const syncArgs = ['--adapters', adapters.join(',')];
    if (hasFlag(args, 'force')) syncArgs.push('--force');
    runNodeScript('sync-agent-adapters.mjs', syncArgs);
  } else {
    console.log('No existing root adapters detected; skipping adapter sync.');
  }

  if (!hasFlag(args, 'skip-doctor')) {
    runNodeScript('doctor.mjs', [], { allowWarnings: true });
  }
}

async function main() {
  const [command = 'help', ...args] = process.argv.slice(2);
  if (['-h', '--help', 'help'].includes(command)) {
    printHelp();
    return;
  }
  if (['-v', '--version', 'version'].includes(command)) {
    const packageJson = JSON.parse(await fs.readFile(path.join(packageRoot, 'package.json'), 'utf8'));
    console.log(packageJson.version);
    return;
  }
  if (command === 'init') {
    await init(args);
    return;
  }
  if (command === 'update') {
    await update(args);
    return;
  }
  if (command in commandMap) {
    await assertTargetFramework(command);
    runNodeScript(commandMap[command], args);
    return;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
