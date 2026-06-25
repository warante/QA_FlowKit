#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const manifestPath = path.join(repoRoot, 'docs', 'qa-ai', 'adapter-support.v1.json');
const docsPath = path.join(repoRoot, 'docs', 'qa-ai', 'agent-compatibility.md');
const packagePath = path.join(repoRoot, 'package.json');
const adapterRoot = path.join(repoRoot, '.qa-ai', 'adapters');

const allowedLevels = new Set(['template-verified', 'cli-smoke-verified', 'host-e2e-verified']);
const expectedAdapters = ['generic', 'claude', 'codex', 'opencode', 'cline', 'continue', 'aider', 'goose', 'gemini'];
const sharedGuidancePattern = /\.qa-ai\/workflows\/command-interaction\.md|command-interaction\.md/;

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function pathExists(relativePath) {
  try {
    await fs.stat(path.join(repoRoot, relativePath));
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function filesUnder(directory) {
  const files = [];

  async function visit(current) {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(absolutePath);
      else files.push(absolutePath);
    }
  }

  await visit(directory);
  return files;
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

async function main() {
  const errors = [];
  const manifest = await readJson(manifestPath);
  const packageJson = await readJson(packagePath);
  const docs = await fs.readFile(docsPath, 'utf8');

  assert(manifest.schemaVersion === 1, 'adapter support manifest schemaVersion must be 1', errors);
  assert(
    manifest.qaFlowKitVersion === packageJson.version,
    'adapter support manifest version must match package.json',
    errors
  );
  assert(
    /^\d{4}-\d{2}-\d{2}$/.test(manifest.generatedAt || ''),
    'adapter support generatedAt must be YYYY-MM-DD',
    errors
  );

  for (const level of allowedLevels) {
    assert(manifest.supportLevels?.[level], `support level is missing description: ${level}`, errors);
  }

  const templateDirs = (await fs.readdir(adapterRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert(
    JSON.stringify(templateDirs) === JSON.stringify([...expectedAdapters].sort()),
    `adapter template directories drifted: expected ${expectedAdapters.join(', ')}, found ${templateDirs.join(', ')}`,
    errors
  );

  const adapters = Array.isArray(manifest.adapters) ? manifest.adapters : [];
  const ids = adapters.map((adapter) => adapter.id).sort();
  assert(
    JSON.stringify(ids) === JSON.stringify([...expectedAdapters].sort()),
    `adapter support manifest must cover exactly: ${expectedAdapters.join(', ')}`,
    errors
  );

  for (const adapter of adapters) {
    assert(allowedLevels.has(adapter.level), `${adapter.id}: invalid support level ${adapter.level}`, errors);
    assert(
      /^\d{4}-\d{2}-\d{2}$/.test(adapter.verifiedOn || ''),
      `${adapter.id}: verifiedOn must be YYYY-MM-DD`,
      errors
    );
    assert(adapter.versionRange === packageJson.version, `${adapter.id}: versionRange must match package.json`, errors);
    assert(
      Array.isArray(adapter.generatedPaths) && adapter.generatedPaths.length > 0,
      `${adapter.id}: generatedPaths required`,
      errors
    );
    assert(Array.isArray(adapter.evidence) && adapter.evidence.length > 0, `${adapter.id}: evidence required`, errors);
    assert(docs.includes(`| ${adapter.name} `), `${adapter.id}: docs support table is missing adapter name`, errors);
    assert(
      docs.includes(`\`${adapter.level}\``),
      `${adapter.id}: docs support table is missing level ${adapter.level}`,
      errors
    );

    for (const evidence of adapter.evidence || []) {
      assert(await pathExists(evidence), `${adapter.id}: evidence path does not exist: ${evidence}`, errors);
    }

    const templatePath = path.join(adapterRoot, adapter.id);
    const templateFiles = await filesUnder(templatePath);
    const combinedTemplateText = (
      await Promise.all(templateFiles.map(async (file) => fs.readFile(file, 'utf8').catch(() => '')))
    ).join('\n');
    assert(
      sharedGuidancePattern.test(combinedTemplateText),
      `${adapter.id}: adapter must reference command-interaction.md`,
      errors
    );

    if (adapter.level === 'host-e2e-verified') {
      assert(
        (adapter.evidence || []).some((item) => item.includes('pilot') || item.includes('host')),
        `${adapter.id}: host-e2e-verified requires host or pilot evidence`,
        errors
      );
    }
  }

  if (errors.length > 0) {
    console.error('Adapter support verification failed:\n');
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  console.log(
    `Adapter support verification passed (${adapters.length} adapters: ${adapters
      .map((adapter) => `${adapter.id}=${adapter.level}`)
      .join(', ')}).`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
