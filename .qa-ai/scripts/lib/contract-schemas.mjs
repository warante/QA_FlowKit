import fs from 'node:fs/promises';
import path from 'node:path';
import { validateConfigData, loadConfigSchema } from './config-schema.mjs';
import { validateAgainstSchema } from './json-schema-lite.mjs';
import { normalizeRequirementsConfig, parseSimpleYaml, pathExists } from './utils.mjs';

const registryRelPath = path.join('.qa-ai', 'contracts', 'schema-registry.v1.json');

export const MIGRATION_GUIDE = 'docs/qa-ai/schema-compatibility.md';

export function unsupportedVersionMessage(surface, version, supportedVersions = [1]) {
  const supported = supportedVersions.join(', ');
  return `${surface} schema version ${JSON.stringify(version)} is unsupported. Supported version(s): ${supported}. See ${MIGRATION_GUIDE}.`;
}

export function assertSupportedVersion(surface, version, supportedVersions) {
  if (supportedVersions.includes(version)) return null;
  return unsupportedVersionMessage(surface, version, supportedVersions);
}

export async function loadSchemaRegistry(root = process.cwd()) {
  const filePath = path.join(root, registryRelPath);
  if (!(await pathExists(filePath))) {
    throw new Error(`Missing schema registry: ${registryRelPath}`);
  }
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function loadSurfaceSchema(root, surfaceKey) {
  const registry = await loadSchemaRegistry(root);
  const surface = registry.surfaces?.[surfaceKey];
  if (!surface?.schemaPath) {
    throw new Error(`Schema registry is missing surface: ${surfaceKey}`);
  }
  const schemaPath = path.join(root, surface.schemaPath);
  return {
    surface,
    schema: JSON.parse(await fs.readFile(schemaPath, 'utf8'))
  };
}

function withVersionGate(surfaceKey, versionField, version, supportedVersions, result) {
  const versionError = assertSupportedVersion(surfaceKey, version, supportedVersions);
  if (versionError) {
    return { ok: false, errors: [versionError, ...result.errors] };
  }
  return result;
}

export async function validateConfigContract(data, { normalizeLegacy = true, root = process.cwd() } = {}) {
  const { surface, schema } = await loadSurfaceSchema(root, 'config');
  const normalized = normalizeLegacy ? normalizeRequirementsConfig(JSON.parse(JSON.stringify(data))) : data;
  const version = normalized?.version;
  const result = validateConfigData(normalized, schema);
  return withVersionGate('config', 'version', version, surface.supportedVersions, result);
}

export async function validateConfigContractContent(
  content,
  root = process.cwd(),
  filename = 'qa-ai.config.yaml',
  options = {}
) {
  return validateConfigContract(parseSimpleYaml(content, filename), { ...options, root });
}

export async function validateWorkflowContractSchema(data, { root = process.cwd() } = {}) {
  const { surface, schema } = await loadSurfaceSchema(root, 'workflow');
  const result = validateAgainstSchema(data, schema);
  return withVersionGate('workflow', 'schemaVersion', data?.schemaVersion, surface.supportedVersions, result);
}

export async function validateRunStateContract(data, { root = process.cwd() } = {}) {
  const { surface, schema } = await loadSurfaceSchema(root, 'run-state');
  const result = validateAgainstSchema(data, schema);
  return withVersionGate('run-state', 'schemaVersion', data?.schemaVersion, surface.supportedVersions, result);
}

export async function validateRunEventContract(data, { root = process.cwd() } = {}) {
  const { schema } = await loadSurfaceSchema(root, 'run-event');
  return validateAgainstSchema(data, schema);
}

export async function validateInitManifestContract(data, { root = process.cwd() } = {}) {
  const { surface, schema } = await loadSurfaceSchema(root, 'init-manifest');
  const result = validateAgainstSchema(data, schema);
  return withVersionGate('init-manifest', 'version', data?.version, surface.supportedVersions, result);
}

export async function validateRunEventsFile(content, { root = process.cwd() } = {}) {
  const lines = String(content || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const errors = [];
  for (let index = 0; index < lines.length; index += 1) {
    let event;
    try {
      event = JSON.parse(lines[index]);
    } catch (error) {
      errors.push(`events.jsonl line ${index + 1}: invalid JSON (${error.message})`);
      continue;
    }
    const result = await validateRunEventContract(event, { root });
    if (!result.ok) {
      for (const message of result.errors) {
        errors.push(`events.jsonl line ${index + 1}: ${message}`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

export async function loadContractSchemaBySurface(surfaceKey, root = process.cwd()) {
  const { schema } = await loadSurfaceSchema(root, surfaceKey);
  return schema;
}

export async function validateShippedConfigSchema(root = process.cwd()) {
  return loadConfigSchema(root);
}
