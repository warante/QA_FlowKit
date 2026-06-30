import fs from 'node:fs/promises';
import path from 'node:path';
import { validateNode } from './json-schema-lite.mjs';
import { parseSimpleYaml, pathExists } from './utils.mjs';
import { resolveQaAiConfigPath } from './project-paths.mjs';

const schemaRelPath = path.join('.qa-ai', 'contracts', 'config.v1.schema.json');

export { jsonPath } from './json-schema-lite.mjs';

export async function loadConfigSchema(root = process.cwd()) {
  const schemaPath = path.join(root, schemaRelPath);
  if (!(await pathExists(schemaPath))) {
    throw new Error(`Missing config schema: ${schemaRelPath}`);
  }
  return JSON.parse(await fs.readFile(schemaPath, 'utf8'));
}

export function validateConfigData(config, schema) {
  const errors = [];
  validateNode(config, schema, [], errors);
  return { ok: errors.length === 0, errors };
}

export async function validateConfigContent(content, root = process.cwd(), filename = 'qa-ai.config.yaml') {
  const schema = await loadConfigSchema(root);
  return validateConfigData(parseSimpleYaml(content, filename), schema);
}

export async function validateConfigFile(root = process.cwd(), configPath) {
  const resolvedPath = configPath || (await resolveQaAiConfigPath(root)).absPath;
  if (!(await pathExists(resolvedPath))) {
    return { ok: false, errors: [`${path.relative(root, resolvedPath) || resolvedPath}: file is missing`] };
  }
  return validateConfigContent(await fs.readFile(resolvedPath, 'utf8'), root, resolvedPath);
}
