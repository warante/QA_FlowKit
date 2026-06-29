#!/usr/bin/env node
import { repoRoot } from './lib/ci-helpers.mjs';
import { renderDocsSiteLocale, verifyDocsSiteOutputs } from './lib/docs-site-builder.mjs';
import { validateDocumentationConsistency } from './lib/documentation-consistency.mjs';

const result = await validateDocumentationConsistency(repoRoot, {
  renderDocsSiteLocale,
  verifyDocsSiteOutputs
});

if (!result.ok) {
  console.error('Documentation consistency check failed:\n');
  for (const error of result.errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`Documentation consistency check passed (${result.checkedMarkdownFiles} Markdown files).`);
