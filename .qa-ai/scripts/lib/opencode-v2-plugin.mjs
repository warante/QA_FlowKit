import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { redactValidatorDiagnostics } from './secret-patterns.mjs';

const MUTATING_TOOLS = new Set(['write', 'edit', 'apply_patch', 'patch', 'shell']);

function within(root, directory) {
  const relative = path.relative(root, directory);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function frameworkRoot(directory) {
  let current = await fs.realpath(directory);
  for (;;) {
    try {
      await fs.access(path.join(current, '.qa-ai/qa-ai.config.yaml'));
      return current;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    try {
      await fs.access(path.join(current, '.git'));
      return null;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/** Fixed scripts only: no shell, user-supplied commands or interpolation. */
export async function runOpenCodeCheck(root, kind = 'target', signal) {
  if (!['target', 'gate'].includes(kind)) throw new Error('Unknown QA FlowKit check.');
  const script = kind === 'gate' ? 'hooks/stop-gate.mjs' : 'validate-target.mjs';
  const args =
    kind === 'gate' ? [] : ['--allow-empty', '--allow-missing', '--no-strict-doctor', '--scan-secrets', '--json'];
  return new Promise((resolve) => {
    const child = execFile(
      process.execPath,
      [path.join(root, '.qa-ai/scripts', script), ...args],
      {
        cwd: root,
        encoding: 'utf8',
        shell: false,
        timeout: 30000,
        maxBuffer: 1024 * 1024,
        signal
      },
      (error, stdout, stderr) => {
        const ok = !error;
        const diagnostic = ok
          ? 'QA FlowKit validation passed.'
          : redactValidatorDiagnostics(
              stderr || stdout || 'QA FlowKit validation could not finish; run validate-target manually.'
            );
        resolve({ ok, diagnostic });
      }
    );
    child.stdin.end('{}');
  });
}

/** V2 2.2.4 context contract; no host changes until setup is explicitly installed. */
export async function setupOpenCodePlugin(ctx, { runCheck = runOpenCodeCheck } = {}) {
  const root = await frameworkRoot(ctx.location.directory);
  if (!root) throw new Error('Initialize QA FlowKit before enabling the OpenCode V2 plugin.');
  if (typeof ctx.tool?.hook !== 'function' || typeof ctx.session?.hook !== 'function') {
    throw new Error('QA FlowKit requires OpenCode V2 plugin hooks (SDK 2.2.4 compatible).');
  }
  const registrations = [];
  const sessions = new Map();
  const controller = new globalThis.AbortController();
  let checkQueue = Promise.resolve();
  let disposed = false;
  async function belongs(sessionID) {
    try {
      const session = await ctx.session.get({ sessionID });
      const directory = await fs.realpath(session.location.directory);
      return within(root, directory) && (await frameworkRoot(directory)) === root;
    } catch {
      // SDK/filesystem errors can include credentials, paths or server response bodies.
      throw new Error('QA FlowKit could not verify the session location; validation was not performed.');
    }
  }
  function check(sessionID, kind) {
    const pending = checkQueue.then(async () => {
      if (disposed || !(await belongs(sessionID)) || disposed) return null;
      let result;
      try {
        result = await runCheck(root, kind, controller.signal);
      } catch {
        result = { ok: false, diagnostic: 'QA FlowKit validation could not finish; verify manually.' };
      }
      if (disposed || !(await belongs(sessionID)) || disposed) return null;
      return result;
    });
    // Serialize project checks, without letting one failed lookup poison the queue.
    checkQueue = pending.catch(() => {});
    return pending;
  }
  try {
    registrations.push(
      await ctx.tool.hook('execute.after', async (event) => {
        if (event.status !== 'completed' || !MUTATING_TOOLS.has(event.tool)) return;
        const result = await check(event.sessionID, 'target');
        if (!result || result.ok) return;
        event.result = {
          ...event.result,
          content: `QA FlowKit validation FAILED after ${event.tool}. The operation already happened; repair it before claiming completion.\n${redactValidatorDiagnostics(result.diagnostic)}`,
          metadata: { ...event.result?.metadata, qaFlowKitValidation: 'failed' }
        };
      })
    );
    registrations.push(
      await ctx.session.hook('prompt', (event) => {
        const state = sessions.get(event.sessionID);
        if (state) {
          state.generation = Symbol();
          state.continued = false;
        }
      })
    );
    // Experimental in the published 2.2.4 SDK. One continuation per admitted user prompt.
    registrations.push(
      await ctx.session.hook('experimental.idle', async (event) => {
        if (disposed || event.background?.length) return;
        let state = sessions.get(event.sessionID);
        if (!state) {
          // Install before any await so prompts arriving during location lookup invalidate this event too.
          state = { generation: Symbol(), continued: false, inFlight: false };
          sessions.set(event.sessionID, state);
        }
        if (state.continued || state.inFlight) return;
        state.inFlight = true;
        const generation = state.generation;
        try {
          const result = await check(event.sessionID, 'gate');
          if (!result) {
            sessions.delete(event.sessionID);
            return;
          }
          if (result.ok || generation !== state.generation) return;
          state.continued = true;
          try {
            await ctx.session.synthetic({
              sessionID: event.sessionID,
              text: `QA FlowKit requires verification before completion. Run the applicable validators and qa-flowkit run check; do not approve gates automatically.\n${redactValidatorDiagnostics(result.diagnostic)}`
            });
          } catch {
            throw new Error('QA FlowKit could not deliver verification feedback; verify manually.');
          }
        } finally {
          state.inFlight = false;
        }
      })
    );
  } catch (error) {
    disposed = true;
    controller.abort();
    await Promise.allSettled(registrations.map((registration) => registration.dispose()));
    throw error;
  }
  return async () => {
    disposed = true;
    controller.abort();
    sessions.clear();
    await Promise.allSettled(registrations.map((registration) => registration.dispose()));
  };
}
