import fs from 'node:fs/promises';
import path from 'node:path';
import { repoRoot } from './ci-helpers.mjs';

export const MIGRATION_FIXTURE_MARKER = 'QA_FLOWKIT_MIGRATION_FIXTURE_MARKER';
export const oldestSupportedFixtureRoot = path.join(repoRoot, 'test', 'fixtures', 'migration', 'oldest-supported-beta');

export async function copyFixtureTree(relativePath, targetRoot, fixtureRoot = oldestSupportedFixtureRoot) {
  const source = path.join(fixtureRoot, relativePath);
  const target = path.join(targetRoot, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const stat = await fs.stat(source);
  if (stat.isDirectory()) {
    await fs.cp(source, target, { recursive: true, force: true });
  } else {
    await fs.copyFile(source, target);
  }
}

export async function overlayOldestSupportedFixture(targetRoot, fixtureRoot = oldestSupportedFixtureRoot) {
  const manifest = JSON.parse(await fs.readFile(path.join(fixtureRoot, 'manifest.v1.json'), 'utf8'));
  for (const relativePath of manifest.paths) {
    await copyFixtureTree(relativePath, targetRoot, fixtureRoot);
  }

  const agentsPath = path.join(targetRoot, 'AGENTS.md');
  try {
    await fs.access(agentsPath);
    const agents = await fs.readFile(agentsPath, 'utf8');
    if (!agents.includes(MIGRATION_FIXTURE_MARKER)) {
      await fs.writeFile(agentsPath, `${agents.trimEnd()}\n\n<!-- ${MIGRATION_FIXTURE_MARKER} -->\n`, 'utf8');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  await fs.writeFile(path.join(targetRoot, '.qa-ai', 'obsolete-framework-marker.txt'), 'remove-on-update\n', 'utf8');
}
