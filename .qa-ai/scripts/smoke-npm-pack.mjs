#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { COMPACT_CONFIG_PATH } from './lib/project-paths.mjs';
import { DEFAULT_FEATURE_PATH, QA_OUTPUT_DIR } from './lib/artifact-paths.mjs';
import { validatePackFileList } from './lib/npm-pack-allowlist.mjs';
import {
  assertExists,
  assertMissing,
  installPackTarball,
  repoRoot,
  resolvePackTarball,
  runCli
} from '../../.github/scripts/lib/ci-helpers.mjs';

async function assertIncludes(filePath, expected, label = filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  if (!content.includes(expected)) {
    throw new Error(`Expected ${label} to include: ${expected}`);
  }
}

async function validateCommandInteractionContract(packageRoot) {
  const protocolPath = path.join(packageRoot, '.qa-ai', 'workflows', 'command-interaction.md');
  await assertIncludes(protocolPath, 'Before emitting any user-facing text', 'command interaction protocol');
  await assertIncludes(protocolPath, 'interactive question tool', 'command interaction protocol');
  await assertIncludes(protocolPath, 'Other / Otro', 'command interaction protocol');

  const instruction =
    'Before any other action or user-facing text, read and follow `.qa-ai/workflows/command-interaction.md`.';
  for (const adapter of ['opencode', 'claude']) {
    const commandsDir = path.join(packageRoot, '.qa-ai', 'adapters', adapter, 'commands');
    const commandFiles = (await fs.readdir(commandsDir)).filter((name) => name.endsWith('.md'));
    if (commandFiles.length === 0) throw new Error(`Expected ${adapter} command templates.`);
    for (const commandFile of commandFiles) {
      await assertIncludes(path.join(commandsDir, commandFile), instruction, `${adapter}/${commandFile}`);
    }
  }

  const adapterContracts = [
    ['generic/AGENTS.md', '.qa-ai/workflows/command-interaction.md'],
    ['codex/README.md', 'request_user_input'],
    ['codex/prompts/implement-project.md', '.qa-ai/workflows/command-interaction.md'],
    ['gemini/GEMINI.md', 'ask_user'],
    ['cline/.clinerules', 'ask_followup_question'],
    ['cline/.cline/README.md', '.qa-ai/workflows/command-interaction.md'],
    ['continue/README.md', '.qa-ai/workflows/command-interaction.md'],
    ['aider/.aider.conf.yml', '.qa-ai/workflows/command-interaction.md'],
    ['aider/.aider/README.md', 'numbered options'],
    ['goose/recipes/qa-flowkit.yaml', '.qa-ai/workflows/command-interaction.md']
  ];
  for (const [relPath, expected] of adapterContracts) {
    await assertIncludes(
      path.join(packageRoot, '.qa-ai', 'adapters', relPath),
      expected,
      `${relPath} interaction contract`
    );
  }

  await assertIncludes(
    path.join(packageRoot, '.qa-ai', 'adapters', 'opencode', 'commands', 'qa-init.md'),
    "OpenCode's built-in `question` tool",
    'OpenCode qa-init selector contract'
  );
  await assertIncludes(
    path.join(packageRoot, '.qa-ai', 'adapters', 'opencode', 'commands', 'qa-add-tests.md'),
    "Use OpenCode's built-in `question` tool",
    'OpenCode qa-add-tests selector contract'
  );
  await assertIncludes(
    path.join(packageRoot, '.qa-ai', 'adapters', 'opencode', 'commands', 'qa-add-tests.md'),
    'requirements-normalization-agent.md',
    'OpenCode qa-add-tests NFR normalization contract'
  );
  await assertIncludes(
    path.join(packageRoot, '.qa-ai', 'adapters', 'opencode', 'commands', 'qa-add-tests.md'),
    'validate-test-coverage.mjs',
    'OpenCode qa-add-tests coverage validator contract'
  );
}

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(repoRoot, '.qa-flowkit-npm-smoke-'));
  const packDir = path.join(tempRoot, 'pack');
  const npmCache = path.join(tempRoot, 'npm-cache');
  let initTarget;
  let updateTarget;

  try {
    await validateCommandInteractionContract(repoRoot);
    await fs.mkdir(npmCache, { recursive: true });

    const { tarball, fromArtifact, packInfo } = await resolvePackTarball({ packDir, npmCache });
    if (!fromArtifact && packInfo) {
      validatePackFileList(packInfo.files);
    }

    initTarget = path.join(tempRoot, 'init-target');
    await fs.mkdir(initTarget, { recursive: true });
    installPackTarball(initTarget, tarball, { npmCache });
    await validateCommandInteractionContract(path.join(initTarget, 'node_modules', 'qa-flowkit'));
    runCli(initTarget, ['init', '--skip-doctor']);
    await assertExists(path.join(initTarget, '.qa-ai', 'scripts', 'init.mjs'), '.qa-ai framework');
    await assertExists(path.join(initTarget, COMPACT_CONFIG_PATH), 'generated config');
    await assertExists(path.join(initTarget, DEFAULT_FEATURE_PATH), 'features directory');
    await assertExists(path.join(initTarget, QA_OUTPUT_DIR), 'output directory');
    await assertExists(path.join(initTarget, 'AGENTS.md'), 'default generic adapter');
    await assertIncludes(
      path.join(initTarget, 'AGENTS.md'),
      '.qa-ai/workflows/command-interaction.md',
      'generated generic command interaction contract'
    );
    await assertMissing(path.join(initTarget, '.opencode'), 'undetected OpenCode adapter');
    runCli(initTarget, ['init', '--skip-doctor'], { expectFailure: true });
    runCli(initTarget, ['doctor']);
    runCli(initTarget, ['validate-target', '--allow-empty', '--allow-missing', '--no-strict-doctor']);

    const versionResult = runCli(initTarget, ['version']);
    if (!versionResult.stdout.trim()) throw new Error('qa-flowkit version produced no output.');
    const helpResult = runCli(initTarget, ['help', '--json']);
    if (!helpResult.stdout) throw new Error('qa-flowkit help produced no output.');
    runCli(initTarget, ['validate-config']);
    JSON.parse(runCli(initTarget, ['validate-config', '--json']).stdout);
    runCli(initTarget, ['unknown-command-xyzzy'], { expectFailure: true });
    runCli(initTarget, ['validate-features', '--allow-empty']);
    runCli(initTarget, ['validate-test-coverage', '--allow-empty', '--allow-missing']);
    runCli(initTarget, ['validate-active-specialists', '--allow-missing']);
    runCli(initTarget, ['run', 'start']);
    const statusBefore = runCli(initTarget, ['run', 'status', '--json']);
    JSON.parse(statusBefore.stdout);

    runCli(initTarget, ['run', 'next']);
    runCli(initTarget, ['run', 'check'], { expectFailure: true });
    runCli(initTarget, ['run', 'check'], { expectFailure: true });
    const blockedCheck = runCli(initTarget, ['run', 'check', '--json'], { expectFailure: true });
    const blockedPayload = JSON.parse(blockedCheck.stdout);
    if (!blockedPayload.retryable) throw new Error('Expected validation block to be retryable.');
    runCli(initTarget, ['run', 'retry']);
    await fs.writeFile(path.join(initTarget, QA_OUTPUT_DIR, 'requirement-analysis.md'), '# intake\n', 'utf8');
    runCli(initTarget, ['run', 'check']);

    updateTarget = path.join(tempRoot, 'update-target');
    await fs.mkdir(updateTarget, { recursive: true });
    installPackTarball(updateTarget, tarball, { npmCache });
    runCli(updateTarget, ['init', '--skip-doctor']);
    await fs.mkdir(path.join(updateTarget, '.qa-ai', 'state'), { recursive: true });
    await fs.mkdir(path.join(updateTarget, '.qa-ai', 'config-profiles'), { recursive: true });
    await fs.writeFile(path.join(updateTarget, '.qa-ai', 'state', 'keep.json'), '{}\n', 'utf8');
    await fs.writeFile(path.join(updateTarget, '.qa-ai', 'config-profiles', 'team.yaml'), 'version: 1\n', 'utf8');
    await fs.writeFile(path.join(updateTarget, '.qa-ai', 'obsolete.txt'), 'old\n', 'utf8');
    await fs.writeFile(path.join(updateTarget, QA_OUTPUT_DIR, 'user.md'), 'USER\n', 'utf8');
    runCli(updateTarget, ['run', 'start', '--rf', 'RF-UPDATE']);
    runCli(updateTarget, ['run', 'next']);
    const activePointer = path.join(updateTarget, '.qa-ai', 'state', 'runs', 'active.json');
    const activeBefore = await fs.readFile(activePointer, 'utf8');
    const runEntries = await fs.readdir(path.join(updateTarget, '.qa-ai', 'state', 'runs'), {
      withFileTypes: true
    });
    const runDirCount = runEntries.filter((entry) => entry.isDirectory()).length;
    if (runDirCount < 1) throw new Error('Expected at least one run directory before update.');

    runCli(updateTarget, ['update', '--skip-doctor']);
    const activeAfter = await fs.readFile(activePointer, 'utf8');
    if (activeBefore !== activeAfter) throw new Error('Active run pointer changed after update.');
    await assertExists(path.join(updateTarget, '.qa-ai', 'state', 'keep.json'), 'preserved state');
    await assertExists(path.join(updateTarget, '.qa-ai', 'config-profiles', 'team.yaml'), 'preserved config profile');
    await assertMissing(path.join(updateTarget, '.qa-ai', 'obsolete.txt'), 'obsolete framework file');
    await assertExists(path.join(updateTarget, QA_OUTPUT_DIR, 'user.md'), 'target output artifact');

    console.log('npm pack smoke tests passed.');
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
