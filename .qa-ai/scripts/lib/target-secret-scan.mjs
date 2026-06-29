import fs from 'node:fs/promises';
import { karateSecretScanRoots, usesKarate } from './automation-framework.mjs';
import { scanPathsForSecrets } from './secret-patterns.mjs';
import { QA_OUTPUT_DIR } from './artifact-paths.mjs';
import { getConfigValue, listFilesRecursive, pathExists, relativeTo, resolveRepoPath } from './utils.mjs';

function shouldScanFile(filePath) {
  const lower = filePath.toLowerCase();
  return !lower.endsWith('.png') && !lower.endsWith('.jpg');
}

export async function collectTargetSecretScanFiles(cwd, config) {
  const dirs = [
    QA_OUTPUT_DIR,
    getConfigValue(config, 'gherkin.featurePath', 'features'),
    getConfigValue(config, 'automation.mobile.flowsPath', ''),
    ...(usesKarate(config) ? karateSecretScanRoots(config) : [])
  ].filter(Boolean);

  const files = [];
  for (const dir of dirs) {
    try {
      const dirPath = resolveRepoPath(cwd, dir, { label: dir });
      if (await pathExists(dirPath)) {
        const listed = await listFilesRecursive(dirPath, shouldScanFile);
        files.push(...listed);
      }
    } catch {
      // optional paths
    }
  }
  return files;
}

export async function scanTargetSecrets(cwd, config) {
  const files = await collectTargetSecretScanFiles(cwd, config);
  return scanPathsForSecrets(fs.readFile, files, cwd, relativeTo);
}

export function formatSecretScanFindingsForJson(findings) {
  return findings.map((finding) => ({
    file: finding.label || '',
    line: finding.line,
    message: `Potential secret (${finding.pattern}): ${finding.excerpt}`,
    severity: 'error'
  }));
}
