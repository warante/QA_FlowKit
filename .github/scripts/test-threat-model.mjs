#!/usr/bin/env node
import assert from 'node:assert/strict';
import { repoRoot } from './lib/ci-helpers.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const threatModelPath = path.join(repoRoot, 'docs', 'qa-ai', 'threat-model.md');

const REQUIRED_SECTIONS = [
  '## Scope',
  '## Assets',
  '## Trust Boundaries',
  '## Actors',
  '## Control Layers',
  '## Abuse Cases And Controls',
  '## Threat-To-Verification Mapping',
  '## Verification',
  '## Accepted RC Limitations'
];

const REQUIRED_VERIFICATION_COMMANDS = [
  'npm run test:e2e-adversarial',
  'npm run test:e2e-update-migration',
  'npm run test:e2e-clean-install',
  'npm run test:cli-contracts',
  'node .github/scripts/verify-npm-pack.mjs'
];

const LINKING_FILES = [
  'SECURITY.md',
  'README.md',
  'README.es.md',
  'docs/qa-ai/architecture.md',
  'docs/qa-ai/agent-harness-architecture.md',
  'AGENTS.md'
];

test('threat model includes required sections and verification commands', async () => {
  const content = await fs.readFile(threatModelPath, 'utf8');
  for (const heading of REQUIRED_SECTIONS) {
    assert.ok(content.includes(heading), `missing section: ${heading}`);
  }
  for (const command of REQUIRED_VERIFICATION_COMMANDS) {
    assert.ok(content.includes(command), `missing verification command: ${command}`);
  }
  assert.ok(content.includes('| Harness enforcement'));
  assert.ok(content.includes('| Validator detection'));
  assert.ok(content.includes('| Prompt and rule guidance'));
  assert.ok(content.includes('| Host and tool enforcement'));
});

test('public docs link to the threat model', async () => {
  for (const relPath of LINKING_FILES) {
    const content = await fs.readFile(path.join(repoRoot, relPath), 'utf8');
    assert.ok(
      content.includes('docs/qa-ai/threat-model.md') || content.includes('threat-model.md'),
      `${relPath} should link to threat-model.md`
    );
  }
});

test('threat-to-verification mapping references existing npm scripts', async () => {
  const packageJson = JSON.parse(await fs.readFile(path.join(repoRoot, 'package.json'), 'utf8'));
  const scripts = packageJson.scripts || {};
  const requiredScripts = [
    'test:e2e-adversarial',
    'test:e2e-update-migration',
    'test:e2e-clean-install',
    'test:cli-contracts',
    'validate:oss-extraction'
  ];
  for (const scriptName of requiredScripts) {
    assert.ok(scripts[scriptName], `package.json is missing script ${scriptName}`);
  }
  await fs.access(path.join(repoRoot, '.github/scripts/verify-npm-pack.mjs'));
});
