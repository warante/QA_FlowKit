#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseSimpleYaml, readText } from './lib/utils.mjs';

const sourceRoot = process.cwd();
const node = process.execPath;

function run(cwd, args, { expectFailure = false } = {}) {
  const result = spawnSync(node, args, {
    cwd,
    encoding: 'utf8',
    shell: false
  });
  const failed = result.status !== 0;
  if (expectFailure ? !failed : failed) {
    throw new Error([
      `Command ${expectFailure ? 'succeeded unexpectedly' : 'failed'}: node ${args.join(' ')}`,
      result.stdout,
      result.stderr
    ].filter(Boolean).join('\n'));
  }
  return result;
}

async function copyFramework(targetRoot) {
  await fs.cp(path.join(sourceRoot, '.qa-ai'), path.join(targetRoot, '.qa-ai'), {
    recursive: true,
    force: false
  });
}

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-ai-starter-smoke-'));
  let unsafeRoot = null;
  try {
    await copyFramework(tempRoot);

    run(tempRoot, [
      '.qa-ai/scripts/init.mjs',
      '--preset', 'webdriverio-playwright-api',
      '--interface-language', 'en',
      '--gherkin-language', 'en',
      '--ui-framework', 'webdriverio',
      '--api-framework', 'playwright-api',
      '--adapters', 'generic'
    ]);

    const config = parseSimpleYaml(await readText(path.join(tempRoot, 'qa-ai.config.yaml')));
    if (config.automation.ui.specsPath !== 'tests/wdio/specs') {
      throw new Error(`Expected preset UI path tests/wdio/specs, got ${config.automation.ui.specsPath}`);
    }
    if (config.automation.api.specsPath !== 'tests/api/specs') {
      throw new Error(`Expected preset API path tests/api/specs, got ${config.automation.api.specsPath}`);
    }

    const activePath = path.join(tempRoot, '.qa-ai/agents/specialists/active.md');
    await fs.writeFile(activePath, 'USER EDIT\n', 'utf8');
    run(tempRoot, [
      '.qa-ai/scripts/init.mjs',
      '--preset', 'webdriverio-playwright-api',
      '--interface-language', 'en',
      '--gherkin-language', 'en',
      '--adapters', 'generic'
    ]);
    const activeContent = await readText(activePath);
    if (activeContent !== 'USER EDIT\n') {
      throw new Error('active.md was overwritten without --force.');
    }

    unsafeRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-ai-starter-unsafe-'));
    await copyFramework(unsafeRoot);
    run(unsafeRoot, [
      '.qa-ai/scripts/init.mjs',
      '--preset', 'manual-only',
      '--set', 'traceability.matrixPath=../traceability.md',
      '--no-adapters'
    ], { expectFailure: true });

    console.log('Smoke tests passed.');
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
    if (unsafeRoot) await fs.rm(unsafeRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
