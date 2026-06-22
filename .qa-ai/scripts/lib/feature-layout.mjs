/**
 * QA design feature folder layout under gherkin.featurePath.
 * Init creates these subfolders so first-use validation does not teach the layout by failing.
 */
import path from 'node:path';
import { parse as parseGherkin } from './gherkin-parser.mjs';

/** Subfolders allowed directly under gherkin.featurePath */
export const FEATURE_SUBFOLDERS = ['functional', 'integration', 'e2e', 'api', 'accessibility', 'security', 'manual'];

const TYPE_TO_FOLDER = {
  functional: 'functional',
  regression: 'functional',
  smoke: 'functional',
  negative: 'functional',
  'edge-case': 'functional',
  edge_case: 'functional',
  performance: 'functional',
  load: 'functional',
  stress: 'functional',
  integration: 'integration',
  e2e: 'e2e',
  api: 'api',
  accessibility: 'accessibility',
  a11y: 'accessibility',
  security: 'security'
};

/**
 * @param {string} content
 * @returns {Record<string, string>}
 */
export function parseFeatureTags(content) {
  const tags = {};

  try {
    const ast = parseGherkin(content);
    if (ast.feature && ast.feature.tags) {
      for (const t of ast.feature.tags) {
        const tagText = t.name.startsWith('@') ? t.name.slice(1) : t.name;
        const colonIndex = tagText.indexOf(':');
        if (colonIndex > 0) {
          const key = tagText.slice(0, colonIndex).toLowerCase();
          const value = tagText.slice(colonIndex + 1).trim();
          tags[key] = value;
        } else {
          tags[tagText.toLowerCase()] = 'true';
        }
      }
      return tags;
    }
  } catch {
    // Fallback on parse failure
  }

  const header = content.split(/\r?\n/).slice(0, 15).join('\n');
  const matches = header.matchAll(/@([a-zA-Z][\w-]*):([^\s@]+)/g);
  for (const match of matches) {
    tags[match[1].toLowerCase()] = match[2].trim();
  }
  if (/@api\b/i.test(header)) tags.api = 'true';
  if (/@ui\b/i.test(header)) tags.ui = 'true';
  return tags;
}

/**
 * @param {Record<string, string>} tags
 * @returns {string}
 */
export function resolveFeatureSubfolder(tags = {}) {
  const manual = String(tags.manual || '')
    .trim()
    .toLowerCase();
  if (manual === 'true' || manual === 'yes') {
    return 'manual';
  }

  const type = String(tags.type || '')
    .trim()
    .toLowerCase();
  if (type && TYPE_TO_FOLDER[type]) {
    return TYPE_TO_FOLDER[type];
  }

  if (tags.api === 'true') {
    return 'api';
  }

  return 'functional';
}

/**
 * @param {string} featureRoot
 * @param {string} subfolder
 * @param {string} fileName
 */
export function buildFeatureRelativePath(featureRoot, subfolder, fileName) {
  return path.join(featureRoot, subfolder, fileName);
}

/**
 * @param {string} filePath
 * @param {string} featureRoot
 * @param {string} [content]
 */
export function validateFeatureFilePlacement(filePath, featureRoot, content = '') {
  const warnings = [];
  const relative = path.relative(featureRoot, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return { warnings, expectedSubfolder: null, actualSubfolder: null };
  }

  const parts = relative.split(path.sep).filter(Boolean);
  const tags = parseFeatureTags(content);
  const expectedSubfolder = resolveFeatureSubfolder(tags);

  if (parts.length < 2) {
    warnings.push(
      `Place this file under ${path.join(path.basename(featureRoot), expectedSubfolder)}/ (not in the feature root).`
    );
    return { warnings, expectedSubfolder, actualSubfolder: null };
  }

  const actualSubfolder = parts[0];
  if (!FEATURE_SUBFOLDERS.includes(actualSubfolder)) {
    warnings.push(`Unknown subfolder "${actualSubfolder}". Use one of: ${FEATURE_SUBFOLDERS.join(', ')}.`);
  } else if (actualSubfolder !== expectedSubfolder) {
    warnings.push(
      `Expected folder "${expectedSubfolder}/" based on @type/@manual tags, but file is under "${actualSubfolder}/".`
    );
  }

  return { warnings, expectedSubfolder, actualSubfolder };
}
