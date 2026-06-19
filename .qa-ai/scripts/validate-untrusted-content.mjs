#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { scanText } from './lib/injection-patterns.mjs';
import {
  commaList,
  getConfigValue,
  listFilesRecursive,
  loadQaAiConfig,
  logHeader,
  parseArgs,
  pathExists,
  relativeTo,
  resolveRepoPath
} from './lib/utils.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);
const textExtensions = new Set(['.csv', '.feature', '.json', '.md', '.txt', '.tsv', '.yaml', '.yml']);

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-untrusted-content.mjs [options]

Options:
  --path <path>       Scan an explicit file or folder. May be repeated or comma-separated.
  --strict            Exit non-zero when prompt-injection-like content is found.
  --json              Print machine-readable JSON.
  --allow-missing     Ignore missing configured or explicit paths.
  --help              Show this help

Scans requirement intake and QA context files for prompt-injection-like instructions.
Findings are warnings by default and failures with --strict.
`);
}

function asList(value) {
  return commaList(value);
}

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
    ...asList(getConfigValue(config, 'sources.markdown.paths', [])),
    ...asList(getConfigValue(config, 'sources.requirements.paths', [])),
    ...asList(getConfigValue(config, 'sources.attachments', []))
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

async function collectFiles(targets, { allowMissing }) {
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

async function scanFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return scanText(content).map((finding) => ({
    file: relativeTo(cwd, filePath),
    ...finding
  }));
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const explicitTargets = asList(args.path);
  const configInfo = await loadQaAiConfig(cwd);
  const targets = explicitTargets.length > 0 ? explicitTargets : configuredTargets(configInfo.data);
  const strict = Boolean(args.strict);
  const allowMissing = Boolean(args['allow-missing']);
  const { files, missing, blockingMissing } = await collectFiles(targets, { allowMissing });
  const findings = (await Promise.all(files.map(scanFile))).flat();
  const ok = blockingMissing.length === 0 && (!strict || findings.length === 0);

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          ok,
          strict,
          scannedFiles: files.map((filePath) => relativeTo(cwd, filePath)),
          missing,
          findings
        },
        null,
        2
      )
    );
    if (!ok) process.exit(1);
    return;
  }

  logHeader(`Untrusted content scan${strict ? ' --strict' : ''}`);
  for (const item of blockingMissing) {
    console.log(`[FAIL] ${item.path}: ${item.reason}`);
  }
  for (const item of missing.filter((entry) => !blockingMissing.includes(entry))) {
    console.log(`[WARN] ${item.path}: ${item.reason}`);
  }
  for (const finding of findings) {
    console.log(
      `[${strict ? 'FAIL' : 'WARN'}] ${finding.file}:${finding.line} (${finding.pattern}) ${finding.excerpt}`
    );
  }

  console.log('\nResult:');
  if (!ok) {
    if (blockingMissing.length > 0) {
      console.log(`FAILED - ${blockingMissing.length} missing path(s).`);
    } else {
      console.log(`FAILED - ${findings.length} prompt-injection-like finding(s).`);
    }
    process.exit(1);
  }
  if (findings.length > 0) {
    console.log(`VALID WITH WARNINGS - ${findings.length} prompt-injection-like finding(s).`);
  } else {
    console.log(`VALID - scanned ${files.length} file(s), no prompt-injection-like content found.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
