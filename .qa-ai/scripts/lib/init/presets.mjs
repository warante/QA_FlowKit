import path from 'node:path';
import fs from 'node:fs/promises';
import { isKarateFramework } from '../automation-framework.mjs';
import { getConfigValue, pathExists } from '../utils.mjs';

export function isKarateConfigured(cfg) {
  return (
    isKarateFramework(getConfigValue(cfg, 'automation.api.framework', '')) ||
    isKarateFramework(getConfigValue(cfg, 'automation.ui.framework', ''))
  );
}

export async function availablePresets(presetsDir) {
  if (!(await pathExists(presetsDir))) return [];
  const entries = await fs.readdir(presetsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.yaml'))
    .map((entry) => path.basename(entry.name, '.yaml'))
    .sort();
}
