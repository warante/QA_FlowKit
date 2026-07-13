#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  findBrokenLocalMarkdownLinks,
  findStaleEvergreenVersions,
  validateAuditDocumentation,
  validateLifecycleClaims,
  validateRequiredCommands
} from './lib/documentation-consistency.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

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

test('agent guidance contributor and architecture documentation stays aligned', async () => {
  const customization = await fs.readFile(path.join(repoRoot, 'docs/qa-ai/customizing-agents.md'), 'utf8');
  const architecture = await fs.readFile(path.join(repoRoot, 'docs/qa-ai/architecture.md'), 'utf8');
  const routing = await fs.readFile(path.join(repoRoot, 'docs/qa-ai/specialist-routing-matrix.md'), 'utf8');
  const rules = await fs.readFile(path.join(repoRoot, '.qa-ai/rules/README.md'), 'utf8');

  assert.match(customization, /agent-guidance\.v1\.json/);
  assert.match(customization, /Never edit `specialists\/active\.md` manually/);
  assert.match(customization, /test:agent-guidance/);
  assert.match(architecture, /does not control workflow order/);
  assert.match(routing, /all 42 specialist IDs/);
  assert.match(rules, /validate-agent-guidance\.mjs/);
});

test('phase-scoped permissions are documented in customizing-agents', async () => {
  const customization = await fs.readFile(path.join(repoRoot, 'docs/qa-ai/customizing-agents.md'), 'utf8');
  assert.match(customization, /phasePermissions/);
  assert.match(customization, /Phase-scoped permissions/);
  assert.match(customization, /approvalGates/);
  assert.match(customization, /AGENT_UNSAFE_PATH/);
  assert.match(customization, /Safe auxiliary paths/);
});

test('workflow vs agent-guidance contract authority is documented in architecture', async () => {
  const architecture = await fs.readFile(path.join(repoRoot, 'docs/qa-ai/architecture.md'), 'utf8');
  assert.match(architecture, /Workflow contract vs agent-guidance contract/);
  assert.match(architecture, /workflow\.v1\.json.*authoritative/s);
  assert.match(architecture, /agent-guidance\.v1\.json.*records stable\s+metadata/s);
});

test('agent-guidance contract is noted as experimental with V3 semantics in public-contracts', async () => {
  const contracts = await fs.readFile(path.join(repoRoot, 'docs/qa-ai/public-contracts.md'), 'utf8');
  assert.match(contracts, /Subject to V3 semantics/);
  assert.match(contracts, /agent-guidance\.v1\.json.*experimental/);
});

test('routing precedence, explicit selection and cache semantics are documented', async () => {
  const routing = await fs.readFile(path.join(repoRoot, 'docs/qa-ai/specialist-routing-matrix.md'), 'utf8');
  assert.match(routing, /Routing precedence/);
  assert.match(routing, /Explicit specialist selection/);
  assert.match(routing, /Cache semantics/);
  assert.match(routing, /Explicit user instruction/);
  assert.match(routing, /Never edit `active\.md` manually/);
});

test('new agent-guidance error codes are documented in troubleshooting', async () => {
  const troubleshooting = await fs.readFile(path.join(repoRoot, 'docs/qa-ai/troubleshooting.md'), 'utf8');
  const requiredCodes = [
    'AGENT_PERMISSION_PHASE_MISMATCH',
    'AGENT_EXTERNAL_WRITE_UNGOVERNED',
    'AGENT_APPROVAL_GATE_PHASE_MISMATCH',
    'AGENT_UNKNOWN_APPROVAL_GATE',
    'AGENT_UNSAFE_PATH',
    'AGENT_READONLY_MUTATION',
    'AGENT_CONTRACT_MISSING',
    'AGENT_CONTRACT_PARSE',
    'AGENT_SCHEMA_MISSING',
    'AGENT_SCHEMA_PARSE',
    'AGENT_WORKFLOW_MISSING',
    'AGENT_WORKFLOW_PARSE',
    'AGENT_CONFIG_SCHEMA_MISSING',
    'AGENT_CONFIG_SCHEMA_PARSE'
  ];
  for (const code of requiredCodes) {
    assert.match(troubleshooting, new RegExp(code), `Missing error code: ${code}`);
  }
});

test('npm-pack-allowlist includes agent-guidance contract and schema files', async () => {
  const allowlist = await fs.readFile(
    path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'npm-pack-allowlist.mjs'),
    'utf8'
  );
  assert.match(allowlist, /agent-guidance\.v1\.json/);
  assert.match(allowlist, /agent-guidance\.v1\.schema\.json/);
  assert.match(allowlist, /agent-guidance-contract\.mjs/);
});
