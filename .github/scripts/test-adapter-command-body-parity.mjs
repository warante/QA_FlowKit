#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { SHARED_ADAPTER_COMMANDS } from '../../.qa-ai/scripts/lib/inventory-manifest.mjs';
import { repoRoot } from './lib/ci-helpers.mjs';

const HOST_VARIANTS = {
  claude: {
    QUESTION_TOOL: "Claude Code's interactive question tool",
    HOST_NAME: 'Claude Code',
    ADAPTER_OPTIONS: '`claude`, `claude,opencode`, `all` and `none`',
    ADAPTER_RECOMMENDATION: 'Recommend `claude,opencode` when the user wants both.'
  },
  opencode: {
    QUESTION_TOOL: "OpenCode's built-in `question` tool",
    HOST_NAME: 'OpenCode',
    ADAPTER_OPTIONS: '`opencode`, `opencode,claude`, `all` and `none`',
    ADAPTER_RECOMMENDATION: 'Recommend `opencode,claude` when the user wants both.'
  }
};

function renderTemplate(content, vars) {
  let rendered = content;
  for (const [key, value] of Object.entries(vars)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value);
  }
  return rendered;
}

test('shared adapter commands match generated host command bodies', async () => {
  const sharedDir = path.join(repoRoot, '.qa-ai', 'adapters', 'shared', 'commands');
  for (const host of ['claude', 'opencode']) {
    const hostDir = path.join(repoRoot, '.qa-ai', 'adapters', host, 'commands');
    for (const fileName of SHARED_ADAPTER_COMMANDS) {
      const template = await fs.readFile(path.join(sharedDir, fileName), 'utf8');
      const expected = renderTemplate(template, HOST_VARIANTS[host]);
      const actual = await fs.readFile(path.join(hostDir, fileName), 'utf8');
      assert.equal(actual, expected, `${host}/commands/${fileName} must match shared template rendering`);
    }
  }
});
