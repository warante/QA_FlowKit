#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizeColumn, parseMarkdownTable } from './lib/markdown-table.mjs';
import {
  getConfigValue,
  listFilesRecursive,
  loadQaAiConfig,
  logHeader,
  parseArgs,
  pathExists,
  readText,
  relativeTo,
  resolveRepoPath
} from './lib/utils.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);
const idPattern = /\b(?:RF|TC|TEST|QA)[-_ ]?[A-Z0-9]+\b/gi;
const caseIdPattern = /\b(?:TC|TEST|QA)[-_ ]?[A-Z0-9]+\b/gi;
const requiredColumns = [
  'Requirement Source',
  'RF',
  'Feature File',
  'Test Management Case ID',
  'Type',
  'Priority',
  'Automation Status'
];

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-traceability.mjs [options]

Options:
  --path <file>     Override configured traceability matrix path
  --features <dir>  Override configured feature root
  --allow-empty     Return success when no .feature files exist
  --allow-missing   Return success when the traceability matrix is missing
  --help            Show this help

Validates feature identifier coverage, traceability matrix table shape and duplicate test case or feature-file rows.
`);
}

function normalizeId(value) {
  return String(value || '')
    .replace(/\s+/g, '-')
    .toUpperCase();
}

function idsFromText(value) {
  return [...String(value || '').matchAll(idPattern)].map((match) => normalizeId(match[0]));
}

function caseIdsFromText(value) {
  return [...String(value || '').matchAll(caseIdPattern)].map((match) => normalizeId(match[0]));
}

function parseMatrix(content) {
  const table = parseMarkdownTable(content, {
    label: 'Traceability matrix',
    requiredColumns
  });
  const errors = [...table.errors];
  const rows = [];
  for (const row of table.rows) {
    const ids = [...new Set(idsFromText(row.cells.join(' ')))].sort();
    const caseIds = [...new Set(caseIdsFromText(row.cells.join(' ')))].sort();
    if (ids.length === 0) {
      errors.push(`Line ${row.line}: row must include at least one RF/test identifier.`);
    }
    rows.push({ ...row, ids, caseIds });
  }

  return { errors, rows, header: table.header };
}

function duplicateMatrixErrors(rows) {
  const errors = [];
  const byCaseId = new Map();
  const byFeatureFile = new Map();

  for (const row of rows) {
    for (const id of row.caseIds) {
      const current = byCaseId.get(id) || [];
      current.push(row.line);
      byCaseId.set(id, current);
    }

    const featureFile = String(row.values[normalizeColumn('Feature File')] || '').trim();
    if (featureFile) {
      const normalizedFeatureFile = featureFile.replaceAll('\\', '/').toLowerCase();
      const current = byFeatureFile.get(normalizedFeatureFile) || [];
      current.push(row.line);
      byFeatureFile.set(normalizedFeatureFile, current);
    }
  }

  for (const [id, lines] of byCaseId.entries()) {
    if (lines.length > 1) errors.push(`Identifier ${id} appears in multiple traceability rows: ${lines.join(', ')}.`);
  }
  for (const [featureFile, lines] of byFeatureFile.entries()) {
    if (lines.length > 1)
      errors.push(`Feature file ${featureFile} appears in multiple traceability rows: ${lines.join(', ')}.`);
  }

  return errors;
}

async function featureIds(featureRootPath) {
  const files = await listFilesRecursive(featureRootPath, (filePath) => filePath.endsWith('.feature'));
  const entries = [];
  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const ids = new Set([...idsFromText(path.basename(file, '.feature')), ...idsFromText(content)]);
    entries.push({
      file,
      ids: [...ids].sort()
    });
  }
  return entries;
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  logHeader('QA AI traceability validator');
  const configInfo = await loadQaAiConfig(cwd);
  const featureRoot = args.features || getConfigValue(configInfo.data, 'gherkin.featurePath', 'features');
  const matrixPath =
    args.path || getConfigValue(configInfo.data, 'traceability.matrixPath', 'qa-ai-output/traceability-matrix.md');
  const featureRootPath = resolveRepoPath(cwd, featureRoot, { label: 'feature root' });
  const matrixFilePath = resolveRepoPath(cwd, matrixPath, { label: 'traceability matrix' });
  const features = await featureIds(featureRootPath);

  if (features.length === 0) {
    console.log(`No .feature files found under ${featureRoot}.`);
    if (args['allow-empty']) return;
    console.log('\nFAILED - no feature files found. Pass --allow-empty when this is expected.');
    process.exit(1);
  }

  if (!(await pathExists(matrixFilePath))) {
    console.log(`Traceability matrix not found at ${matrixPath}.`);
    if (args['allow-missing']) return;
    console.log('\nFAILED - create the traceability matrix or pass --allow-missing.');
    process.exit(1);
  }

  const rawMatrixContent = await readText(matrixFilePath);
  const matrix = parseMatrix(rawMatrixContent);
  const matrixContent = normalizeId(rawMatrixContent);
  const errors = [];
  errors.push(...matrix.errors);
  errors.push(...duplicateMatrixErrors(matrix.rows));

  for (const feature of features) {
    if (feature.ids.length === 0) {
      errors.push(`${relativeTo(cwd, feature.file)} has no RF/test identifiers to trace.`);
      continue;
    }
    for (const id of feature.ids) {
      if (!matrixContent.includes(id)) {
        errors.push(
          `${relativeTo(cwd, feature.file)} identifier ${id} is missing from ${matrixPath}. ` +
            'Add a matrix row with RF, Feature File, and Test Management Case ID columns.'
        );
      }
    }
  }

  if (errors.length > 0) {
    for (const error of errors) console.log(`[FAIL] ${error}`);
    console.log(`\nFAILED - ${errors.length} traceability validation error(s).`);
    process.exit(1);
  }

  console.log(`[PASS] ${matrixPath} covers identifiers from ${features.length} feature file(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
