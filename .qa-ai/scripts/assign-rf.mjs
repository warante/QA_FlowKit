#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { loadQaAiConfig, getConfigValue, pathExists } from './lib/utils.mjs';
import { resolveHarnessRelativePath } from './lib/harness-paths.mjs';

const cwd = process.cwd();
const rawArgs = process.argv.slice(2);
const positional = rawArgs.filter((value) => !value.startsWith('--'));
const [fromRf, toRf] = positional;

function validPending(value) {
  return /^RF-PENDING(?:-[A-Za-z0-9._-]+)?$/.test(value || '');
}

function validOfficial(value) {
  return /^RF-(?!PENDING(?:-|$))[A-Z0-9][A-Z0-9._-]*$/.test(value || '');
}

const ARTIFACT_CONFIG_PATHS = [
  'knowledge.summaryPath',
  'knowledge.decisionsPath',
  'testDesign.systemPath',
  'testDesign.proposalPath',
  'testDesign.quality.reportPath',
  'traceability.matrixPath',
  'risk.reportPath',
  'testData.artifactPath',
  'environments.readinessPath',
  'observability.reportPath',
  'execution.reportPath',
  'testImpact.reportPath',
  'healing.logPath',
  'learningLoop.reportPath',
  'release.gatePath',
  'testManagementSync.planPath',
  'testManagementSync.diffPath',
  'testManagementSync.applyLogPath',
  'testManagementSync.rollbackPath',
  'testManagementSync.remoteSnapshotPath'
];

async function filesUnder(root) {
  if (!(await pathExists(root))) return [];
  const entries = await fs.readdir(root, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(root, entry.name);
      return entry.isDirectory() ? filesUnder(target) : [target];
    })
  );
  return nested.flat();
}

async function confirm() {
  if (rawArgs.includes('--yes')) return true;
  if (!process.stdin.isTTY || !process.stdout.isTTY) return false;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question('\nApply RF assignment? [y/N] ');
    return ['y', 'yes'].includes(answer.trim().toLowerCase());
  } finally {
    rl.close();
  }
}

async function main() {
  if (!validPending(fromRf) || !validOfficial(toRf)) {
    throw new Error('Usage: assign-rf RF-PENDING[-ID] RF-123 [--dry-run] [--yes]');
  }
  const configInfo = await loadQaAiConfig(cwd);
  if (!configInfo.exists) {
    throw new Error('Missing .qa-ai/qa-ai.config.yaml. Initialize or migrate the project first.');
  }
  const config = configInfo.data;
  const roots = new Set([getConfigValue(config, 'gherkin.featurePath', '.qa-ai/features'), '.qa-ai/output']);
  for (const configPath of ARTIFACT_CONFIG_PATHS) {
    const artifactPath = getConfigValue(config, configPath, '');
    if (artifactPath) roots.add(path.dirname(artifactPath));
  }
  const allFiles = (
    await Promise.all(
      [...roots].map((root) =>
        filesUnder(resolveHarnessRelativePath(cwd, root, { label: 'RF assignment root' }).absolute)
      )
    )
  ).flat();
  const changes = [];
  for (const file of allFiles) {
    const stats = await fs.stat(file);
    if (!stats.isFile()) continue;
    const content = await fs.readFile(file, 'utf8').catch(() => null);
    if (content === null || !content.includes(fromRf)) continue;
    const renamed = path.basename(file).includes(fromRf)
      ? path.join(path.dirname(file), path.basename(file).replaceAll(fromRf, toRf))
      : file;
    changes.push({ file, renamed, content: content.replaceAll(fromRf, toRf) });
  }
  console.log(`RF assignment preview: ${fromRf} -> ${toRf}`);
  for (const change of changes) {
    console.log(
      `- ${path.relative(cwd, change.file)}${change.renamed !== change.file ? ` -> ${path.relative(cwd, change.renamed)}` : ''}`
    );
  }
  for (const change of changes) {
    if (change.renamed !== change.file && (await pathExists(change.renamed))) {
      throw new Error(`Target already exists: ${path.relative(cwd, change.renamed)}`);
    }
  }
  if (changes.length === 0 || rawArgs.includes('--dry-run')) return;
  if (!(await confirm())) throw new Error('RF assignment not approved. No files were changed.');
  for (const change of changes) {
    await fs.writeFile(change.file, change.content, 'utf8');
    if (change.renamed !== change.file) {
      await fs.rename(change.file, change.renamed);
    }
  }
  console.log('RF assignment applied. Run validate-target before continuing.');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
