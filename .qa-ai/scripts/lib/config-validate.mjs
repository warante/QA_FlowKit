import path from 'node:path';
import fs from 'node:fs/promises';
import { validateConfigContractContent } from './contract-schemas.mjs';
import { pathExists } from './utils.mjs';

/**
 * @returns {Promise<{ ok: boolean, errors: string[], warnings?: string[], skipped?: boolean }>}
 */
export async function validateConfig(cwd, options = {}) {
  const configPath = options.configPath
    ? path.resolve(cwd, String(options.configPath))
    : path.join(cwd, 'qa-ai.config.yaml');

  if (!(await pathExists(configPath))) {
    if (options.allowMissing) {
      return { ok: true, errors: [], skipped: true };
    }
    return {
      ok: false,
      errors: [`${path.relative(cwd, configPath) || configPath}: file is missing`]
    };
  }

  const content = await fs.readFile(configPath, 'utf8');
  return validateConfigContractContent(content, cwd, configPath);
}
