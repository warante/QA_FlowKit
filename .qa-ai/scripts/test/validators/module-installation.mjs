import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  INSTALL_MODULES,
  MODULE_RECORD,
  normalizeModules,
  moduleOption,
  moduleForPath,
  availableModuleAdapters,
  copyModuleInstallation,
  readModuleInstallation,
  expandedModules
} from '../../lib/module-installation.mjs';
import { repoRoot, withTempWorkspace } from './_shared.mjs';

const source = path.join(repoRoot, '.qa-ai');

function cli(cwd, args, { failure = false } = {}) {
  const result = spawnSync(process.execPath, [path.join(repoRoot, 'bin/qa-flowkit.mjs'), ...args], {
    cwd,
    encoding: 'utf8',
    shell: false,
    timeout: 30000
  });
  assert.equal(result.status, failure ? 1 : 0, result.stdout + result.stderr);
  return result;
}

function script(cwd, name, args = [], failure = false) {
  const result = spawnSync(process.execPath, [path.join(cwd, '.qa-ai/scripts', name), ...args], {
    cwd,
    encoding: 'utf8',
    shell: false,
    timeout: 30000
  });
  assert.equal(result.status, failure ? 1 : 0, result.stdout + result.stderr);
  return result;
}

async function exists(cwd, name) {
  try {
    await fs.access(path.join(cwd, name));
    return true;
  } catch {
    return false;
  }
}

test('module selection: core is implicit, all is explicit, updates are additive and unknown inputs fail', () => {
  assert.deepEqual(normalizeModules('adapter-codex'), ['core', 'adapter-codex']);
  assert.deepEqual(normalizeModules('core,adapter-codex,core'), ['core', 'adapter-codex']);
  assert.deepEqual(normalizeModules('all'), INSTALL_MODULES);
  assert.deepEqual(normalizeModules(), INSTALL_MODULES);
  assert.deepEqual(moduleOption(['--no-adapters', '--modules=core']), ['core']);
  assert.deepEqual(moduleOption(['--modules', 'core']), ['core']);
  assert.equal(moduleOption([]), undefined);
  for (const args of [['--modules'], ['--modules', '--force'], ['--modules='], ['--modules=core', '--modules=core']])
    assert.throws(() => moduleOption(args));
  for (const value of ['', 'core,all', '../escape', 'unknown']) assert.throws(() => normalizeModules(value));
  assert.equal(moduleForPath('.qa-ai/adapters/codex/README.md'), 'adapter-codex');
  assert.equal(moduleForPath('.qa-ai/presets/karate-full.yaml'), 'automation-presets');
  assert.equal(moduleForPath('templates/karate-config.template.js'), 'automation-presets');
  assert.equal(moduleForPath('.qa-ai/scripts/lib/karate-validate.mjs'), 'core');
  assert.deepEqual(availableModuleAdapters(['core']), ['generic']);
  assert.deepEqual(expandedModules({ modules: ['core', 'adapter-codex'] }, ['core']), ['core', 'adapter-codex']);
  assert.deepEqual(expandedModules(null, ['core']), INSTALL_MODULES);
});

test('modular CLI install: copies fewer assets, keeps every validator and supports default manual init and target checks', async () => {
  await withTempWorkspace('qa-modules-core-', async (cwd) => {
    cli(cwd, ['init', '--modules', 'unknown'], { failure: true });
    assert.equal(await exists(cwd, '.qa-ai'), false);
    cli(cwd, ['init', '--modules', 'core', '--no-adapters']);
    const record = await readModuleInstallation(cwd);
    assert.deepEqual(record.modules, ['core']);
    assert.equal(await exists(cwd, '.qa-ai/adapters/codex'), false);
    assert.equal(await exists(cwd, '.qa-ai/adapters/opencode'), false);
    assert.equal(await exists(cwd, '.qa-ai/presets/playwright-full.yaml'), false);
    assert.equal(await exists(cwd, '.qa-ai/scripts/validate-karate-features.mjs'), true);
    assert.equal(await exists(cwd, '.qa-ai/qa-ai.config.yaml'), false);
    script(cwd, 'init.mjs', ['--no-adapters', '--no-interactive']);
    script(cwd, 'doctor.mjs');
    const validated = script(cwd, 'validate-target.mjs', [
      '--allow-empty',
      '--allow-missing',
      '--no-strict-doctor',
      '--json'
    ]);
    assert.equal(JSON.parse(validated.stdout).ok, true);
    script(cwd, 'sync-agent-adapters.mjs', ['--adapters', 'all']);
    script(cwd, 'bootstrap-agent-adapters.mjs');
    assert.equal(await exists(cwd, '.qa-ai/adapters/claude'), false);
    assert.equal(await exists(cwd, '.qa-ai/adapters/opencode'), false);
    script(cwd, 'sync-agent-adapters.mjs', ['--adapters', 'codex'], true);
    script(cwd, 'bootstrap-agent-adapters.mjs', ['--agents', 'opencode'], true);
    script(cwd, 'init.mjs', ['--preset', 'karate-full', '--force', '--no-adapters'], true);
    script(cwd, 'init.mjs', ['--with-karate-config', '--force', '--no-adapters'], true);
    await fs.rm(path.join(cwd, '.qa-ai/scripts/validate-karate-features.mjs'));
    script(cwd, 'doctor.mjs', [], true); // Omitted optional assets do not excuse missing core validators.
  });
});

test('modular update: dry-run preserves selection, expansion keeps user artifacts and no pruning occurs', async () => {
  await withTempWorkspace('qa-modules-update-', async (cwd) => {
    cli(cwd, ['--modules', 'core,adapter-codex', '--no-adapters']);
    script(cwd, 'init.mjs', ['--no-adapters']);
    const config = await fs.readFile(path.join(cwd, '.qa-ai/qa-ai.config.yaml'), 'utf8');
    await fs.writeFile(path.join(cwd, '.qa-ai/output/human.md'), 'Human evidence');
    await fs.writeFile(path.join(cwd, '.qa-ai/custom.txt'), 'User-owned file');
    const before = await fs.readFile(path.join(cwd, MODULE_RECORD), 'utf8');
    const plan = JSON.parse(cli(cwd, ['update', '--modules', 'automation-presets', '--dry-run', '--json']).stdout);
    assert.equal(plan.installationMode, 'modular');
    assert.ok(plan.modules.includes('adapter-codex'));
    assert.ok(plan.modules.includes('automation-presets'));
    assert.deepEqual(plan.destructiveChanges, []);
    assert.equal(await fs.readFile(path.join(cwd, MODULE_RECORD), 'utf8'), before);
    cli(cwd, ['update', '--modules', 'automation-presets', '--skip-doctor']);
    let record = await readModuleInstallation(cwd);
    assert.deepEqual(record.modules, ['core', 'automation-presets', 'adapter-codex']);
    assert.equal(await exists(cwd, '.qa-ai/presets/karate-full.yaml'), true);
    assert.equal(await fs.readFile(path.join(cwd, '.qa-ai/qa-ai.config.yaml'), 'utf8'), config);
    assert.equal(await fs.readFile(path.join(cwd, '.qa-ai/output/human.md'), 'utf8'), 'Human evidence');
    assert.equal(await fs.readFile(path.join(cwd, '.qa-ai/custom.txt'), 'utf8'), 'User-owned file');
    cli(cwd, ['update', '--modules', 'core', '--skip-doctor']);
    record = await readModuleInstallation(cwd);
    assert.ok(record.modules.includes('adapter-codex'));
    assert.equal(await exists(cwd, '.qa-ai/adapters/opencode'), false);
    script(cwd, 'doctor.mjs');
  });
});

test('modular update: local edits and collisions fail preflight; --force is scoped to selected payloads', async () => {
  await withTempWorkspace('qa-modules-edits-', async (cwd) => {
    const installed = await copyModuleInstallation(source, cwd, ['core']);
    const scriptPath = path.join(cwd, '.qa-ai/scripts/qa-help.mjs');
    await fs.writeFile(scriptPath, '// user-edited');
    await assert.rejects(
      copyModuleInstallation(source, cwd, ['core', 'adapter-codex'], { installed }),
      /Local file would be overwritten/
    );
    assert.equal(await fs.readFile(scriptPath, 'utf8'), '// user-edited');
    assert.equal(await exists(cwd, '.qa-ai/adapters/codex'), false);
    await copyModuleInstallation(source, cwd, ['core'], { installed, force: true });
    assert.notEqual(await fs.readFile(scriptPath, 'utf8'), '// user-edited');
    assert.equal(await exists(cwd, '.qa-ai/adapters/codex'), false);
  });
});

test('module records: absence means legacy full; corruption, traversal and symlinks fail closed', async () => {
  await withTempWorkspace('qa-modules-record-', async (cwd) => {
    assert.equal(await readModuleInstallation(cwd), null);
    await fs.mkdir(path.join(cwd, '.qa-ai/state'), { recursive: true });
    for (const invalid of [
      '{bad',
      JSON.stringify({ version: 1, modules: ['core'], files: { '../escape': 'a'.repeat(64) } }),
      JSON.stringify({ version: 1, modules: ['fake'], files: {} })
    ]) {
      await fs.writeFile(path.join(cwd, MODULE_RECORD), invalid);
      await assert.rejects(readModuleInstallation(cwd));
    }
    await assert.rejects(copyModuleInstallation(source, cwd, ['core']), /record already exists/);
    assert.equal(await exists(cwd, '.qa-ai/scripts/init.mjs'), false);
    await fs.rm(path.join(cwd, MODULE_RECORD));
    await fs.symlink(
      path.join(repoRoot, '.qa-ai/contracts'),
      path.join(cwd, '.qa-ai/presets'),
      process.platform === 'win32' ? 'junction' : 'dir'
    );
    await assert.rejects(copyModuleInstallation(source, cwd, ['core']), /symbolic links|repository/);
  });
});
