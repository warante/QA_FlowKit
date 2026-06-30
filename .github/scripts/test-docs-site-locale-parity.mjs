#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

import { repoRoot } from './lib/ci-helpers.mjs';

const enPath = path.join(repoRoot, 'docs', 'site', 'content.en.json');
const esPath = path.join(repoRoot, 'docs', 'site', 'content.es.json');

function collectKeys(value, prefix = '') {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix];
  }
  const keys = [];
  for (const [key, child] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key;
    keys.push(...collectKeys(child, next));
  }
  return keys;
}

test('docs site locale JSON shares the same key schema', async () => {
  const en = JSON.parse(await fs.readFile(enPath, 'utf8'));
  const es = JSON.parse(await fs.readFile(esPath, 'utf8'));
  const enKeys = collectKeys(en).sort();
  const esKeys = collectKeys(es).sort();
  assert.deepEqual(esKeys, enKeys, 'content.es.json keys must match content.en.json');
});
