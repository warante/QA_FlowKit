import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { repoRoot, node } from './lib/ci-helpers.mjs';
import { MUTATION_SUITES, mutationTestModules } from './lib/mutation-suites.mjs';
import { parseYaml } from '../../.qa-ai/scripts/lib/yaml.mjs';
import { VALIDATE_CORE_STEPS } from './lib/validate-suite-commands.mjs';

test('workflow shards preserve all configured mutation targets and use bounded, visible failures', async () => {
  const config = JSON.parse(await fs.readFile(path.join(repoRoot, 'stryker.config.json'), 'utf8'));
  const workflow = parseYaml(await fs.readFile(path.join(repoRoot, '.github/workflows/mutation.yml'), 'utf8'));
  const job = workflow.jobs['mutation-testing'];
  assert.deepEqual(new Set(job.strategy.matrix.target), new Set(Object.keys(MUTATION_SUITES)));
  assert.deepEqual(
    new Set(config.mutate),
    new Set(Object.keys(MUTATION_SUITES).map((target) => `.qa-ai/scripts/lib/${target}.mjs`))
  );
  assert.equal(config.commandRunner.command, 'node .github/scripts/run-mutation-tests.mjs');
  assert.equal(config.concurrency, 2);
  assert.equal(config.timeoutMS, 1000);
  assert.equal(config.timeoutFactor, 1.5);
  assert.ok(config.reporters.includes('json'));
  assert.ok(config.reporters.includes('progress-append-only'));
  assert.equal(job['timeout-minutes'], 35);
  assert.equal(job['continue-on-error'], undefined);
  assert.ok(job.steps.every((step) => step['continue-on-error'] !== true));
  assert.equal(job.strategy['fail-fast'], false);
  const runStep = job.steps.find((step) => step.name === 'Run mutation testing');
  assert.equal(runStep['timeout-minutes'], 30);
  assert.match(runStep.run, /set -euo pipefail/);
  assert.match(runStep.run, /--mutate "\.qa-ai\/scripts\/lib\/\$\{QA_FLOWKIT_MUTATION_TARGET\}\.mjs"/);
  const artifact = job.steps.find((step) => step.uses?.startsWith('actions/upload-artifact@'));
  assert.equal(artifact.if, 'always()');
  assert.match(artifact.with.name, /matrix.target/);
  assert.ok(VALIDATE_CORE_STEPS.some((step) => step.script === 'test:mutation-config'));
});

test('suite selection rejects unknown targets and default local runs include every selected test module', () => {
  assert.throws(() => mutationTestModules('../../outside'), /Unknown mutation target/);
  assert.deepEqual(new Set(mutationTestModules()), new Set(Object.keys(MUTATION_SUITES).flatMap(mutationTestModules)));
});

for (const target of Object.keys(MUTATION_SUITES)) {
  test(`focused baseline succeeds and actually executes tests: ${target}`, () => {
    const result = spawnSync(node, [path.join(repoRoot, '.github/scripts/run-mutation-tests.mjs')], {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 30000,
      env: { ...process.env, QA_FLOWKIT_MUTATION_TARGET: target }
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /(?:tests|# tests) [1-9]\d*/);
    assert.match(result.stdout, /(?:fail|# fail) 0/);
  });
}
