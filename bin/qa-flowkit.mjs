#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cliValidatorCommandMap } from '../.qa-ai/scripts/lib/validator-registry.mjs';
import { pathExists } from '../.qa-ai/scripts/lib/utils.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagedFramework = path.join(packageRoot, '.qa-ai');
const cwd = process.cwd();
const targetFramework = path.join(cwd, '.qa-ai');

const commandMap = {
  config: 'config.mjs',
  bootstrap: 'bootstrap-agent-adapters.mjs',
  doctor: 'doctor.mjs',
  ...cliValidatorCommandMap(),
  'sync-adapters': 'sync-agent-adapters.mjs',
  'export-report': 'export-report.mjs',
  metrics: 'qa-metrics.mjs',
  help: 'qa-help.mjs',
  clean: 'clean.mjs',
  'show-config': 'show-config.mjs'
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
  validate-config [options]        Validate qa-ai.config.yaml against the published schema
  validate-untrusted-content [options] Scan requirement and QA context files for prompt-injection-like content
  validate-external-intake [options] Validate read-only external requirement and case imports
  validate-target [options]        Run all target-repository validators (strict doctor + full suite)
  validate-features [options]      Validate QA design .feature files (gherkin.featurePath)
  validate-karate-features [options] Validate executable Karate .feature files
  validate-maestro-flows [options]   Validate Maestro mobile YAML flows
  validate-traceability [options]  Validate the traceability matrix format and coverage
  validate-sync-plan [options]     Validate the test-management sync plan is proposal-first
  validate-sync-diff [options]     Validate governed test-management snapshot and diff artifacts
  validate-sync-result [options]   Validate governed test-management apply and verify artifacts
  validate-active-specialists      Validate active.md matches qa-ai.config.yaml
  validate-release-gate [options]  Validate the release-gate.yaml artifact
  validate-test-design [options]   Validate system and per-RF test design artifacts
  validate-test-coverage [options] Validate configured cross-feature coverage obligations
  validate-quality-report [options] Validate the semantic Gherkin quality report

Harness commands:
  run <subcommand>                 Resumable QA workflow run (start, status, next, check, retry, set-rf, approve, resume)

Other commands:
  export-report [options]          Export Gherkin-aligned test cases and execution results to Cucumber JSON, Allure, or JUnit XML
  metrics [options]                Compute local workflow KPIs from .qa-ai/state/runs/
  sync-adapters [options]          Re-sync agent adapter files from the packaged templates
  help [options]                   Show context-aware next-step guidance for the QA workflow
  show-config [options]            Print resolved interface/Gherkin language and track from config
  clean [options]                  Remove generated files tracked in the init manifest
  version, -v, --version           Print the installed QA FlowKit version

Examples:
  npx qa-flowkit init
  npx qa-flowkit init --preset manual-only --interface-language es --gherkin-language es
  npx qa-flowkit update
  npx qa-flowkit update --dry-run --json
  npx qa-flowkit doctor --strict
  npx qa-flowkit validate-config --json
  npx qa-flowkit show-config --json
  npx qa-flowkit run start --rf RF-123
  npx qa-flowkit run next --json
  npx qa-flowkit run retry --json
  npx qa-flowkit validate-target --allow-empty --allow-missing --no-strict-doctor
  npx qa-flowkit config --export .qa-ai/config-profiles/team.yaml
  npx qa-flowkit export-report --format allure --out .qa-ai/output/reports/allure
  npx qa-flowkit metrics --json
`);
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
  if (!(await frameworkIsInstalled())) {
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

async function frameworkIsInstalled() {
  return pathExists(path.join(targetFramework, 'scripts', 'init.mjs'));
}

async function copyPackagedFramework(target, { merge = false } = {}) {
  await fs.cp(packagedFramework, target, {
    recursive: true,
    force: merge,
    errorOnExist: !merge
  });
  await fs.rm(path.join(target, 'state', 'init-manifest.json'), { force: true });
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
  const modulePath = path.join(targetFramework, 'scripts', 'lib', 'detect-adapters.mjs');
  const { detectExistingAdapters } = await import(pathToFileURL(modulePath).href);
  return detectExistingAdapters(cwd);
}

async function init(args) {
  await assertPackagedFramework();
  if (await frameworkIsInstalled()) {
    console.error('A .qa-ai framework folder already exists in this repository.');
    console.error('Run "qa-flowkit update" to refresh it, or remove it intentionally before running init.');
    process.exit(1);
  }

  const mergeIntoExisting = await pathExists(targetFramework);
  if (mergeIntoExisting) {
    await fs.mkdir(targetFramework, { recursive: true });
  }
  await copyPackagedFramework(targetFramework, { merge: mergeIntoExisting });
  const packageJson = JSON.parse(await fs.readFile(path.join(packageRoot, 'package.json'), 'utf8'));
  runNodeScript('init.mjs', [...withoutCliOnlyFlags(args), '--package-version', packageJson.version]);
  if (!hasFlag(args, 'skip-doctor')) {
    runNodeScript('doctor.mjs', [], { allowWarnings: true });
  }
}

const USER_QA_AI_PRESERVE = ['output', 'features', 'tests', 'qa-ai.config.yaml'];

async function backupUserQaAiContent(sourceFramework, backupFramework) {
  for (const rel of USER_QA_AI_PRESERVE) {
    await copyIfExists(path.join(sourceFramework, rel), path.join(backupFramework, rel));
  }
}

async function restoreUserQaAiContent(sourceFramework, targetFramework) {
  for (const rel of USER_QA_AI_PRESERVE) {
    await restoreIfExists(path.join(sourceFramework, rel), path.join(targetFramework, rel));
  }
}

async function update(args) {
  await assertPackagedFramework();
  await assertTargetFramework('update');

  const planModulePath = path.join(packagedFramework, 'scripts', 'lib', 'update-plan.mjs');
  const { buildUpdatePlan, formatUpdatePlan } = await import(pathToFileURL(planModulePath).href);
  const plan = await buildUpdatePlan({ cwd, packageRoot });

  if (hasFlag(args, 'dry-run')) {
    if (hasFlag(args, 'json')) {
      console.log(JSON.stringify(plan, null, 2));
    } else {
      console.log(formatUpdatePlan(plan));
    }
    return;
  }

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-flowkit-update-'));
  const backupFramework = path.join(tempRoot, '.qa-ai');
  try {
    await copyIfExists(path.join(targetFramework, 'state'), path.join(backupFramework, 'state'));
    await copyIfExists(path.join(targetFramework, 'config-profiles'), path.join(backupFramework, 'config-profiles'));
    await backupUserQaAiContent(targetFramework, backupFramework);

    await fs.rm(targetFramework, { recursive: true, force: true });
    await fs.cp(packagedFramework, targetFramework, { recursive: true, force: true });
    await fs.rm(path.join(targetFramework, 'state', 'init-manifest.json'), { force: true });

    await restoreIfExists(path.join(backupFramework, 'state'), path.join(targetFramework, 'state'));
    await restoreIfExists(path.join(backupFramework, 'config-profiles'), path.join(targetFramework, 'config-profiles'));
    await restoreUserQaAiContent(backupFramework, targetFramework);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }

  console.log('Updated .qa-ai framework from the installed QA FlowKit package.');
  const packageJson = JSON.parse(await fs.readFile(path.join(packageRoot, 'package.json'), 'utf8'));
  runNodeScript('init.mjs', ['--no-adapters', '--skip-structure', '--package-version', packageJson.version]);

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
