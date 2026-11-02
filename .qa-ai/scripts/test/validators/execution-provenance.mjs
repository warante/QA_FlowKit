import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  beginExecutionProvenance,
  finishExecutionProvenance,
  validateExecutionProvenance
} from '../../lib/execution-provenance.mjs';
import { validateExecutionEvidence } from '../../lib/execution-evidence-validate.mjs';

const manifest = '.qa-ai/output/execution-provenance.json';
const configPath = '.qa-ai/qa-ai.config.yaml';
const passed = { ok: true, results: [{ id: 'api', status: 'passed' }] };

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', shell: false });
  assert.equal(result.status, 0, result.stderr);
}

async function fixture(t) {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-provenance-'));
  t.after(() => fs.rm(cwd, { recursive: true, force: true }));
  await fs.mkdir(path.join(cwd, '.qa-ai/output'), { recursive: true });
  await fs.writeFile(path.join(cwd, configPath), 'version: 1\n');
  git(cwd, 'init');
  git(cwd, 'add', '.');
  git(cwd, '-c', 'user.name=QA Test', '-c', 'user.email=qa@example.com', 'commit', '-m', 'initial');
  const config = {
    execution: { resultsPaths: ['results/*.xml'], provenance: { mode: 'strict', environment: 'ci', maxAgeHours: 24 } }
  };
  await fs.mkdir(path.join(cwd, 'results'));
  return { cwd, config };
}

async function record(cwd, config, result = passed) {
  const pending = await beginExecutionProvenance(cwd, config, { now: Date.now() - 1000 });
  await fs.writeFile(path.join(cwd, 'results/api.xml'), '<testsuite><testcase name="TC-001"/></testsuite>');
  const outcome = await finishExecutionProvenance(cwd, config, pending, result);
  return { pending, outcome };
}

test('provenance: binds passing results to commit, environment, config and hashes', async (t) => {
  const { cwd, config } = await fixture(t);
  const { outcome } = await record(cwd, config);
  assert.equal(outcome.ok, true, JSON.stringify(outcome));
  assert.deepEqual(await validateExecutionProvenance(cwd, config), { errors: [], warnings: [] });
  await assert.rejects(beginExecutionProvenance(cwd, config), /already exists/);
  await fs.writeFile(path.join(cwd, 'results/api.xml'), 'tampered');
  assert.match((await validateExecutionProvenance(cwd, config)).errors.join('\n'), /hashes differ/);
});

test('provenance: rejects changed commit, environment, config and dirty tracked or untracked sources', async (t) => {
  const { cwd, config } = await fixture(t);
  await record(cwd, config);
  assert.match(
    (
      await validateExecutionProvenance(cwd, {
        execution: { ...config.execution, provenance: { mode: 'strict', environment: 'production' } }
      })
    ).errors.join('\n'),
    /environment/
  );
  await fs.writeFile(path.join(cwd, 'source.mjs'), 'new source');
  assert.match((await validateExecutionProvenance(cwd, config)).errors.join('\n'), /clean/);
  git(cwd, 'add', 'source.mjs');
  assert.match((await validateExecutionProvenance(cwd, config)).errors.join('\n'), /clean/);
  git(cwd, '-c', 'user.name=QA Test', '-c', 'user.email=qa@example.com', 'commit', '-m', 'changed');
  assert.match((await validateExecutionProvenance(cwd, config)).errors.join('\n'), /different commit/);
  await fs.writeFile(path.join(cwd, configPath), 'version: 2\n');
  assert.match((await validateExecutionProvenance(cwd, config)).errors.join('\n'), /configuration/);
});

test('provenance: enforces age and timestamps, rejects interrupted and failed runs', async (t) => {
  const { cwd, config } = await fixture(t);
  const { pending } = await record(cwd, config);
  const file = path.join(cwd, manifest);
  const saved = JSON.parse(await fs.readFile(file, 'utf8'));
  const completed = Date.parse(saved.completedAt);
  assert.match(
    (await validateExecutionProvenance(cwd, config, { now: completed + 25 * 3600000 })).errors.join('\n'),
    /expired/
  );
  assert.match((await validateExecutionProvenance(cwd, config, { now: completed - 1000 })).errors.join('\n'), /future/);
  const running = await beginExecutionProvenance(cwd, config, { force: true });
  assert.equal(running.record.status, 'running');
  assert.match((await validateExecutionProvenance(cwd, config)).errors.join('\n'), /completed passing/);
  const failed = await finishExecutionProvenance(cwd, config, pending, {
    ok: false,
    results: [{ id: 'api', status: 'failed' }]
  });
  assert.equal(failed.ok, false);
  assert.match((await validateExecutionProvenance(cwd, config)).errors.join('\n'), /completed passing/);
});

test('provenance: stale, missing and additional evidence is rejected', async (t) => {
  const { cwd, config } = await fixture(t);
  await fs.writeFile(path.join(cwd, 'results/api.xml'), 'old');
  await fs.utimes(path.join(cwd, 'results/api.xml'), new Date(0), new Date(0));
  const pending = await beginExecutionProvenance(cwd, config);
  assert.equal((await finishExecutionProvenance(cwd, config, pending, passed)).ok, false);
  const rerun = await beginExecutionProvenance(cwd, config, { force: true, now: Date.now() - 1000 });
  await fs.writeFile(path.join(cwd, 'results/api.xml'), 'fresh');
  assert.equal((await finishExecutionProvenance(cwd, config, rerun, passed)).ok, true);
  await fs.writeFile(path.join(cwd, 'results/other.xml'), 'unexpected');
  assert.match((await validateExecutionProvenance(cwd, config)).errors.join('\n'), /paths or hashes/);
  const noResults = { execution: { resultsPaths: ['missing.xml'], provenance: { mode: 'strict' } } };
  assert.ok((await validateExecutionProvenance(cwd, noResults)).errors.length > 0);
});

test('provenance: off remains backwards-compatible; advisory warns; strict cannot be bypassed by allow-missing', async (t) => {
  const { cwd } = await fixture(t);
  assert.deepEqual(await validateExecutionProvenance(cwd, {}), { errors: [], warnings: [] });
  const advisory = await validateExecutionProvenance(cwd, { execution: { provenance: { mode: 'advisory' } } });
  assert.equal(advisory.errors.length, 0);
  assert.equal(advisory.warnings.length, 1);
  await fs.writeFile(path.join(cwd, configPath), 'execution:\n  provenance:\n    mode: strict\n');
  const strict = await validateExecutionEvidence(cwd, { allowMissing: true });
  assert.equal(strict.ok, false);
});

test('provenance: rejects traversal, malformed manifests and invalid policy', async (t) => {
  const { cwd, config } = await fixture(t);
  await assert.rejects(
    beginExecutionProvenance(cwd, {
      execution: { ...config.execution, provenance: { manifestPath: '../escape.json' } }
    })
  );
  await assert.rejects(beginExecutionProvenance(cwd, { execution: { provenance: { maxAgeHours: -1 } } }), /Invalid/);
  await fs.writeFile(path.join(cwd, manifest), '{bad');
  assert.ok((await validateExecutionProvenance(cwd, config)).errors.length > 0);
});

test('provenance: cannot omit required commands or duplicate outcomes', async (t) => {
  const { cwd, config } = await fixture(t);
  config.execution.commands = [{ id: 'api' }, { id: 'ui' }];
  assert.equal((await record(cwd, config)).outcome.ok, false);
  const pending = await beginExecutionProvenance(cwd, config, { force: true, now: Date.now() - 1000 });
  await fs.writeFile(path.join(cwd, 'results/api.xml'), 'new results');
  assert.equal(
    (
      await finishExecutionProvenance(cwd, config, pending, {
        ok: true,
        results: [...passed.results, ...passed.results]
      })
    ).ok,
    false
  );
});

test('execute: records no evidence on dry-run and invalidates old evidence before a failed command', async (t) => {
  const { cwd } = await fixture(t);
  const script = fileURLToPath(new URL('../../execute.mjs', import.meta.url));
  await fs.writeFile(
    path.join(cwd, configPath),
    [
      'execution:',
      '  commands:',
      '    - id: api',
      `      command: ${JSON.stringify(process.execPath)}`,
      '      args:',
      '        - -e',
      '        - process.exit(1)',
      '  resultsPaths:',
      '    - results/*.xml',
      '  provenance:',
      '    mode: strict'
    ].join('\n')
  );
  const invoke = (args) => spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8', timeout: 10000 });
  assert.equal(invoke(['--record-evidence', '--dry-run', '--json']).status, 0);
  await assert.rejects(fs.access(path.join(cwd, manifest)));
  const failed = invoke(['--record-evidence', '--json']);
  assert.equal(failed.status, 1, failed.stderr);
  assert.equal(JSON.parse(await fs.readFile(path.join(cwd, manifest), 'utf8')).status, 'failed');
  assert.equal(invoke(['--record-evidence', '--json']).status, 1);
  assert.equal(invoke(['--force', '--json']).status, 1);
});
