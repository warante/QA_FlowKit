import path from 'node:path';
import { commaList, pathExists, readText } from '../utils.mjs';

export async function derivedProjectName(cwd, args) {
  const explicit = args['project-name'] || args.projectName;
  if (explicit) return String(explicit).trim();
  const packageJsonPath = path.join(cwd, 'package.json');
  if (await pathExists(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(await readText(packageJsonPath));
      if (typeof packageJson.name === 'string' && packageJson.name.trim()) return packageJson.name.trim();
    } catch {
      // Invalid package.json should not block init; fall back to the folder name.
    }
  }
  return path.basename(cwd);
}

export function selectedQaContextPath(args) {
  const values = commaList(args['qa-context'] || args.qaContext || args['qa-context-path'] || args.qaContextPath);
  if (values.length === 0) return null;
  if (values.length > 1) {
    throw new Error('Only one --qa-context folder is supported in the MVP.');
  }
  return values[0];
}
