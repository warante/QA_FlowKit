#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mergeClaudeSettings } from './lib/claude-settings.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const postEditScript = path.join(repoRoot, '.qa-ai/scripts/hooks/post-edit-validate.mjs');
const stopGateScript = path.join(repoRoot, '.qa-ai/scripts/hooks/stop-gate.mjs');

function runHook(scriptPath, cwd, payload, env = {}) {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd,
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, ...env },
    timeout: 5000
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr
  };
}

async function createTempRepo() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-ai-hooks-test-'));

  // Copy .qa-ai directory recursively from repoRoot
  await fs.cp(path.join(repoRoot, '.qa-ai'), path.join(tempDir, '.qa-ai'), { recursive: true });

  // Re-create state/runs and output/features directories in tempDir
  await fs.mkdir(path.join(tempDir, '.qa-ai/state/runs'), { recursive: true });
  await fs.mkdir(path.join(tempDir, 'qa-ai-output'), { recursive: true });
  await fs.mkdir(path.join(tempDir, 'features/functional'), { recursive: true });

  // Write basic config
  const configContent = [
    'project:',
    '  qaTrack: quick',
    '  interfaceLanguage: en',
    'gherkin:',
    '  featurePath: features',
    'traceability:',
    '  matrixPath: qa-ai-output/traceability-matrix.md'
  ].join('\n');
  await fs.writeFile(path.join(tempDir, 'qa-ai.config.yaml'), configContent, 'utf8');

  return tempDir;
}

test('Hooks: --self-test exit codes', () => {
  const postEditRes = spawnSync(process.execPath, [postEditScript, '--self-test'], { encoding: 'utf8' });
  assert.equal(postEditRes.status, 0);
  assert.match(postEditRes.stdout, /self-test passed/);

  const stopGateRes = spawnSync(process.execPath, [stopGateScript, '--self-test'], { encoding: 'utf8' });
  assert.equal(stopGateRes.status, 0);
  assert.match(stopGateRes.stdout, /self-test passed/);
});

test('Hooks: QA_FLOWKIT_DISABLE_HOOKS=1 overrides', async () => {
  const tempDir = await createTempRepo();
  try {
    const res = runHook(
      postEditScript,
      tempDir,
      { tool_input: { file_path: 'features/functional/invalid.feature' } },
      { QA_FLOWKIT_DISABLE_HOOKS: '1' }
    );
    assert.equal(res.status, 0);

    const resStop = runHook(stopGateScript, tempDir, { stop_hook_active: false }, { QA_FLOWKIT_DISABLE_HOOKS: '1' });
    assert.equal(resStop.status, 0);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('Hooks: post-edit-validate.mjs blocks on invalid feature write', async () => {
  const tempDir = await createTempRepo();
  try {
    // Write invalid feature file
    const invalidFeaturePath = path.join(tempDir, 'features/functional/invalid.feature');
    await fs.writeFile(invalidFeaturePath, 'Feature: Missing tags\n', 'utf8');

    const res = runHook(postEditScript, tempDir, {
      tool_name: 'Write',
      tool_input: { file_path: 'features/functional/invalid.feature' }
    });

    assert.equal(res.status, 2);
    assert.match(res.stderr, /FAILED/);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('Hooks: post-edit-validate.mjs passes on valid feature write', async () => {
  const tempDir = await createTempRepo();
  try {
    // Write valid feature file
    const validFeaturePath = path.join(tempDir, 'features/functional/RF-101-valid.feature');
    await fs.writeFile(
      validFeaturePath,
      [
        '@priority:high @type:functional @manual:false @rf:RF-101 @id:TC-001',
        'Feature: Login',
        '  Acceptance Criteria:',
        '    - Success',
        '  Scenario: RF-101 TC-001 Succeed',
        '    Given x',
        '    When y',
        '    Then z'
      ].join('\n'),
      'utf8'
    );

    const res = runHook(postEditScript, tempDir, {
      tool_name: 'Write',
      tool_input: { file_path: 'features/functional/RF-101-valid.feature' }
    });

    if (res.status !== 0) {
      console.log('STDOUT:', res.stdout);
      console.log('STDERR:', res.stderr);
    }
    assert.equal(res.status, 0);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('Hooks: post-edit-validate.mjs ignores non-repo paths', async () => {
  const tempDir = await createTempRepo();
  try {
    const res = runHook(postEditScript, tempDir, {
      tool_name: 'Write',
      tool_input: { file_path: '../outside.feature' }
    });
    assert.equal(res.status, 0);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('Hooks: stop-gate.mjs exits 0 when no active run exists', async () => {
  const tempDir = await createTempRepo();
  try {
    const res = runHook(stopGateScript, tempDir, {});
    assert.equal(res.status, 0);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('Hooks: stop-gate.mjs exit 0 on stop_hook_active', async () => {
  const tempDir = await createTempRepo();
  try {
    const res = runHook(stopGateScript, tempDir, { stop_hook_active: true });
    assert.equal(res.status, 0);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('Hooks: stop-gate.mjs checks outputs and blocks when check is needed', async () => {
  const tempDir = await createTempRepo();
  try {
    // Set active run ID
    const runId = 'RF-101-20260617000000';
    await fs.writeFile(path.join(tempDir, '.qa-ai/state/runs/active.json'), JSON.stringify({ runId }), 'utf8');

    // Create run snapshot with intake active
    const snapshot = {
      schemaVersion: 1,
      runId,
      track: 'quick',
      status: 'active',
      activePhaseId: 'intake',
      phases: {
        intake: {
          status: 'active',
          attempts: 0,
          outputs: []
        }
      }
    };
    await fs.mkdir(path.join(tempDir, '.qa-ai/state/runs', runId), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, '.qa-ai/state/runs', runId, 'run.json'),
      JSON.stringify(snapshot, null, 2),
      'utf8'
    );

    // Write expected output file for intake
    await fs.writeFile(path.join(tempDir, 'qa-ai-output/requirement-analysis.md'), '# Requirements Analysis\n', 'utf8');

    // Runs stop gate - should exit 2 because output exists but check has not been run
    const res = runHook(stopGateScript, tempDir, {});
    assert.equal(res.status, 2);
    assert.match(res.stderr, /run check/);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('Hooks: stop-gate.mjs passes when check is complete and hashes match', async () => {
  const tempDir = await createTempRepo();
  try {
    // Set active run ID
    const runId = 'RF-101-20260617000000';
    await fs.writeFile(path.join(tempDir, '.qa-ai/state/runs/active.json'), JSON.stringify({ runId }), 'utf8');

    // Write output file
    const outputPath = path.join(tempDir, 'qa-ai-output/requirement-analysis.md');
    await fs.writeFile(outputPath, '# Requirements Analysis\n', 'utf8');

    // Compute simple hash for verification (SHA-256 not strictly required for test mock as long as it matches)
    const crypto = await import('node:crypto');
    const hash = crypto.createHash('sha256').update('# Requirements Analysis\n').digest('hex');

    // Create run snapshot with completed intake phase matching hashes
    const snapshot = {
      schemaVersion: 1,
      runId,
      track: 'quick',
      status: 'active',
      activePhaseId: 'intake',
      phases: {
        intake: {
          status: 'completed',
          attempts: 1,
          outputs: [{ path: 'qa-ai-output/requirement-analysis.md', sha256: hash }]
        }
      }
    };
    await fs.mkdir(path.join(tempDir, '.qa-ai/state/runs', runId), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, '.qa-ai/state/runs', runId, 'run.json'),
      JSON.stringify(snapshot, null, 2),
      'utf8'
    );

    const res = runHook(stopGateScript, tempDir, {});
    assert.equal(res.status, 0);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('Claude Settings: mergeClaudeSettings on clean repo', async () => {
  const tempDir = await createTempRepo();
  try {
    const entry = await mergeClaudeSettings(tempDir);
    assert.ok(entry);
    assert.equal(entry.path, '.claude/settings.json');

    const settingsPath = path.join(tempDir, '.claude/settings.json');
    const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
    assert.ok(settings.hooks);
    assert.ok(settings.hooks.PostToolUse);
    assert.ok(settings.hooks.Stop);

    const postEditHook = settings.hooks.PostToolUse[0].hooks[0];
    assert.match(postEditHook.command, /post-edit-validate.mjs/);
    assert.equal(postEditHook.timeout, 30000);

    const stopHook = settings.hooks.Stop[0].hooks[0];
    assert.match(stopHook.command, /stop-gate.mjs/);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('Claude Settings: mergeClaudeSettings is idempotent', async () => {
  const tempDir = await createTempRepo();
  try {
    const entry1 = await mergeClaudeSettings(tempDir);
    assert.ok(entry1);

    const entry2 = await mergeClaudeSettings(tempDir);
    assert.equal(entry2, null); // should skip

    const settingsPath = path.join(tempDir, '.claude/settings.json');
    const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
    assert.equal(settings.hooks.PostToolUse.length, 1);
    assert.equal(settings.hooks.Stop.length, 1);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('Claude Settings: mergeClaudeSettings preserves existing user hooks', async () => {
  const tempDir = await createTempRepo();
  try {
    const settingsPath = path.join(tempDir, '.claude/settings.json');
    await fs.mkdir(path.dirname(settingsPath), { recursive: true });

    const initialSettings = {
      hooks: {
        PostToolUse: [
          {
            matcher: 'Write',
            hooks: [
              {
                type: 'command',
                command: 'echo "hello"'
              }
            ]
          }
        ],
        Stop: [
          {
            hooks: [
              {
                type: 'command',
                command: 'echo "stop"'
              }
            ]
          }
        ]
      }
    };
    await fs.writeFile(settingsPath, JSON.stringify(initialSettings, null, 2), 'utf8');

    const entry = await mergeClaudeSettings(tempDir);
    assert.ok(entry);

    const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
    assert.equal(settings.hooks.PostToolUse.length, 2);
    assert.equal(settings.hooks.Stop.length, 2);

    assert.equal(settings.hooks.PostToolUse[0].hooks[0].command, 'echo "hello"');
    assert.match(settings.hooks.PostToolUse[1].hooks[0].command, /post-edit-validate.mjs/);

    assert.equal(settings.hooks.Stop[0].hooks[0].command, 'echo "stop"');
    assert.match(settings.hooks.Stop[1].hooks[0].command, /stop-gate.mjs/);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
