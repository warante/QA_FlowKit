import fs from 'node:fs/promises';
import path from 'node:path';
import { parseSimpleYaml, pathExists } from './utils.mjs';

const schemaRelPath = path.join('.qa-ai', 'contracts', 'config.v1.schema.json');

function jsonPath(parts) {
  if (parts.length === 0) return '$';
  return `$${parts.map((part) => (String(part).match(/^[A-Za-z_$][\w$-]*$/) ? `.${part}` : `[${JSON.stringify(part)}]`)).join('')}`;
}

function typeOf(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function typeMatches(value, expected) {
  if (expected === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (expected === 'integer') return Number.isInteger(value);
  if (expected === 'array') return Array.isArray(value);
  if (expected === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  return typeof value === expected;
}

function expectedTypes(schema) {
  return Array.isArray(schema.type) ? schema.type : [schema.type].filter(Boolean);
}

function validateNode(value, schema, pathParts, errors) {
  if (!schema || typeof schema !== 'object') return;

  const types = expectedTypes(schema);
  if (types.length > 0 && !types.some((type) => typeMatches(value, type))) {
    errors.push(`${jsonPath(pathParts)}: expected ${types.join(' or ')}, got ${typeOf(value)}`);
    return;
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(
      `${jsonPath(pathParts)}: expected one of ${schema.enum.map((item) => JSON.stringify(item)).join(', ')}`
    );
  }

  if (schema.pattern && typeof value === 'string' && !new RegExp(schema.pattern).test(value)) {
    errors.push(`${jsonPath(pathParts)}: does not match pattern ${schema.pattern}`);
  }

  if (Array.isArray(value)) {
    if (schema.items) {
      value.forEach((item, index) => validateNode(item, schema.items, [...pathParts, index], errors));
    }
    return;
  }

  if (!typeMatches(value, 'object')) return;

  const properties = schema.properties || {};
  for (const key of schema.required || []) {
    if (!(key in value)) errors.push(`${jsonPath([...pathParts, key])}: required key is missing`);
  }

  for (const [key, child] of Object.entries(value)) {
    if (Object.hasOwn(properties, key)) {
      validateNode(child, properties[key], [...pathParts, key], errors);
      continue;
    }

    if (schema.additionalProperties === false) {
      errors.push(`${jsonPath([...pathParts, key])}: unknown key`);
    } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      validateNode(child, schema.additionalProperties, [...pathParts, key], errors);
    }
  }
}

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

export async function validateConfigFile(root = process.cwd(), configPath = path.join(root, 'qa-ai.config.yaml')) {
  if (!(await pathExists(configPath))) {
    return { ok: false, errors: [`${path.relative(root, configPath) || configPath}: file is missing`] };
  }
  return validateConfigContent(await fs.readFile(configPath, 'utf8'), root, configPath);
}
