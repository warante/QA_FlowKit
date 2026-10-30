import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setupOpenCodePlugin, runOpenCodeCheck } from '../../lib/opencode-v2-plugin.mjs';
import { syncOpenCodePlugin } from '../../lib/native-agent-adapters.mjs';
import { copyModuleInstallation } from '../../lib/module-installation.mjs';
import { repoRoot, withTempWorkspace, runValidatorScript } from './_shared.mjs';

function context(directory) {
  const hooks = new Map();
  const notices = [];
  const disposed = [];
  const register = (domain) => async (name, handler) => {
    const key = `${domain}:${name}`;
    hooks.set(key, handler);
    return {
      dispose: async () => {
        disposed.push(key);
        hooks.delete(key);
      }
    };
  };
  return {
    hooks,
    notices,
    disposed,
    location: { directory },
    tool: { hook: register('tool') },
    session: {
      hook: register('session'),
      get: async () => ({ location: { directory } }),
      synthetic: async (input) => {
        notices.push(input);
      }
    }
  };
}

test('OpenCode V2: isolates sessions, redacts diagnostics, preserves metadata and bounds idle continuations', async () => {
  await withTempWorkspace('qa-opencode-hooks-', async (cwd) => {
    await fs.mkdir(path.join(cwd, '.qa-ai'), { recursive: true });
    await fs.writeFile(path.join(cwd, '.qa-ai/qa-ai.config.yaml'), 'version: 1');
    const ctx = context(cwd);
    const calls = [];
    const token = `ghp_${'a'.repeat(36)}`;
    const cleanup = await setupOpenCodePlugin(ctx, {
      runCheck: async (root, kind) => {
        calls.push({ root, kind });
        return { ok: false, diagnostic: `Invalid evidence ${token}` };
      }
    });
    const after = ctx.hooks.get('tool:execute.after');
    const event = {
      tool: 'write',
      sessionID: 'one',
      status: 'completed',
      result: { content: 'written', metadata: { existing: true } }
    };
    await after(event);
    assert.match(event.result.content, /FAILED/);
    assert.ok(!event.result.content.includes(token));
    assert.equal(event.result.metadata.existing, true);
    await after({ ...event, tool: 'read' });
    assert.equal(calls.length, 1);
    const idle = ctx.hooks.get('session:experimental.idle');
    await idle({ sessionID: 'one', background: [{}] });
    assert.equal(ctx.notices.length, 0);
    await Promise.all([idle({ sessionID: 'one' }), idle({ sessionID: 'one' })]);
    await idle({ sessionID: 'one' });
    assert.equal(ctx.notices.length, 1);
    await idle({ sessionID: 'two' });
    assert.equal(ctx.notices.length, 2);
    assert.ok(!JSON.stringify(ctx.notices).includes(token));
    await ctx.hooks.get('session:prompt')({ sessionID: 'one' });
    await idle({ sessionID: 'one' });
    assert.equal(ctx.notices.length, 3);
    ctx.session.get = async () => ({ location: { directory: path.dirname(cwd) } });
    await idle({ sessionID: 'outside' });
    assert.equal(ctx.notices.length, 3);
    await cleanup();
    assert.equal(ctx.disposed.length, 3);
    await idle({ sessionID: 'after-cleanup' });
    assert.equal(ctx.notices.length, 3);
  });
});

test('OpenCode V2: fixed runner passes a clean core install and fails malformed artifacts', async () => {
  await withTempWorkspace('qa-opencode-runner-', async (cwd) => {
    await copyModuleInstallation(path.join(repoRoot, '.qa-ai'), cwd, ['core', 'adapter-opencode']);
    const initialized = runValidatorScript('init.mjs', cwd, ['--no-adapters', '--no-interactive']);
    assert.equal(initialized.exitCode, 0, initialized.stdout + initialized.stderr);
    assert.equal((await runOpenCodeCheck(cwd)).ok, true);
    assert.equal((await runOpenCodeCheck(cwd, 'gate')).ok, true);
    await fs.writeFile(
      path.join(cwd, '.qa-ai/features/broken.feature'),
      'Feature: Broken\nScenario: missing tags\nGiven invalid'
    );
    assert.equal((await runOpenCodeCheck(cwd)).ok, false);
    await assert.rejects(runOpenCodeCheck(cwd, 'arbitrary-command'));
    const signal = globalThis.AbortSignal.abort();
    assert.equal((await runOpenCodeCheck(cwd, 'target', signal)).ok, false);
  });
});

test('OpenCode V2: opt-in generation preserves user files and refuses linked plugin targets', async () => {
  await withTempWorkspace('qa-opencode-install-', async (cwd) => {
    await copyModuleInstallation(path.join(repoRoot, '.qa-ai'), cwd, ['core', 'adapter-opencode']);
    await syncOpenCodePlugin(cwd);
    const entry = path.join(cwd, '.opencode/plugins/qa-flowkit/index.mjs');
    const original = await fs.readFile(entry, 'utf8');
    assert.match(original, /Plugin.define/);
    assert.match(original, /setupOpenCodePlugin/);
    await fs.writeFile(entry, '// user plugin');
    await syncOpenCodePlugin(cwd);
    assert.equal(await fs.readFile(entry, 'utf8'), '// user plugin');
    await syncOpenCodePlugin(cwd, true);
    assert.equal(await fs.readFile(entry, 'utf8'), original);
    await fs.rm(path.dirname(entry), { recursive: true, force: true });
    await fs.symlink(
      path.join(cwd, '.qa-ai/contracts'),
      path.dirname(entry),
      process.platform === 'win32' ? 'junction' : 'dir'
    );
    await assert.rejects(syncOpenCodePlugin(cwd, true), /symlink/);
  });
});

test('OpenCode V2: nested locations select their own framework and partial setup cleans earlier hooks', async () => {
  await withTempWorkspace('qa-opencode-lifecycle-', async (cwd) => {
    await fs.mkdir(path.join(cwd, '.qa-ai'), { recursive: true });
    await fs.mkdir(path.join(cwd, 'nested'), { recursive: true });
    await fs.writeFile(path.join(cwd, '.qa-ai/qa-ai.config.yaml'), 'version: 1');
    const ctx = context(path.join(cwd, 'nested'));
    let count = 0;
    const cleanup = await setupOpenCodePlugin(ctx, {
      runCheck: async () => {
        count++;
        return { ok: true };
      }
    });
    const after = ctx.hooks.get('tool:execute.after');
    const event = { tool: 'edit', sessionID: 'nested', status: 'completed', result: { content: 'ok' } };
    await after(event);
    assert.equal(count, 1);
    assert.equal(event.result.content, 'ok');
    await fs.mkdir(path.join(cwd, 'nested/.qa-ai'));
    await fs.writeFile(path.join(cwd, 'nested/.qa-ai/qa-ai.config.yaml'), 'version: 1');
    await after(event);
    assert.equal(count, 1); // A separately initialized nested project must not validate the outer project.
    await cleanup();
    const partial = context(cwd);
    partial.session.hook = async () => {
      throw new Error('unsupported hook');
    };
    await assert.rejects(setupOpenCodePlugin(partial), /unsupported hook/);
    assert.deepEqual(partial.disposed, ['tool:execute.after']);
  });
});

test('OpenCode V2: unloading cancels pending checks and prevents late feedback', async () => {
  await withTempWorkspace('qa-opencode-unload-', async (cwd) => {
    await fs.mkdir(path.join(cwd, '.qa-ai'));
    await fs.writeFile(path.join(cwd, '.qa-ai/qa-ai.config.yaml'), 'version: 1');
    const ctx = context(cwd);
    let release;
    let started;
    const ready = new Promise((resolve) => {
      started = resolve;
    });
    let signal;
    const cleanup = await setupOpenCodePlugin(ctx, {
      runCheck: async (_root, _kind, value) => {
        signal = value;
        started();
        return new Promise((resolve) => {
          release = resolve;
        });
      }
    });
    const event = { tool: 'write', sessionID: 'one', status: 'completed', result: { content: 'original' } };
    const pending = ctx.hooks.get('tool:execute.after')(event);
    await ready;
    await cleanup();
    assert.equal(signal.aborted, true);
    release({ ok: false, diagnostic: 'late error' });
    await pending;
    assert.equal(event.result.content, 'original');
    assert.deepEqual(ctx.notices, []);
  });
});
