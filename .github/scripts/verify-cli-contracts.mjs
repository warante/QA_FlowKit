#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertRequiredKeys, assertStderrEmpty, parsePureJsonStdout } from '../../.qa-ai/scripts/lib/cli-contract.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cli = path.join(repoRoot, 'bin', 'qa-flowkit.mjs');
const fixtureRoot = path.join(repoRoot, 'test', 'fixtures', 'golden-target');
const node = process.execPath;

function runCli(cwd, args, { expectFailure = false } = {}) {
  const result = spawnSync(node, [cli, ...args], {
    cwd,
    encoding: 'utf8',
    shell: false
  });
  const failed = result.status !== 0;
  if (expectFailure ? !failed : failed) {
    throw new Error(
      [
        `qa-flowkit ${args.join(' ')} ${expectFailure ? 'succeeded unexpectedly' : 'failed'} (exit ${result.status})`,
        result.stdout,
        result.stderr
      ]
        .filter(Boolean)
        .join('\n')
    );
  }
  return result;
}

function runScript(cwd, scriptRelative, args, { expectFailure = false } = {}) {
  const result = spawnSync(node, [path.join(cwd, scriptRelative), ...args], {
    cwd,
    encoding: 'utf8',
    shell: false
  });
  const failed = result.status !== 0;
  if (expectFailure ? !failed : failed) {
    throw new Error(
      [
        `node ${scriptRelative} ${args.join(' ')} ${expectFailure ? 'succeeded unexpectedly' : 'failed'} (exit ${result.status})`,
        result.stdout,
        result.stderr
      ]
        .filter(Boolean)
        .join('\n')
    );
  }
  return result;
}

async function prepareWorkspace(setup) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-cli-contract-'));
  await fs.cp(path.join(repoRoot, '.qa-ai'), path.join(workspace, '.qa-ai'), { recursive: true, force: true });
  await fs.cp(fixtureRoot, workspace, { recursive: true, force: true });

  if (setup === 'golden-target-invalid-config') {
    const configPath = path.join(workspace, 'qa-ai.config.yaml');
    const content = await fs.readFile(configPath, 'utf8');
    await fs.writeFile(configPath, content.replace(/^version:\s*1/m, 'version: 2'), 'utf8');
  }

  return workspace;
}

function assertJsonScenario(result, rules, label) {
  const payload = parsePureJsonStdout(result.stdout, label);
  if (rules.requiredKeys) assertRequiredKeys(payload, rules.requiredKeys, label);
  if (rules.equals) {
    for (const [key, value] of Object.entries(rules.equals)) {
      if (payload[key] !== value) {
        throw new Error(`${label}: expected ${key}=${JSON.stringify(value)}, got ${JSON.stringify(payload[key])}`);
      }
    }
  }
  if (typeof rules.errorsMinItems === 'number') {
    if (!Array.isArray(payload.errors) || payload.errors.length < rules.errorsMinItems) {
      throw new Error(`${label}: expected at least ${rules.errorsMinItems} errors.`);
    }
  }
  if (rules.stderrEmpty) assertStderrEmpty(result.stderr, label);
  return payload;
}

export async function verifyCliContracts({ root = repoRoot } = {}) {
  const contracts = JSON.parse(await fs.readFile(path.join(root, '.qa-ai/contracts/cli-contracts.v1.json'), 'utf8'));
  const errors = [];
  const workspaces = [];

  try {
    for (const scenario of contracts.scenarios || []) {
      let workspace;
      try {
        workspace = await prepareWorkspace(scenario.setup || 'golden-target');
        workspaces.push(workspace);

        const expectFailure = scenario.exitCode !== 0;
        const result = scenario.script
          ? runScript(workspace, scenario.script, scenario.command || [], { expectFailure })
          : runCli(workspace, scenario.command || [], { expectFailure });

        if (result.status !== scenario.exitCode) {
          errors.push(`${scenario.id}: expected exit ${scenario.exitCode}, got ${result.status}`);
          continue;
        }

        if (scenario.stdoutPattern) {
          const pattern = new RegExp(scenario.stdoutPattern, 'm');
          if (!pattern.test(String(result.stdout || '').trim())) {
            errors.push(`${scenario.id}: stdout did not match ${scenario.stdoutPattern}`);
          }
        }

        if (scenario.stderrEmpty) {
          try {
            assertStderrEmpty(result.stderr, scenario.id);
          } catch (error) {
            errors.push(`${scenario.id}: ${error.message}`);
          }
        }

        if (scenario.json) {
          try {
            assertJsonScenario(result, scenario.json, scenario.id);
          } catch (error) {
            errors.push(`${scenario.id}: ${error.message}`);
          }
        }
      } catch (error) {
        errors.push(`${scenario.id}: ${error.message}`);
      }
    }
  } finally {
    await Promise.all(workspaces.map((workspace) => fs.rm(workspace, { recursive: true, force: true })));
  }

  return { ok: errors.length === 0, errors, checked: contracts.scenarios?.length || 0 };
}

async function main() {
  const result = await verifyCliContracts();
  if (!result.ok) {
    console.error('CLI contract verification failed:\n');
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`CLI contract verification passed (${result.checked} scenarios).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
