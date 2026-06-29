#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startRun } from '../../lib/harness-controller.mjs';
import { atomicWriteJson, withRunLock } from '../../lib/harness-run-store.mjs';
import { prepareRepo, sleep } from './_shared.mjs';

test('atomic write and exclusive lock', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-harness-lock-'));
  try {
    const filePath = path.join(cwd, 'state.json');
    await atomicWriteJson(filePath, { version: 1 });
    const content = JSON.parse(await fs.readFile(filePath, 'utf8'));
    assert.equal(content.version, 1);

    await fs.mkdir(path.join(cwd, '.qa-ai', 'state', 'runs', 'run-1'), { recursive: true });
    const result = await withRunLock(cwd, 'run-1', async () => 'locked');
    assert.equal(result, 'locked');
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('concurrent mutations serialize on run lock', async () => {
  const cwd = await prepareRepo('quick');
  try {
    const snapshot = await startRun(cwd);
    const order = [];
    const first = withRunLock(cwd, snapshot.runId, async () => {
      order.push('start1');
      await sleep(120);
      order.push('end1');
      return 'first';
    });
    await sleep(20);
    const second = withRunLock(cwd, snapshot.runId, async () => {
      order.push('start2');
      order.push('end2');
      return 'second';
    });
    await Promise.all([first, second]);
    assert.deepEqual(order, ['start1', 'end1', 'start2', 'end2']);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});
