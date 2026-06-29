#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  buildDocsSiteHtml,
  normalizeDocsHtml,
  renderDocsSiteLocale,
  verifyDocsSiteOutputs
} from './lib/docs-site-builder.mjs';
import { repoRoot } from './lib/ci-helpers.mjs';

test('docs site builder resolves all template placeholders for English', async () => {
  const siteRoot = path.join(repoRoot, 'docs', 'site');
  const template = await fs.readFile(path.join(siteRoot, 'template.html'), 'utf8');
  const content = JSON.parse(await fs.readFile(path.join(siteRoot, 'content.en.json'), 'utf8'));
  const html = buildDocsSiteHtml(content, template);
  assert.match(html, /<html lang="en"/);
  assert.match(html, /<h1>QA FlowKit<\/h1>/);
  assert.doesNotMatch(html, /\{\{[a-z0-9_]+\}\}/);
});

test('docs site builder resolves all template placeholders for Spanish', async () => {
  const siteRoot = path.join(repoRoot, 'docs', 'site');
  const template = await fs.readFile(path.join(siteRoot, 'template.html'), 'utf8');
  const content = JSON.parse(await fs.readFile(path.join(siteRoot, 'content.es.json'), 'utf8'));
  const html = buildDocsSiteHtml(content, template);
  assert.match(html, /<html lang="es"/);
  assert.match(html, /Instala QA FlowKit en el repositorio de QA/);
  assert.doesNotMatch(html, /\{\{[a-z0-9_]+\}\}/);
});

test('committed docs HTML matches generator output', async () => {
  const siteRoot = path.join(repoRoot, 'docs', 'site');
  const generated = new Map([
    ['en', await renderDocsSiteLocale(siteRoot, 'en')],
    ['es', await renderDocsSiteLocale(siteRoot, 'es')]
  ]);
  const errors = await verifyDocsSiteOutputs(repoRoot, generated);
  assert.deepEqual(errors, []);
});

test('normalizeDocsHtml enforces LF endings and trailing newline', () => {
  assert.equal(normalizeDocsHtml('hello\r\nworld'), 'hello\nworld\n');
});

test('verifyDocsSiteOutputs reports drift for stale HTML', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-flowkit-docs-site-'));
  t.after(async () => fs.rm(root, { recursive: true, force: true }));

  await fs.mkdir(path.join(root, 'docs', 'es'), { recursive: true });
  await fs.writeFile(path.join(root, 'docs', 'index.html'), '<html lang="en"></html>\n');
  await fs.writeFile(path.join(root, 'docs', 'es', 'index.html'), '<html lang="es"></html>\n');

  const generated = new Map([
    ['en', '<html lang="en"><!-- drift --></html>\n'],
    ['es', '<html lang="es"></html>\n']
  ]);
  const errors = await verifyDocsSiteOutputs(root, generated);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /docs\/index\.html/);
});
