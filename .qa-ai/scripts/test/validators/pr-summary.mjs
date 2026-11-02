import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildPrSummary, formatPrSummary, parsePrChangedFiles, writePrSummary } from '../../lib/pr-summary.mjs';
import { runValidatorScript, withTempWorkspace } from './_shared.mjs';

const MATRIX = '.qa-ai/output/traceability-matrix.md';
const FEATURE = '.qa-ai/features/login.feature';
const MATRIX_TEXT = `| Requirement Source | RF | Feature File | Test Management Case ID | Automation File |
| --- | --- | --- | --- | --- |
| requirements/login.md | RF-101 | ${FEATURE} | TC-101 | tests/login.spec.mjs |
| requirements/other.md | RF-102 | .qa-ai/features/other.feature | TC-102 | tests/other.spec.mjs |
`;

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', shell: false });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

async function write(cwd, file, content) {
  await fs.mkdir(path.dirname(path.join(cwd, file)), { recursive: true });
  await fs.writeFile(path.join(cwd, file), content);
}

function commit(cwd, message = 'fixture') {
  git(cwd, 'add', '.');
  git(cwd, 'commit', '-m', message);
  return git(cwd, 'rev-parse', 'HEAD');
}

async function fixture(cwd, { matrix = true } = {}) {
  git(cwd, '-c', 'init.defaultBranch=main', 'init');
  git(cwd, 'config', 'user.name', 'QA Test');
  git(cwd, 'config', 'user.email', 'qa@example.com');
  await write(cwd, '.qa-ai/qa-ai.config.yaml', 'project:\n  interfaceLanguage: en\n');
  await write(cwd, FEATURE, 'Feature: Login\n  Scenario: Login\n    Given a user\n');
  await write(cwd, 'tests/login.spec.mjs', 'throw new Error("Must not execute tests");\n');
  await write(cwd, 'requirements/login.md', 'Login requirement');
  await write(cwd, 'src/login.mjs', 'export const enabled = false;');
  if (matrix) await write(cwd, MATRIX, MATRIX_TEXT);
  return commit(cwd);
}

test('PR summary: NUL-delimited parser preserves rename paths, Unicode, tabs and spaces', () => {
  const files = parsePrChangedFiles('R100\0old file.feature\0Español\tnew.feature\0M\0a.mjs\0D\0gone.md\0');
  assert.equal(files.length, 3);
  assert.deepEqual(
    files.find((file) => file.status === 'R100'),
    {
      status: 'R100',
      previousPath: 'old file.feature',
      path: 'Español\tnew.feature'
    }
  );
  assert.deepEqual(parsePrChangedFiles(''), []);
  for (const bad of ['M\0missing-terminator', 'Z\0file\0', 'R100\0old\0'])
    assert.throws(() => parsePrChangedFiles(bad));
});

test('PR summary: uses merge base, exact snapshot links and never guesses source coverage', async () => {
  await withTempWorkspace('qa-pr-scope-', async (cwd) => {
    const initial = await fixture(cwd);
    git(cwd, 'switch', '-c', 'feature');
    git(cwd, 'mv', FEATURE, '.qa-ai/features/renamed login.feature');
    await write(cwd, MATRIX, MATRIX_TEXT.replace(FEATURE, '.qa-ai/features/renamed login.feature'));
    await write(cwd, 'tests/login.spec.mjs', 'throw new Error("Still must not execute");\n');
    await write(cwd, 'src/login.mjs', 'export const enabled = true;');
    const headCommit = commit(cwd);
    git(cwd, 'switch', 'main');
    await write(cwd, 'base-only.md', 'Unrelated base change');
    commit(cwd);
    git(cwd, 'switch', 'feature');
    await write(cwd, 'local-only.md', 'Not committed');
    // Workspace matrix is deliberately wrong; only committed matrix snapshots may supply links.
    await write(cwd, MATRIX, MATRIX_TEXT.replaceAll('RF-101', 'RF-999'));
    const result = await buildPrSummary(cwd);
    assert.equal(result.comparison.mergeBase, initial);
    assert.equal(result.comparison.headCommit, headCommit);
    assert.ok(!result.files.some((file) => ['base-only.md', 'local-only.md'].includes(file.path)));
    assert.ok(result.files.some((file) => file.previousPath === FEATURE));
    assert.deepEqual(
      result.affectedRequirements.map((item) => item.rf),
      ['RF-101']
    );
    assert.deepEqual(result.affectedRequirements[0].reviewTestIds, ['TC-101']);
    assert.ok(result.affectedRequirements[0].evidence.some((item) => item.column === 'Automation File'));
    assert.ok(result.unmappedFiles.includes('src/login.mjs'));
    assert.ok(result.warnings.some((warning) => warning.code === 'working-tree-excluded'));
    assert.ok(result.warnings.some((warning) => warning.code === 'matrix-changed'));
    assert.deepEqual(result.verification, { testsExecuted: false, validationExecuted: false, coverageAssessed: false });
    assert.deepEqual(await buildPrSummary(cwd), result);
  });
});

test('PR summary: deleted tests retain historical evidence but are not recommended from removed rows', async () => {
  await withTempWorkspace('qa-pr-delete-', async (cwd) => {
    await fixture(cwd);
    git(cwd, 'switch', '-c', 'feature');
    git(cwd, 'rm', FEATURE);
    await write(
      cwd,
      MATRIX,
      MATRIX_TEXT.split('\n')
        .filter((line) => !line.includes('RF-101'))
        .join('\n')
    );
    commit(cwd);
    const report = await buildPrSummary(cwd);
    const requirement = report.affectedRequirements.find((item) => item.rf === 'RF-101');
    assert.ok(requirement.evidence.some((item) => item.linkedPath === FEATURE));
    assert.deepEqual(requirement.reviewTestIds, []);
  });
});

test('PR summary: missing matrices warn, malformed snapshots and invalid refs fail closed', async () => {
  await withTempWorkspace('qa-pr-missing-', async (cwd) => {
    await fixture(cwd, { matrix: false });
    git(cwd, 'switch', '-c', 'feature');
    await write(cwd, 'requirements/login.md', 'Changed');
    commit(cwd);
    let report = await buildPrSummary(cwd);
    assert.equal(report.warnings.filter((warning) => warning.code === 'matrix-missing').length, 2);
    assert.deepEqual(report.affectedRequirements, []);
    assert.ok(report.unmappedFiles.includes('requirements/login.md'));
    await assert.rejects(buildPrSummary(cwd, { base: '--output=bad' }), /Invalid comparison ref/);
    await assert.rejects(buildPrSummary(cwd, { base: 'missing-ref' }), /Git rev-parse failed/);
    await assert.rejects(buildPrSummary(cwd, { matrixPath: '../escape.md' }), /repository-relative/);
    await assert.rejects(buildPrSummary(path.join(cwd, '.qa-ai')), /repository root/);
    await write(cwd, MATRIX, 'Not a table');
    commit(cwd);
    await assert.rejects(buildPrSummary(cwd), /malformed/);
    report = await buildPrSummary(cwd, { head: 'main' });
    assert.equal(report.files.length, 0);
    assert.equal(report.warnings.filter((warning) => warning.code === 'matrix-missing').length, 1);
  });
});

test('PR summary: exact requirement paths link RFs; local config selects Spanish; text is escaped and redacted', async () => {
  await withTempWorkspace('qa-pr-language-', async (cwd) => {
    await fixture(cwd);
    git(cwd, 'switch', '-c', 'feature');
    await write(cwd, 'requirements/login.md', 'Changed');
    const token = `ghp_${'a'.repeat(36)}`;
    await write(cwd, MATRIX, MATRIX_TEXT.replaceAll('RF-101', token));
    commit(cwd);
    await write(cwd, '.qa-ai/qa-ai.config.yaml', 'project:\n  interfaceLanguage: es\n');
    const report = await buildPrSummary(cwd);
    assert.equal(report.language, 'es');
    assert.ok(
      report.affectedRequirements.some((item) =>
        item.evidence.some((evidence) => evidence.column === 'Requirement Source')
      )
    );
    assert.ok(!JSON.stringify(report).includes(token));
    report.unmappedFiles.push('<script>|`@team\ninjected', '[link](https://example.com)');
    const markdown = formatPrSummary(report);
    assert.match(markdown, /# Resumen de impacto para PR/);
    assert.match(markdown, /No se han ejecutado tests ni validadores/);
    assert.ok(!markdown.includes('<script>'));
    assert.ok(!markdown.includes('@team'));
    assert.ok(!markdown.includes('\ninjected'));
    assert.ok(!markdown.includes('[link]'));
    assert.match(markdown, /&lt;script&gt;/);
  });
});

test('PR summary CLI: pure JSON, safe opt-in output, overwrite refusal and usage errors', async () => {
  await withTempWorkspace('qa-pr-cli-', async (cwd) => {
    await fixture(cwd);
    const invoke = (args) => runValidatorScript('pr-summary.mjs', cwd, args);
    let result = invoke(['--json']);
    assert.equal(result.exitCode, 0, result.stderr || result.stdout);
    assert.equal(JSON.parse(result.stdout).files.length, 0);
    assert.equal(result.stderr, '');
    result = invoke(['--output', 'summary.md', '--json']);
    assert.equal(result.exitCode, 0, result.stdout);
    const content = await fs.readFile(path.join(cwd, 'summary.md'), 'utf8');
    assert.match(content, /Coverage was not assessed/);
    result = invoke(['--output', 'summary.md', '--json']);
    assert.equal(result.exitCode, 1);
    assert.equal(JSON.parse(result.stdout).ok, false);
    assert.equal(await fs.readFile(path.join(cwd, 'summary.md'), 'utf8'), content);
    assert.equal(invoke(['--output', 'summary.md', '--force', '--json']).exitCode, 0);
    for (const flags of [
      ['--force'],
      ['--output'],
      ['--base'],
      ['--unknown'],
      ['extra'],
      ['--output', '../escape.md']
    ]) {
      const invalid = invoke([...flags, '--json']);
      assert.equal(invalid.exitCode, 1, JSON.stringify(flags));
      assert.equal(JSON.parse(invalid.stdout).ok, false);
    }
    assert.match(invoke(['--help']).stdout, /merge-base/);
    await assert.rejects(writePrSummary(cwd, 'missing/summary.md', 'text'));
  });
});

test('PR summary output: refuses symlinks and ancestor escapes without creating external files', async () => {
  await withTempWorkspace('qa-pr-safety-', async (root) => {
    const cwd = path.join(root, 'repo');
    const external = path.join(root, 'external');
    await fs.mkdir(cwd);
    await fs.mkdir(external);
    await fs.symlink(external, path.join(cwd, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(writePrSummary(cwd, 'linked/summary.md', 'text', { force: true }));
    await assert.rejects(fs.access(path.join(external, 'summary.md')));
    await assert.rejects(writePrSummary(cwd, 'linked/nested/summary.md', 'text', { force: true }));
    await assert.rejects(fs.access(path.join(external, 'nested')));
  });
});

test('PR summary: disconnected histories fail rather than falling back to a two-dot diff', async () => {
  await withTempWorkspace('qa-pr-history-', async (cwd) => {
    await fixture(cwd);
    git(cwd, 'checkout', '--orphan', 'unrelated');
    // Existing files remain in this isolated fixture's index, but the new commit has no parent.
    commit(cwd, 'unrelated root');
    await assert.rejects(buildPrSummary(cwd), /Git merge-base failed/);
  });
});
