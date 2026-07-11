#!/usr/bin/env node
/**
 * E2E-05: update from oldest-supported-beta fixture while preserving config, artifacts and active run state.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  assertMissing,
  installAndConfigurePacked,
  installPackTarball,
  parseJsonStdout,
  repoRoot,
  resolvePackTarball,
  runCli
} from './lib/ci-helpers.mjs';
import { overlayOldestSupportedFixture } from './lib/migration-fixture.mjs';

async function sha256File(filePath) {
  const content = await fs.readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(repoRoot, '.qa-flowkit-update-migration-'));
  const packDir = path.join(tempRoot, 'pack');
  const npmCache = path.join(tempRoot, 'npm-cache');
  const targetRoot = path.join(tempRoot, 'target');

  try {
    await fs.mkdir(npmCache, { recursive: true });
    await fs.mkdir(targetRoot, { recursive: true });

    const { tarball } = await resolvePackTarball({ packDir, npmCache });
    installPackTarball(targetRoot, tarball, { npmCache });

    installAndConfigurePacked(targetRoot, ['--preset', 'manual-only', '--adapters', 'generic']);
    await overlayOldestSupportedFixture(targetRoot);

    const before = {
      config: await sha256File(path.join(targetRoot, 'qa-ai.config.yaml')),
      artifact: await sha256File(path.join(targetRoot, 'qa-ai-output', 'user-preserved-artifact.md')),
      feature: await sha256File(path.join(targetRoot, 'features', 'functional', 'RF-101-TC-001-login.feature')),
      profile: await sha256File(path.join(targetRoot, '.qa-ai', 'config-profiles', 'team-profile.yaml')),
      stateMarker: await sha256File(path.join(targetRoot, '.qa-ai', 'state', 'preserved-marker.json')),
      agents: await sha256File(path.join(targetRoot, 'AGENTS.md'))
    };

    runCli(targetRoot, ['run', 'start', '--rf', 'RF-101', '--json']);
    runCli(targetRoot, ['run', 'next', '--json']);
    const activePointerPath = path.join(targetRoot, '.qa-ai', 'state', 'runs', 'active.json');
    const activeBefore = await fs.readFile(activePointerPath, 'utf8');
    const activeRunId = JSON.parse(activeBefore).runId;
    const runSnapshotBefore = await sha256File(
      path.join(targetRoot, '.qa-ai', 'state', 'runs', activeRunId, 'run.json')
    );

    const dryRunPlan = parseJsonStdout(runCli(targetRoot, ['update', '--dry-run', '--json']), 'update dry-run');
    assert.equal(dryRunPlan.schemaVersion, 1);
    assert.ok(dryRunPlan.legacyConfigKeys.length > 0, 'expected legacy config keys in dry-run plan');
    assert.ok(dryRunPlan.preservedPaths.some((item) => item.includes('state')));

    runCli(targetRoot, ['update', '--skip-doctor', '--yes']);
    await assertMissing(path.join(targetRoot, '.qa-ai', 'obsolete-framework-marker.txt'), 'obsolete framework marker');
    assert.equal(await fs.readFile(activePointerPath, 'utf8'), activeBefore, 'active run pointer changed after update');
    assert.equal(
      await sha256File(path.join(targetRoot, '.qa-ai', 'state', 'runs', activeRunId, 'run.json')),
      runSnapshotBefore
    );

    for (const [label, hash] of Object.entries(before)) {
      if (label === 'config') continue;
      const currentPath =
        label === 'artifact'
          ? '.qa-ai/output/user-preserved-artifact.md'
          : label === 'feature'
            ? '.qa-ai/features/functional/RF-101-TC-001-login.feature'
            : label === 'profile'
              ? '.qa-ai/config-profiles/team-profile.yaml'
              : label === 'stateMarker'
                ? '.qa-ai/state/preserved-marker.json'
                : 'AGENTS.md';
      assert.equal(await sha256File(path.join(targetRoot, currentPath)), hash, `${label} changed after first update`);
    }

    await assertMissing(path.join(targetRoot, 'qa-ai.config.yaml'), 'legacy root config');
    await assertMissing(path.join(targetRoot, 'qa-ai-output'), 'legacy output root');
    await assertMissing(path.join(targetRoot, 'features'), 'legacy feature root');
    const configText = await fs.readFile(path.join(targetRoot, '.qa-ai', 'qa-ai.config.yaml'), 'utf8');
    assert.match(configText, /inferredAcceptanceCriteria:\s*require-approval/);
    assert.doesNotMatch(configText, /allowInferredAcceptanceCriteria/);
    runCli(targetRoot, ['validate-config']);

    const status = parseJsonStdout(runCli(targetRoot, ['run', 'status', '--json']), 'run status after update');
    assert.equal(status.active, true);
    assert.equal(status.runId, activeRunId);

    const modernPaths = {
      config: '.qa-ai/qa-ai.config.yaml',
      artifact: '.qa-ai/output/user-preserved-artifact.md',
      feature: '.qa-ai/features/functional/RF-101-TC-001-login.feature',
      profile: '.qa-ai/config-profiles/team-profile.yaml',
      stateMarker: '.qa-ai/state/preserved-marker.json',
      agents: 'AGENTS.md'
    };
    const afterFirst = Object.fromEntries(
      await Promise.all(
        Object.entries(modernPaths).map(async ([label, relativePath]) => [
          label,
          await sha256File(path.join(targetRoot, relativePath))
        ])
      )
    );
    runCli(targetRoot, ['update', '--skip-doctor']);
    for (const [label, hash] of Object.entries(afterFirst)) {
      assert.equal(
        await sha256File(path.join(targetRoot, modernPaths[label])),
        hash,
        `${label} changed after second update`
      );
    }

    console.log('Update migration validation passed (E2E-05).');
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
