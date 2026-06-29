#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  findBrokenLocalMarkdownLinks,
  findStaleEvergreenVersions,
  validateAuditDocumentation,
  validateLifecycleClaims,
  validateRequiredCommands
} from './lib/documentation-consistency.mjs';

test('stale prerelease versions fail in evergreen docs but historical files stay outside the check', () => {
  const errors = findStaleEvergreenVersions(
    new Map([
      ['README.md', 'Current version: 0.5.0-beta.0'],
      ['README.es.md', 'Canal actual: beta']
    ])
  );
  assert.equal(errors.length, 1);
  assert.match(errors[0], /README\.md:1/);
});

test('lifecycle claims require Release Candidate in both READMEs and SECURITY', () => {
  const errors = validateLifecycleClaims(
    new Map([
      ['README.md', 'QA FlowKit is in **Release Candidate**'],
      ['README.es.md', 'QA FlowKit está en fase de **candidato a versión estable (RC)**'],
      ['SECURITY.md', 'The project is currently in Release Candidate (RC).']
    ])
  );
  assert.deepEqual(errors, []);
});

test('audit documentation must match the CI threshold', () => {
  const errors = validateAuditDocumentation(
    'run: npm audit --audit-level=low',
    'Pull requests run `npm audit --audit-level=high`.'
  );
  assert.equal(errors.length, 1);
  assert.match(errors[0], /does not match CI/);
});

test('canonical validation commands are required in maintainer docs', () => {
  const commands = [
    'npm ci',
    'npm run lint',
    'npm run format:check',
    'npm run docs:check',
    'npm run validate:oss-extraction',
    'node .github/scripts/verify-npm-pack.mjs'
  ].join('\n');
  const errors = validateRequiredCommands(
    new Map([
      ['AGENTS.md', commands],
      ['docs/qa-ai/release-checklist.md', commands.replace('npm run docs:check', '')]
    ]),
    {
      scripts: {
        'docs:build': 'node build.mjs',
        'docs:check': 'node check.mjs',
        'test:doc-consistency': 'node --test test.mjs',
        'validate:oss-extraction': 'node check.mjs'
      }
    }
  );
  assert.equal(errors.length, 1);
  assert.match(errors[0], /release-checklist\.md.*npm run docs:check/);
});

test('broken local Markdown links fail while external and existing links pass', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-flowkit-doc-check-'));
  t.after(async () => fs.rm(root, { recursive: true, force: true }));

  await fs.mkdir(path.join(root, 'docs'));
  await fs.writeFile(path.join(root, 'existing.md'), '# Existing\n');
  await fs.writeFile(
    path.join(root, 'docs', 'guide.md'),
    '[existing](../existing.md)\n[external](https://example.com)\n[missing](missing.md)\n'
  );

  const errors = await findBrokenLocalMarkdownLinks(root, ['docs/guide.md']);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /missing\.md/);
});
