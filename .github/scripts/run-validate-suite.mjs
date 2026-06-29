#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stepLabel, VALIDATE_SUITES } from './lib/validate-suite-commands.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const node = process.execPath;
const npmExecPath = process.env.npm_execpath || '';
const bundledNpmCli = path.join(path.dirname(node), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const suiteName = (process.argv[2] || 'full').trim();

function runNpm(script, extraArgs = []) {
  const args = extraArgs.length > 0 ? ['run', script, '--', ...extraArgs] : ['run', script];
  if (npmExecPath) {
    return spawnSync(node, [npmExecPath, ...args], { cwd: repoRoot, stdio: 'inherit' });
  }
  if (process.platform === 'win32' && existsSync(bundledNpmCli)) {
    return spawnSync(node, [bundledNpmCli, ...args], { cwd: repoRoot, stdio: 'inherit' });
  }
  return spawnSync(npmCommand, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
}

function runStep(step) {
  if (step.type === 'npm') {
    return runNpm(step.script, step.args || []);
  }

  const scriptPath = path.join(repoRoot, step.file);
  return spawnSync(node, [scriptPath, ...(step.args || [])], { cwd: repoRoot, stdio: 'inherit' });
}

function main() {
  const steps = VALIDATE_SUITES[suiteName];
  if (!steps) {
    console.error(`Unknown validate suite "${suiteName}". Use core, e2e or full.`);
    process.exit(1);
  }

  for (const step of steps) {
    const result = runStep(step);
    if (result.status !== 0) {
      console.error(`\nValidate suite "${suiteName}" failed at: ${stepLabel(step)}`);
      process.exit(result.status || 1);
    }
  }

  console.log(`Validate suite "${suiteName}" passed (${steps.length} steps).`);
}

main();
