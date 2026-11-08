import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { repoRoot, node } from './lib/ci-helpers.mjs';
import { waitForRegistryVisibility } from './lib/registry-visibility.mjs';
import { VALIDATE_CORE_STEPS } from './lib/validate-suite-commands.mjs';

const version = '1.0.0-rc.14';
const response = (tag = version) => ({
  status: 0,
  stdout: JSON.stringify({ version, 'dist-tags': { rc: tag } })
});

test('registry visibility retries missing version, stale tag and malformed JSON without real sleeps', async () => {
  const results = [
    { status: 1, stderr: 'E404 Not found' },
    { status: 0, stdout: 'not JSON' },
    response('1.0.0-rc.13'),
    response()
  ];
  const sleeps = [];
  const logs = [];
  const metadata = await waitForRegistryVisibility(version, 'rc', {
    query: () => results.shift(),
    sleep: async (ms) => sleeps.push(ms),
    log: (text) => logs.push(text)
  });
  assert.equal(metadata.version, version);
  assert.deepEqual(sleeps, [30000, 30000, 30000]);
  assert.equal(logs.length, 3);
  assert.match(logs[0], /E404/);
  assert.match(logs[1], /not JSON/);
  assert.match(logs[2], /rc=1.0.0-rc.13/);
});

test('registry exhaustion retains process errors, redacts secrets and never sleeps after the final attempt', async () => {
  const logs = [];
  const sleeps = [];
  const secret = `npm_${'x'.repeat(40)}`;
  await assert.rejects(
    waitForRegistryVisibility(version, 'rc', {
      attempts: 2,
      query: () => ({ status: null, error: new Error('ETIMEDOUT'), stderr: `token=${secret}` }),
      sleep: async (ms) => sleeps.push(ms),
      log: (text) => logs.push(text)
    }),
    (error) => {
      assert.match(error.message, /after 2 attempts.*status=null/s);
      assert.match(error.message, /ETIMEDOUT/);
      assert.ok(!error.message.includes(secret));
      return true;
    }
  );
  assert.equal(sleeps.length, 1);
  assert.equal(logs.length, 2);
  assert.ok(logs.every((text) => !text.includes(secret)));
});

test('visible version with nonzero exit status is not accepted', async () => {
  await assert.rejects(
    waitForRegistryVisibility(version, 'rc', {
      attempts: 1,
      query: () => ({ ...response(), status: 1 }),
      log: () => {}
    }),
    /status=1/
  );
});

test('registry retries remain bounded when version metadata never propagates', async () => {
  let queries = 0;
  let sleeps = 0;
  await assert.rejects(
    waitForRegistryVisibility(version, 'rc', {
      query: () => {
        queries += 1;
        return { status: 0, stdout: JSON.stringify({ version: '1.0.0-rc.13' }) };
      },
      sleep: async () => {
        sleeps += 1;
      },
      log: () => {}
    }),
    /after 20 attempts/
  );
  assert.equal(queries, 20);
  assert.equal(sleeps, 19);
});

test('traceability CLI resolves imports even when invoked outside the source repository', async () => {
  const result = spawnSync(node, [path.join(repoRoot, '.github/scripts/update-traceability.mjs'), '--help'], {
    cwd: os.tmpdir(),
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Usage:/);
});

test('traceability CLI updates metadata cells, preserves NFR content and supports dry-run', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-traceability-test-'));
  const script = path.join(repoRoot, '.github/scripts/update-traceability.mjs');
  const run = (args) => {
    const result = spawnSync(node, [script, ...args], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    return result;
  };
  try {
    const git = (args) => {
      const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      return result.stdout.trim();
    };
    git(['init']);
    git(['-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '--allow-empty', '-m', 'test: RF-101']);
    const sha = git(['rev-parse', 'HEAD']).slice(0, 7);
    const nfr = '\n## Non-functional traceability\n\nUnchanged NFR evidence.\n';
    const matrix = `# Matrix\n\n| RF | Feature File | Test Management Case ID | Last Validated | Validated By |\n| --- | --- | --- | --- | --- |\n| RF-101 | example.feature | C1 | old | old |\n${nfr}`;
    await fs.writeFile(path.join(root, 'matrix.md'), matrix);
    run(['--matrix-path', 'matrix.md', '--dry-run']);
    assert.equal(await fs.readFile(path.join(root, 'matrix.md'), 'utf8'), matrix);
    run(['--matrix-path', 'matrix.md']);
    const updated = await fs.readFile(path.join(root, 'matrix.md'), 'utf8');
    assert.match(updated, new RegExp(`\\| RF-101 \\| example.feature \\| C1 \\| [^|]+ \\| ${sha} \\|`));
    assert.ok(updated.endsWith(nfr));
    assert.ok(!updated.includes('| old |'));
    run(['--matrix-path', 'matrix.md']);
    assert.equal(await fs.readFile(path.join(root, 'matrix.md'), 'utf8'), updated);

    // Standard generated matrices do not yet have CI metadata columns.
    const compactMatrix =
      '# Matrix\n\n| RF | Feature File | Test Management Case ID |\n| --- | --- | --- |\n| RF-101 | example.feature | C1 |\n';
    await fs.writeFile(path.join(root, 'matrix.md'), compactMatrix + nfr);
    run(['--matrix-path', 'matrix.md']);
    const expanded = await fs.readFile(path.join(root, 'matrix.md'), 'utf8');
    assert.match(expanded, /\| Last Validated \| Validated By \|/);
    assert.match(expanded, new RegExp(`\\| C1 \\| [^|]+ \\| ${sha} \\|`));
    assert.ok(expanded.endsWith(nfr));

    await fs.writeFile(path.join(root, 'matrix.md'), '| RF |\n| --- |\n| RF-101 |\n');
    const malformed = spawnSync(node, [script, '--matrix-path', 'matrix.md'], { cwd: root, encoding: 'utf8' });
    assert.notEqual(malformed.status, 0);
    assert.match(malformed.stdout, /missing required column/);
    const missing = spawnSync(node, [script, '--matrix-path', 'missing.md'], { cwd: root, encoding: 'utf8' });
    assert.notEqual(missing.status, 0);
    assert.match(missing.stdout, /Traceability matrix not found/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('traceability workflow skips absent matrices, authenticates gh and never pushes main', async () => {
  const workflow = await fs.readFile(path.join(repoRoot, '.github/workflows/update-traceability.yml'), 'utf8');
  assert.match(workflow, /if \[ -f \.qa-ai\/output\/traceability-matrix\.md \]/);
  assert.match(workflow, /GH_TOKEN: \$\{\{ github.token \}\}/);
  assert.match(workflow, /if: steps.matrix.outputs.available == 'true'/);
  assert.match(workflow, /actions\/upload-artifact@/);
  assert.match(workflow, /include-hidden-files: true/);
  assert.doesNotMatch(workflow, /git push|contents: write/);
  assert.doesNotMatch(workflow, /--pr \$\{\{/);
  assert.ok(VALIDATE_CORE_STEPS.some((step) => step.script === 'test:post-release-workflows'));
});
