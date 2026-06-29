#!/usr/bin/env node
/**
 * Generates docs/index.html and docs/es/index.html from docs/site content JSON.
 * Use --check to verify committed HTML matches the generator output.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { repoRoot } from './lib/ci-helpers.mjs';
import {
  docsSiteOutputs,
  normalizeDocsHtml,
  renderDocsSiteLocale,
  verifyDocsSiteOutputs
} from './lib/docs-site-builder.mjs';

const checkOnly = process.argv.includes('--check');
const siteRoot = path.join(repoRoot, 'docs', 'site');

async function generateAll() {
  const generated = new Map();
  for (const { locale } of docsSiteOutputs) {
    generated.set(locale, await renderDocsSiteLocale(siteRoot, locale));
  }
  return generated;
}

async function writeOutputs(generated) {
  for (const { locale, relativePath } of docsSiteOutputs) {
    const outputPath = path.join(repoRoot, relativePath);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, normalizeDocsHtml(generated.get(locale)), 'utf8');
  }
}

async function main() {
  const generated = await generateAll();

  if (checkOnly) {
    const errors = await verifyDocsSiteOutputs(repoRoot, generated);
    if (errors.length > 0) {
      console.error('Docs site build check failed:\n');
      for (const error of errors) console.error(`  - ${error}`);
      process.exit(1);
    }
    console.log(`Docs site build check passed (${docsSiteOutputs.length} HTML files).`);
    return;
  }

  await writeOutputs(generated);
  console.log(`Docs site generated (${docsSiteOutputs.length} HTML files).`);
}

await main();
