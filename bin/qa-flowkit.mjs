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
  config: 'config.mjs',
  bootstrap: 'bootstrap-agent-adapters.mjs',
  doctor: 'doctor.mjs',
  'validate-target': 'validate-target.mjs',
  'validate-features': 'validate-features.mjs',
  'validate-karate-features': 'validate-karate-features.mjs',
  'validate-traceability': 'validate-traceability.mjs',
  'validate-sync-plan': 'validate-sync-plan.mjs',
  'validate-active-specialists': 'validate-active-specialists.mjs',
  'validate-release-gate': 'validate-release-gate.mjs',
  'validate-test-design': 'validate-test-design.mjs',
  'sync-adapters': 'sync-agent-adapters.mjs',
  help: 'qa-help.mjs',
  clean: 'clean.mjs'
};

function printHelp() {
  console.log(`QA FlowKit

Usage:
  qa-flowkit <command> [options]

Setup commands:
  init [options]                   Copy the .qa-ai framework and run first-time setup
  update [options]                 Upgrade .qa-ai to the installed package version
  bootstrap [options]              Generate agent adapter files after copying .qa-ai manually
  config [options]                 Export or import a qa-ai.config.yaml profile

Validation commands:
  doctor [options]                 Check that the .qa-ai framework is correctly installed
  validate-target [options]        Run all target-repository validators (strict doctor + full suite)
  validate-features [options]      Validate QA design .feature files (gherkin.featurePath)
  validate-karate-features [options] Validate executable Karate .feature files
  validate-traceability [options]  Validate the traceability matrix format and coverage
  validate-sync-plan [options]     Validate the test-management sync plan is proposal-first
  validate-active-specialists      Validate active.md matches qa-ai.config.yaml
  validate-release-gate [options]  Validate the release-gate.yaml artifact
  validate-test-design [options]   Validate system and per-RF test design artifacts

Harness commands:
  run <subcommand>                 Resumable QA workflow run (start, status, next, check, retry, set-rf, approve, resume)

Other commands:
  sync-adapters [options]          Re-sync agent adapter files from the packaged templates
  help [options]                   Show context-aware next-step guidance for the QA workflow
  clean [options]                  Remove generated files tracked in the init manifest
  version, -v, --version           Print the installed QA FlowKit version

Examples:
  npx qa-flowkit init
  npx qa-flowkit init --preset manual-only --interface-language es --gherkin-language es
  npx qa-flowkit update
  npx qa-flowkit doctor --strict
  npx qa-flowkit run start --rf RF-123
  npx qa-flowkit run next --json
  npx qa-flowkit run retry --json
  npx qa-flowkit validate-target --allow-empty --allow-missing --no-strict-doctor
  npx qa-flowkit config --export .qa-ai/config-profiles/team.yaml
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
  if (!(await pathExists(path.join(packagedFramework, 'scripts', 'init.mjs')))) {
    console.error(`Packaged QA FlowKit framework is incomplete: ${packagedFramework}`);
    process.exit(1);
  }
}

async function assertTargetFramework(command) {
  if (!(await pathExists(path.join(targetFramework, 'scripts')))) {
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
  if (!(await pathExists(source))) return false;
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.cp(source, target, { recursive: true, force: true });
  return true;
}

async function restoreIfExists(source, target) {
  if (!(await pathExists(source))) return false;
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
  if (command === 'help' && args.includes('--json')) {
    await assertTargetFramework('help');
    runNodeScript('qa-help.mjs', args);
    return;
  }
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
  if (command === 'run') {
    await assertTargetFramework('run');
    runNodeScript('qa-run.mjs', args);
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
