#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDocumentationConsistency } from './lib/documentation-consistency.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const result = await validateDocumentationConsistency(repoRoot);

if (!result.ok) {
  console.error('Documentation consistency check failed:\n');
  for (const error of result.errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`Documentation consistency check passed (${result.checkedMarkdownFiles} Markdown files).`);
