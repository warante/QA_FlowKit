import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSubprocessScript } from '../../lib/subprocess-script.mjs';

/** Repository root (four levels up from test/validators/). */
export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

/** `.qa-ai/scripts` directory (two levels up from test/validators/). */
export const scriptsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function assertIncludes(haystack, needle) {
  assert.ok(
    haystack.some((item) => item.includes(needle)),
    `Expected an error containing: ${needle}\nActual errors:\n${haystack.join('\n')}`
  );
}

export async function withTempWorkspace(prefix, fn) {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  try {
    return await fn(tmp);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

export function runValidatorScript(scriptName, cwd, extraArgs = []) {
  const script = path.join(scriptsRoot, scriptName);
  return runSubprocessScript(script, extraArgs, { cwd });
}
