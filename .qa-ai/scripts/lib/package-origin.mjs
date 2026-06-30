import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageJsonPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../package.json');

/** Read the published qa-flowkit package.json adjacent to `.qa-ai/`. */
export function readFrameworkPackageJson() {
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
}

/** GitHub `owner/repo` slug derived from package metadata (no hardcoded org). */
export function githubRepositorySlug() {
  try {
    const pkg = readFrameworkPackageJson();
    const url = pkg.repository?.url || pkg.homepage || '';
    const match = String(url).match(/github\.com[/:]([^/]+\/[^/.]+?)(?:\.git)?$/i);
    if (match) return match[1];
  } catch {
    // fall through
  }
  return 'OWNER/qa-flowkit';
}

/** Composite action reference for generated GitHub workflow files. */
export function githubValidateActionRef(majorVersion = 'v1') {
  return `${githubRepositorySlug()}/actions/validate@${majorVersion}`;
}
