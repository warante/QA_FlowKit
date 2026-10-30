import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { parseYaml } from '../../lib/yaml.mjs';
import { copyDirSafe, copyFileSafe, writeFileSafe } from '../../lib/utils.mjs';
import { syncCodexHooks, syncNativeSkill } from '../../lib/native-agent-adapters.mjs';
import { readModuleInstallation } from '../../lib/module-installation.mjs';
import { runCustomValidator } from '../../lib/custom-validators.mjs';
import { repoRoot, withTempWorkspace } from './_shared.mjs';

test('security: YAML mapping keys are own data properties, not prototype setters', () => {
  for (const yaml of [
    '__proto__:\n  injected: true\nregular: ok',
    'items:\n  - __proto__:\n      injected: true\n    regular: ok'
  ]) {
    const parsed = parseYaml(yaml);
    const mapping = parsed.items ? parsed.items[0] : parsed;
    assert.equal(Object.getPrototypeOf(mapping), Object.prototype);
    assert.equal(mapping.injected, undefined);
    assert.equal(Object.hasOwn(mapping, '__proto__'), true);
    assert.equal(mapping.__proto__.injected, true);
    assert.match(JSON.stringify(mapping), /__proto__/);
  }
  assert.equal({}.injected, undefined);
});

test('security: a final empty YAML key terminates and consistently resolves to null', () => {
  // Isolate the regression so a parser loop fails on timeout instead of hanging the test runner.
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      "import {parseYaml} from './.qa-ai/scripts/lib/yaml.mjs'; console.log(JSON.stringify(parseYaml('truncated:')));"
    ],
    { cwd: repoRoot, encoding: 'utf8', timeout: 5000 }
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { truncated: null });
  assert.deepEqual(parseYaml('parent:\n  child:\n# eof'), { parent: { child: null } });
  assert.deepEqual(parseYaml('items:\n  - empty:\n  - final:'), { items: [{ empty: null }, { final: null }] });
});

test('security: concurrent safe writes and copies never overwrite an existing winner', async () => {
  await withTempWorkspace('qa-exclusive-write-', async (cwd) => {
    const target = path.join(cwd, 'written.txt');
    const attempts = await Promise.all(Array.from({ length: 20 }, (_, index) => writeFileSafe(target, String(index))));
    assert.equal(attempts.filter((result) => result.written).length, 1);
    const winner = await fs.readFile(target, 'utf8');
    await writeFileSafe(target, 'replacement');
    assert.equal(await fs.readFile(target, 'utf8'), winner);
    const source = path.join(cwd, 'source.txt');
    await fs.writeFile(source, 'source');
    const copies = await Promise.all(
      Array.from({ length: 20 }, () => copyFileSafe(source, path.join(cwd, 'copied.txt')))
    );
    assert.equal(copies.filter((result) => result.copied).length, 1);
    await copyFileSafe(source, target);
    assert.equal(await fs.readFile(target, 'utf8'), winner);
  });
});

test('security: adapter and module destinations reject junctions even with force or absent metadata', async () => {
  await withTempWorkspace('qa-linked-adapters-', async (cwd) => {
    const repo = path.join(cwd, 'repo');
    const external = path.join(cwd, 'external');
    await fs.mkdir(repo);
    await fs.mkdir(external);
    assert.deepEqual(await syncNativeSkill(repo, '__proto__'), []);
    assert.deepEqual(await syncNativeSkill(repo, 'constructor'), []);
    await fs.mkdir(path.join(repo, '.qa-ai/state'), { recursive: true });
    await fs.mkdir(path.join(repo, '.qa-ai/adapters/shared/skills/qa-flowkit'), { recursive: true });
    await fs.writeFile(path.join(repo, '.qa-ai/adapters/shared/skills/qa-flowkit/SKILL.md'), 'template');
    const linkType = process.platform === 'win32' ? 'junction' : 'dir';
    for (const directory of ['.codex', '.agents', '.opencode']) {
      await fs.symlink(external, path.join(repo, directory), linkType);
    }
    await assert.rejects(syncCodexHooks(repo, true), /symbolic|repository/);
    await assert.rejects(syncNativeSkill(repo, 'codex', true), /symbolic|repository/);
    await assert.rejects(
      copyDirSafe(path.join(repo, '.qa-ai/adapters/shared/skills'), path.join(repo, '.opencode'), { force: true }),
      /symbolic|repository/
    );
    await fs.rmdir(path.join(repo, '.qa-ai/state'));
    await fs.symlink(external, path.join(repo, '.qa-ai/state'), linkType);
    await assert.rejects(readModuleInstallation(repo), /symbolic|repository/);
    assert.deepEqual(await fs.readdir(external), []);
  });
});

test('security: recursive copy link protection also applies to relative destination paths', async () => {
  await withTempWorkspace('qa-relative-copy-', async (cwd) => {
    await fs.mkdir(path.join(cwd, 'source'));
    await fs.mkdir(path.join(cwd, 'external'));
    await fs.writeFile(path.join(cwd, 'source/template.txt'), 'template');
    await fs.symlink(
      path.join(cwd, 'external'),
      path.join(cwd, 'linked'),
      process.platform === 'win32' ? 'junction' : 'dir'
    );
    const helper = pathToFileURL(path.join(repoRoot, '.qa-ai/scripts/lib/utils.mjs')).href;
    const script = `import {copyDirSafe} from ${JSON.stringify(helper)}; try { await copyDirSafe('source', 'linked', {force:true}); process.exitCode=2; } catch(error) { if(!/symbolic|repository/.test(error.message)) throw error; }`;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd,
      encoding: 'utf8',
      timeout: 5000
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(await fs.readdir(path.join(cwd, 'external')), []);
  });
});

test('security: v1 metadata cannot claim runtime modules that only exist in v2', async () => {
  await withTempWorkspace('qa-invalid-v1-', async (cwd) => {
    await fs.mkdir(path.join(cwd, '.qa-ai/state'), { recursive: true });
    await fs.writeFile(
      path.join(cwd, '.qa-ai/state/install-modules.json'),
      JSON.stringify({
        version: 1,
        modules: ['core', 'runtime-reporting'],
        files: { 'scripts/init.mjs': 'a'.repeat(64) }
      })
    );
    await assert.rejects(readModuleInstallation(cwd), /Invalid module/);
  });
});

test('security: custom validator findings tolerate malformed entries and redact structured output', async () => {
  await withTempWorkspace('qa-custom-findings-', async (cwd) => {
    const token = `ghp_${'c'.repeat(36)}`;
    await fs.writeFile(
      path.join(cwd, 'validator.mjs'),
      `console.log(JSON.stringify(${JSON.stringify({ findings: [null, 'invalid', [], { message: token, file: token, line: -1, severity: 'arbitrary' }] })})); process.exitCode=1;`
    );
    const result = runCustomValidator(cwd, { id: 'review-check', script: 'validator.mjs', blocking: true });
    assert.equal(result.ok, false);
    assert.equal(result.findings.length, 1);
    assert.ok(!JSON.stringify(result).includes(token));
    assert.equal(result.findings[0].severity, 'error');
    assert.equal(result.findings[0].line, undefined);
  });
});

test('security: nested malformed finding fields cannot trigger object coercion and path errors are redacted', async () => {
  await withTempWorkspace('qa-custom-coercion-', async (cwd) => {
    const token = `ghp_${'d'.repeat(36)}`;
    const payload = {
      findings: [{ message: { toString: 'not callable' }, file: { toString: 'not callable' }, severity: 'info' }]
    };
    await fs.writeFile(
      path.join(cwd, 'validator.mjs'),
      `console.log(JSON.stringify(${JSON.stringify(payload)})); process.exitCode=1;`
    );
    const result = runCustomValidator(cwd, { id: 'review-check', script: 'validator.mjs', blocking: true });
    assert.equal(result.ok, false);
    assert.equal(result.findings[0].file, '');
    assert.match(result.findings[0].message, /without a text message/);
    assert.equal(result.findings[0].severity, 'info');
    const unsafe = runCustomValidator(cwd, { id: 'review-check', script: `../${token}.mjs`, blocking: true });
    assert.equal(unsafe.ok, false);
    assert.ok(!JSON.stringify(unsafe).includes(token));
  });
});

test('security: a stalled custom validator fails closed within its process timeout', async () => {
  await withTempWorkspace('qa-custom-timeout-', async (cwd) => {
    await fs.writeFile(path.join(cwd, 'stalled.mjs'), 'setInterval(() => {}, 1000);');
    const result = runCustomValidator(cwd, { id: 'stalled-check', script: 'stalled.mjs', blocking: true });
    assert.equal(result.ok, false);
    assert.equal(result.exitCode, 1);
    assert.match(result.diagnostics, /process error or timeout/);
    assert.equal(result.findings[0].severity, 'error');
  });
});
