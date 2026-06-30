#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { runValidatorScript, withTempWorkspace } from './_shared.mjs';

function asSpawnResult(result) {
  return { status: result.exitCode, stdout: result.stdout, stderr: result.stderr };
}

test('clean.mjs: dry-run reports would-delete for generated manifest entry', async () => {
  await withTempWorkspace('qa-clean-', async (tmp) => {
    const generatedDir = path.join(tmp, 'qa-ai-output');
    await fs.mkdir(generatedDir, { recursive: true });
    const generatedFile = path.join(generatedDir, 'qa-init-decisions.md');
    await fs.writeFile(generatedFile, '# Init decisions\n', 'utf8');

    await fs.mkdir(path.join(tmp, '.qa-ai', 'state'), { recursive: true });
    await fs.writeFile(
      path.join(tmp, '.qa-ai/state/init-manifest.json'),
      JSON.stringify(
        {
          version: 1,
          entries: [
            {
              type: 'file',
              category: 'generated',
              path: 'qa-ai-output/qa-init-decisions.md',
              sha256: '0000000000000000000000000000000000000000000000000000000000000000'
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );

    const res = asSpawnResult(runValidatorScript('clean.mjs', tmp, ['--generated', '--include-modified']));
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /WOULD DELETE FILE.*qa-ai-output\/qa-init-decisions\.md/i);
    assert.match(res.stdout, /No files were deleted/);
    assert.equal(
      await fs
        .stat(generatedFile)
        .then(() => true)
        .catch(() => false),
      true
    );
  });
});

test('clean.mjs: --force deletes generated file tracked in manifest', async () => {
  await withTempWorkspace('qa-clean-force-', async (tmp) => {
    const generatedDir = path.join(tmp, 'qa-ai-output');
    await fs.mkdir(generatedDir, { recursive: true });
    const generatedFile = path.join(generatedDir, 'qa-init-decisions.md');
    await fs.writeFile(generatedFile, '# Init decisions\n', 'utf8');

    await fs.mkdir(path.join(tmp, '.qa-ai', 'state'), { recursive: true });
    await fs.writeFile(
      path.join(tmp, '.qa-ai/state/init-manifest.json'),
      JSON.stringify(
        {
          version: 1,
          entries: [
            {
              type: 'file',
              category: 'generated',
              path: 'qa-ai-output/qa-init-decisions.md',
              sha256: '0000000000000000000000000000000000000000000000000000000000000000'
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );

    const res = asSpawnResult(
      runValidatorScript('clean.mjs', tmp, ['--generated', '--include-modified', '--force', '--prune-state'])
    );
    assert.equal(res.status, 0, res.stderr);
    assert.equal(
      await fs
        .stat(generatedFile)
        .then(() => true)
        .catch(() => false),
      false
    );
  });
});
