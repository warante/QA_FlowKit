import fs from 'node:fs/promises';
import path from 'node:path';
import { scanText } from './injection-patterns.mjs';
import {
  commaList,
  getConfigValue,
  listFilesRecursive,
  loadQaAiConfig,
  pathExists,
  relativeTo,
  resolveRepoPath
} from './utils.mjs';

const textExtensions = new Set(['.csv', '.feature', '.json', '.md', '.txt', '.tsv', '.yaml', '.yml']);

function configuredTargets(config) {
  const targets = new Set([
    getConfigValue(config, 'sources.analysisPath', 'qa-ai-output/source-analysis.md'),
    'qa-ai-output/requirement-analysis.md',
    'qa-ai-output/normalized-requirements.md',
    getConfigValue(config, 'knowledge.summaryPath', 'qa-ai-output/qa-knowledge-summary.md'),
    getConfigValue(config, 'knowledge.decisionsPath', 'qa-ai-output/qa-init-decisions.md')
  ]);

  for (const configuredPath of [
    getConfigValue(config, 'knowledge.sourcePath', ''),
    ...commaList(getConfigValue(config, 'sources.markdown.paths', [])),
    ...commaList(getConfigValue(config, 'sources.requirements.paths', [])),
    ...commaList(getConfigValue(config, 'sources.attachments', []))
  ]) {
    if (configuredPath) targets.add(configuredPath);
  }

  if (getConfigValue(config, 'sources.external.enabled', false)) {
    const reqImportPath = getConfigValue(
      config,
      'sources.external.requirementsImportPath',
      'qa-ai-output/imported-requirements.md'
    );
    const casesImportPath = getConfigValue(
      config,
      'sources.external.casesImportPath',
      'qa-ai-output/imported-cases.md'
    );
    if (reqImportPath) targets.add(reqImportPath);
    if (casesImportPath) targets.add(casesImportPath);
  }

  return [...targets].filter(Boolean);
}

function isTextFile(filePath) {
  return textExtensions.has(path.extname(filePath).toLowerCase());
}

async function collectFiles(cwd, targets, { allowMissing }) {
  const files = [];
  const missing = [];

  for (const target of targets) {
    let resolved;
    try {
      resolved = resolveRepoPath(cwd, target, { label: target });
    } catch (error) {
      missing.push({ path: target, reason: error.message });
      continue;
    }

    if (!(await pathExists(resolved))) {
      missing.push({ path: target, reason: 'not found' });
      continue;
    }

    const stat = await fs.stat(resolved);
    if (stat.isDirectory()) {
      files.push(...(await listFilesRecursive(resolved, isTextFile)));
    } else if (stat.isFile() && isTextFile(resolved)) {
      files.push(resolved);
    }
  }

  const uniqueFiles = [...new Set(files)].sort((a, b) => relativeTo(cwd, a).localeCompare(relativeTo(cwd, b)));
  const blockingMissing = allowMissing ? [] : missing;
  return { files: uniqueFiles, missing, blockingMissing };
}

async function scanFile(cwd, filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return scanText(content).map((finding) => ({
    file: relativeTo(cwd, filePath),
    ...finding
  }));
}

/**
 * @returns {Promise<{ ok: boolean, errors: string[], warnings: string[], findings?: object[], missing?: object[] }>}
 */
export async function validateUntrustedContent(cwd, options = {}) {
  const explicitTargets = commaList(options.path);
  const configInfo = await loadQaAiConfig(cwd);
  const targets = explicitTargets.length > 0 ? explicitTargets : configuredTargets(configInfo.data);
  const strict = Boolean(options.strict);
  const allowMissing = Boolean(options.allowMissing);
  const { files, missing, blockingMissing } = await collectFiles(cwd, targets, { allowMissing });
  const findings = (await Promise.all(files.map((file) => scanFile(cwd, file)))).flat();
  const ok = blockingMissing.length === 0 && (!strict || findings.length === 0);

  const errors = [];
  const warnings = [];
  for (const item of blockingMissing) {
    errors.push(`${item.path}: ${item.reason}`);
  }
  for (const finding of findings) {
    const msg = `${finding.file}:${finding.line} (${finding.pattern}) ${finding.excerpt}`;
    if (strict) errors.push(msg);
    else warnings.push(msg);
  }

  return { ok, errors, warnings, findings, missing, strict };
}
