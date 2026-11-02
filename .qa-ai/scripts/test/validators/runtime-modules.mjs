import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  copyModuleInstallation,
  readModuleInstallation,
  normalizeModules,
  RUNTIME_MODULES
} from '../../lib/module-installation.mjs';
import { repoRoot, withTempWorkspace } from './_shared.mjs';

function cli(cwd, args, expected = 0) {
  const result = spawnSync(process.execPath, [path.join(repoRoot, 'bin/qa-flowkit.mjs'), ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 30000
  });
  assert.equal(result.status, expected, result.stdout + result.stderr);
  return result;
}
function script(cwd, name, args = [], expected = 0) {
  const result = spawnSync(process.execPath, [path.join(cwd, '.qa-ai/scripts', name), ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 30000
  });
  assert.equal(result.status, expected, result.stdout + result.stderr);
  return result;
}

test('runtime modules: core omits optional implementations without broken static library imports', async () => {
  await withTempWorkspace('qa-runtime-core-', async (cwd) => {
    const record = await copyModuleInstallation(path.join(repoRoot, '.qa-ai'), cwd, ['core']);
    assert.equal(record.version, 2);
    for (const file of [
      'scripts/lib/karate-validate.mjs',
      'scripts/lib/maestro-validate.mjs',
      'scripts/lib/apm-connectors/base.mjs',
      'scripts/export-report.mjs',
      'scripts/lib/pr-summary.mjs',
      'scripts/test-validators.mjs'
    ]) {
      await assert.rejects(fs.access(path.join(cwd, '.qa-ai', file)), { code: 'ENOENT' });
    }
    // Core may dynamically load optional implementations, but must never statically import them.
    for (const file of Object.keys(record.files).filter(
      (file) => file.startsWith('scripts/lib/') && file.endsWith('.mjs')
    )) {
      const content = await fs.readFile(path.join(cwd, '.qa-ai', file), 'utf8');
      for (const match of content.matchAll(/(?:from\s+|import\s*)['"](\.[^'"\n]+\.mjs)['"]/g)) {
        await fs.access(path.resolve(cwd, '.qa-ai', path.dirname(file), match[1]));
      }
    }
    script(cwd, 'init.mjs', ['--no-adapters', '--no-interactive']);
    cli(cwd, ['doctor']);
    cli(cwd, ['validate-target', '--allow-empty', '--allow-missing', '--no-strict-doctor', '--json']);
    assert.match(cli(cwd, ['metrics', '--json'], 1).stderr, /runtime-reporting/);
    cli(cwd, ['update', '--modules', 'runtime-reporting', '--skip-doctor']);
    cli(cwd, ['metrics', '--json']);
    cli(cwd, ['export-report', '--help']);
    cli(cwd, ['pr-summary', '--help']);
    cli(cwd, ['doctor']);
  });
});

test('runtime modules: configured Karate and Maestro fail closed until automation runtime is added', async () => {
  await withTempWorkspace('qa-runtime-automation-', async (cwd) => {
    await copyModuleInstallation(path.join(repoRoot, '.qa-ai'), cwd, ['core']);
    script(cwd, 'init.mjs', ['--no-adapters', '--no-interactive']);
    const configPath = path.join(cwd, '.qa-ai/qa-ai.config.yaml');
    const manual = await fs.readFile(configPath, 'utf8');
    await fs.writeFile(configPath, manual.replace('framework: none', 'framework: karate'));
    const missing = script(cwd, 'validate-karate-features.mjs', ['--allow-empty', '--json'], 1);
    assert.match(missing.stdout, /update --modules runtime-automation/);
    assert.doesNotMatch(missing.stderr, /ERR_MODULE_NOT_FOUND/);
    assert.match(script(cwd, 'doctor.mjs', [], 1).stdout, /configured runtime missing/);
    await fs.writeFile(
      configPath,
      'version: 1\nautomation:\n  mobile:\n    framework: maestro\n    flowsPath: .qa-ai/tests/maestro\n'
    );
    assert.match(
      script(cwd, 'validate-maestro-flows.mjs', ['--allow-empty', '--json'], 1).stdout,
      /runtime-automation/
    );
    await fs.writeFile(configPath, manual.replace('framework: none', 'framework: karate'));
    cli(cwd, ['update', '--modules', 'runtime-automation', '--skip-doctor']);
    script(cwd, 'validate-karate-features.mjs', ['--allow-empty', '--json']);
    await fs.writeFile(
      configPath,
      'version: 1\nautomation:\n  mobile:\n    framework: maestro\n    flowsPath: .qa-ai/tests/maestro\n'
    );
    script(cwd, 'validate-maestro-flows.mjs', ['--allow-empty', '--json']);
  });
});

test('runtime records: dependency closure and v1 upgrades preserve previously installed runtimes', async () => {
  assert.ok(normalizeModules('automation-presets').includes('runtime-automation'));
  assert.ok(RUNTIME_MODULES.every((name) => normalizeModules('runtime-development').includes(name)));
  await withTempWorkspace('qa-runtime-v1-', async (cwd) => {
    const record = await copyModuleInstallation(path.join(repoRoot, '.qa-ai'), cwd, ['core', ...RUNTIME_MODULES]);
    record.version = 1;
    record.modules = ['core'];
    const target = path.join(cwd, '.qa-ai/state/install-modules.json');
    await fs.writeFile(target, JSON.stringify(record));
    const migrated = await readModuleInstallation(cwd);
    assert.ok(RUNTIME_MODULES.every((name) => migrated.modules.includes(name)));
    cli(cwd, ['update', '--modules', 'adapter-codex', '--skip-doctor']);
    assert.equal((await readModuleInstallation(cwd)).version, 2);
    assert.ok((await readModuleInstallation(cwd)).modules.includes('runtime-reporting'));
    const invalid = await readModuleInstallation(cwd);
    invalid.modules = ['core', 'runtime-development'];
    await fs.writeFile(target, JSON.stringify(invalid));
    await assert.rejects(readModuleInstallation(cwd));
  });
});
