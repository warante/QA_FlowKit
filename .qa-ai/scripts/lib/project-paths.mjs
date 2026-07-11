import fs from 'node:fs/promises';
import path from 'node:path';

export const QA_AI_DIR = '.qa-ai';
export const COMPACT_CONFIG_PATH = `${QA_AI_DIR}/qa-ai.config.yaml`;
export const LEGACY_CONFIG_PATH = 'qa-ai.config.yaml';
export const CONFIG_CANDIDATES = [COMPACT_CONFIG_PATH];
export const COMPACT_OUTPUT_DIR = `${QA_AI_DIR}/output`;
export const COMPACT_FEATURES_DIR = `${QA_AI_DIR}/features`;
export const COMPACT_TESTS_DIR = `${QA_AI_DIR}/tests`;
export const LEGACY_OUTPUT_DIR = 'qa-ai-output';
export const LEGACY_FEATURES_DIR = 'features';
export const LEGACY_TESTS_DIR = 'tests';

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function relativeTo(cwd, filePath) {
  return path.relative(cwd, filePath).replaceAll(path.sep, '/');
}

export function recommendedConfigPath() {
  return COMPACT_CONFIG_PATH;
}

/**
 * @param {string} cwd
 * Runtime config resolution is intentionally modern-only. Legacy detection is
 * handled by the explicit migration workflow and never acts as a fallback.
 * @returns {Promise<{ path: string, absPath: string, source: 'compact'|'missing', dualConfig: boolean, legacyConfigPresent: boolean }>}
 */
export async function resolveQaAiConfigPath(cwd) {
  const rootAbs = path.join(cwd, LEGACY_CONFIG_PATH);
  const compactAbs = path.join(cwd, COMPACT_CONFIG_PATH);
  const rootExists = await pathExists(rootAbs);
  const compactExists = await pathExists(compactAbs);

  if (compactExists) {
    return {
      path: COMPACT_CONFIG_PATH,
      absPath: compactAbs,
      source: 'compact',
      dualConfig: false,
      legacyConfigPresent: rootExists
    };
  }
  return {
    path: COMPACT_CONFIG_PATH,
    absPath: compactAbs,
    source: 'missing',
    dualConfig: false,
    legacyConfigPresent: rootExists
  };
}

function pathUsesLegacyRoot(value) {
  const normalized = String(value || '')
    .replaceAll('\\', '/')
    .trim();
  if (!normalized) return false;
  return (
    normalized === LEGACY_OUTPUT_DIR ||
    normalized.startsWith(`${LEGACY_OUTPUT_DIR}/`) ||
    normalized === LEGACY_FEATURES_DIR ||
    normalized.startsWith(`${LEGACY_FEATURES_DIR}/`) ||
    normalized === LEGACY_TESTS_DIR ||
    normalized.startsWith(`${LEGACY_TESTS_DIR}/`)
  );
}

function collectConfiguredPathValues(config, prefix = '', values = []) {
  if (!config || typeof config !== 'object') return values;
  for (const [key, value] of Object.entries(config)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      values.push(value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') values.push(item);
      }
    } else if (value && typeof value === 'object') {
      collectConfiguredPathValues(value, nextPrefix, values);
    }
  }
  return values;
}

/**
 * @param {string} cwd
 * @param {{ exists?: boolean, source?: string, data?: object }} [configInfo]
 */
export async function detectLegacyLayout(cwd, configInfo = {}) {
  if (configInfo.source === 'root' || configInfo.legacyConfigPresent) return true;

  const legacyDirs = [LEGACY_OUTPUT_DIR, LEGACY_FEATURES_DIR];
  for (const rel of legacyDirs) {
    if (await pathExists(path.join(cwd, rel))) return true;
  }

  if (configInfo.data && typeof configInfo.data === 'object') {
    for (const value of collectConfiguredPathValues(configInfo.data)) {
      if (pathUsesLegacyRoot(value)) return true;
    }
  }

  return false;
}

export function formatMissingConfigMessage(cwd) {
  const rel = relativeTo(cwd, path.join(cwd, COMPACT_CONFIG_PATH));
  return `Missing QA FlowKit config. Run init first or create ${rel}. Root qa-ai.config.yaml is legacy and must be migrated explicitly.`;
}
