#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { redactValidatorDiagnostics } from '../lib/secret-patterns.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const hook = process.argv[2];

async function main() {
  if (process.env.QA_FLOWKIT_DISABLE_HOOKS === '1') return;
  if (!['post-edit', 'stop'].includes(hook)) throw new Error('Expected post-edit or stop hook.');
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
    if (Buffer.byteLength(input) > 1024 * 1024) throw new Error('Codex hook payload exceeds 1 MiB.');
  }
  const event = input.trim() ? JSON.parse(input) : {};
  // A stop hook may request only one continuation; never create an unbounded retry loop.
  if (hook === 'stop' && event.stop_hook_active) return;
  if (hook === 'post-edit') {
    const base = typeof event.cwd === 'string' ? event.cwd : root;
    const files = [];
    const toolInput = event.tool_input || {};
    for (const key of ['file_path', 'filePath', 'path']) {
      if (typeof toolInput[key] === 'string') files.push({ path: path.resolve(base, toolInput[key]) });
    }
    if (['apply_patch', 'Edit', 'Write'].includes(event.tool_name) && typeof toolInput.command === 'string') {
      for (const match of toolInput.command.matchAll(/^\*\*\* (?:Add File|Update File|Move to): (.+)\r?$/gm)) {
        files.push({ path: path.resolve(base, match[1].trim()) });
      }
    }
    event.tool_input = { files };
  }
  const script = hook === 'stop' ? 'stop-gate.mjs' : 'post-edit-validate.mjs';
  const result = spawnSync(process.execPath, [path.join(root, '.qa-ai/scripts/hooks', script)], {
    cwd: root,
    input: JSON.stringify(event),
    encoding: 'utf8',
    timeout: 25000,
    maxBuffer: 1024 * 1024
  });
  if (result.status !== 0) {
    const reason = redactValidatorDiagnostics(result.stderr || result.stdout || 'QA FlowKit hook validation failed.');
    // Codex Stop consumes a continuation decision, not Claude's exit-code-only convention.
    console.log(JSON.stringify({ decision: 'block', reason }));
  }
}

main().catch(() => {
  console.error('QA FlowKit Codex hook failed; run validate-target manually and inspect the hook configuration.');
  process.exitCode = 1;
});
