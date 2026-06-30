#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { MINIMAL_ENGLISH_FEATURE } from '../fixtures/gherkin-samples.mjs';
import { runValidatorScript, withTempWorkspace } from './_shared.mjs';

function asSpawnResult(result) {
  return { status: result.exitCode, stdout: result.stdout, stderr: result.stderr };
}

test('organize-features.mjs: moves root feature into functional subfolder', async () => {
  await withTempWorkspace('qa-organize-', async (tmp) => {
    await fs.mkdir(path.join(tmp, 'features'), { recursive: true });
    const source = path.join(tmp, 'features', 'RF-101-TC-001-login.feature');
    const feature = MINIMAL_ENGLISH_FEATURE.replace('@manual:true', '@manual:false');
    await fs.writeFile(source, feature, 'utf8');

    const res = asSpawnResult(runValidatorScript('organize-features.mjs', tmp, ['--path', 'features']));
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /\[MOVE\].*features\/functional\//);

    const target = path.join(tmp, 'features', 'functional', 'RF-101-TC-001-login.feature');
    assert.equal(
      await fs
        .stat(target)
        .then(() => true)
        .catch(() => false),
      true
    );
    assert.equal(
      await fs
        .stat(source)
        .then(() => true)
        .catch(() => false),
      false
    );
  });
});

test('organize-features.mjs: --dry-run does not move files', async () => {
  await withTempWorkspace('qa-organize-dry-', async (tmp) => {
    await fs.mkdir(path.join(tmp, 'features'), { recursive: true });
    const source = path.join(tmp, 'features', 'RF-101-TC-001-login.feature');
    await fs.writeFile(source, MINIMAL_ENGLISH_FEATURE, 'utf8');

    const res = asSpawnResult(runValidatorScript('organize-features.mjs', tmp, ['--path', 'features', '--dry-run']));
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /\[DRY-RUN\]/);
    assert.equal(
      await fs
        .stat(source)
        .then(() => true)
        .catch(() => false),
      true
    );
  });
});
