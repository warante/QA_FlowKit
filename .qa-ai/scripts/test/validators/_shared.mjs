import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
