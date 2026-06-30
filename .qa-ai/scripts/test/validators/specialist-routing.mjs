#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { activeSpecialists, specialistCatalog, specialistsForNfrAttributes, parseSimpleYaml } from './_fixtures.mjs';
import {
  routeStrategiesForText,
  mergeRoutedSpecialists,
  specialistsFromConfig,
  STRATEGY_ROUTING_RULES
} from '../../lib/test-strategy-router.mjs';
import { validateStrategyRouting } from '../../lib/strategy-routing-validate.mjs';
import { repoRoot } from './_shared.mjs';

const EXPANSION_SPECIALISTS = [
  'analytics-tracking-agent',
  'browserstack-strategy-agent',
  'compliance-testing-agent',
  'contract-testing-agent',
  'cross-browser-device-agent',
  'data-quality-agent',
  'database-migration-agent',
  'exploratory-testing-agent',
  'i18n-l10n-agent',
  'observability-testing-agent',
  'performance-execution-agent',
  'post-deploy-validation-agent',
  'privacy-testing-agent',
  'resilience-chaos-agent',
  'security-advanced-agent',
  'test-data-agent',
  'threat-modeling-agent',
  'visual-regression-agent'
];

test('specialistCatalog: expansion pack ids exist with source files', async () => {
  for (const id of EXPANSION_SPECIALISTS) {
    assert.ok(specialistCatalog[id], `Missing catalog entry for ${id}`);
    await fs.access(path.join(repoRoot, '.qa-ai/agents/specialists/available', `${id}.md`));
  }
});

test('specialistCatalog: every catalog entry has a shipped source file', async () => {
  for (const id of Object.keys(specialistCatalog)) {
    await fs.access(path.join(repoRoot, '.qa-ai/agents/specialists/available', `${id}.md`));
  }
});

test('specialistsForNfrAttributes: security stays functional-only', () => {
  const specialists = specialistsForNfrAttributes(['security']).map(([id]) => id);
  assert.deepEqual(specialists, ['security']);
  assert.ok(!specialists.includes('security-advanced-agent'));
});

test('specialistsForNfrAttributes: maintainability includes observability specialist', () => {
  const specialists = specialistsForNfrAttributes(['maintainability']).map(([id]) => id);
  assert.deepEqual(specialists, ['maintainability', 'observability-testing-agent']);
});

test('routeStrategiesForText: privacy signal routes to privacy-testing-agent', () => {
  const routes = routeStrategiesForText('User consent and GDPR deletion must be verified.', { mode: 'advisory' });
  assert.ok(routes.some((route) => route.specialistId === 'privacy-testing-agent'));
});

test('routeStrategiesForText: BrowserStack signal routes to browserstack specialist', () => {
  const routes = routeStrategiesForText('Execute smoke on BrowserStack Automate with session video.', {
    mode: 'advisory'
  });
  assert.ok(routes.some((route) => route.specialistId === 'browserstack-strategy-agent'));
});

test('routeStrategiesForText: OpenAPI signal routes to contract-testing-agent', () => {
  const routes = routeStrategiesForText('Validate consumer against the OpenAPI schema.', { mode: 'advisory' });
  assert.ok(routes.some((route) => route.specialistId === 'contract-testing-agent'));
});

test('routeStrategiesForText: Figma signal routes to visual-regression-agent', () => {
  const routes = routeStrategiesForText('Compare layout against the new Figma redesign.', { mode: 'advisory' });
  assert.ok(routes.some((route) => route.specialistId === 'visual-regression-agent'));
});

test('routeStrategiesForText: advanced security keywords do not fire on generic security wording', () => {
  const routes = routeStrategiesForText('User authentication and authorization boundaries must be tested.', {
    mode: 'advisory'
  });
  assert.ok(!routes.some((route) => route.specialistId === 'security-advanced-agent'));
});

test('routeStrategiesForText: performance execution requires execution keywords', () => {
  const designOnly = routeStrategiesForText('Response time must stay under 500ms for checkout.', { mode: 'advisory' });
  assert.ok(!designOnly.some((route) => route.specialistId === 'performance-execution-agent'));
  const execution = routeStrategiesForText('Run a k6 load test against staging before release.', { mode: 'advisory' });
  assert.ok(execution.some((route) => route.specialistId === 'performance-execution-agent'));
});

test('activeSpecialists: manual-only preset does not auto-load expansion specialists', async () => {
  const content = await fs.readFile(path.join(repoRoot, '.qa-ai/presets/manual-only.yaml'), 'utf8');
  const config = parseSimpleYaml(content);
  const ids = activeSpecialists(config).map(([id]) => id);
  assert.ok(ids.includes('generic-test-design'));
  for (const expansionId of EXPANSION_SPECIALISTS) {
    assert.ok(!ids.includes(expansionId), `Unexpected expansion specialist active: ${expansionId}`);
  }
});

test('activeSpecialists: selenium-jest-browserstack adds selenium and browserstack strategy', async () => {
  const content = await fs.readFile(path.join(repoRoot, '.qa-ai/presets/selenium-jest-browserstack.yaml'), 'utf8');
  const config = parseSimpleYaml(content);
  const ids = activeSpecialists(config).map(([id]) => id);
  assert.ok(ids.includes('selenium'));
  assert.ok(ids.includes('browserstack-strategy-agent'));
  assert.ok(ids.includes('cross-browser-device-agent'));
  assert.ok(ids.includes('generic-test-design'));
  for (const expansionId of EXPANSION_SPECIALISTS) {
    if (expansionId === 'browserstack-strategy-agent' || expansionId === 'cross-browser-device-agent') continue;
    assert.ok(!ids.includes(expansionId), `Unexpected expansion specialist active: ${expansionId}`);
  }
});

test('specialistsFromConfig: browserstack frameworks route cloud specialists', () => {
  const specialists = specialistsFromConfig({
    automation: { ui: { framework: 'selenium-jest-browserstack' }, mobile: { framework: 'none' } }
  }).map(([id]) => id);
  assert.ok(specialists.includes('browserstack-strategy-agent'));
  assert.ok(specialists.includes('cross-browser-device-agent'));
});

test('mergeRoutedSpecialists: deduplicates nfr and keyword routes', () => {
  const nfr = specialistsForNfrAttributes(['maintainability']);
  const routes = routeStrategiesForText('Audit events must appear in structured logs.');
  const merged = mergeRoutedSpecialists(nfr, routes).map(([id]) => id);
  assert.ok(merged.includes('maintainability'));
  assert.ok(merged.includes('observability-testing-agent'));
  assert.equal(new Set(merged).size, merged.length);
});

test('STRATEGY_ROUTING_RULES: each rule references known specialists', () => {
  for (const rule of STRATEGY_ROUTING_RULES) {
    for (const specialistId of rule.specialists) {
      assert.ok(specialistCatalog[specialistId], `${rule.id} references missing specialist ${specialistId}`);
    }
  }
});

test('validateStrategyRouting: off mode skips enforcement', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-strategy-off-'));
  try {
    const result = await validateStrategyRouting(cwd, {
      config: { testDesign: { strategyRouting: { mode: 'off' } } }
    });
    assert.equal(result.ok, true, result.errors.join('\n'));
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('validateStrategyRouting: strict mode requires strategy routing section', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-strategy-strict-'));
  try {
    await fs.mkdir(path.join(cwd, 'qa-ai-output'), { recursive: true });
    await fs.writeFile(
      path.join(cwd, 'qa-ai-output/test-design-proposal.md'),
      '# Test Design Proposal\n## Official RF ID\nRF-1\n## Scope\n',
      'utf8'
    );
    const result = await validateStrategyRouting(cwd, {
      config: {
        testDesign: { strategyRouting: { mode: 'strict' }, proposalPath: 'qa-ai-output/test-design-proposal.md' }
      }
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.includes('Strategy routing decisions')));
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('validateStrategyRouting: strict mode accepts valid routing rows', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-strategy-pass-'));
  try {
    await fs.mkdir(path.join(cwd, 'qa-ai-output'), { recursive: true });
    const proposal = [
      '# Test Design Proposal',
      '## Official RF ID',
      'RF-1',
      '## Strategy routing decisions',
      '',
      '| RF | Criterion IDs | Signal | Specialist(s) | Decision | Evidence type | Rationale |',
      '| --- | ------------- | ------ | ------------- | -------- | ------------- | --------- |',
      '| RF-1 | CA-1 | gdpr | privacy-testing-agent | applicable | technical-review | privacy review |',
      ''
    ].join('\n');
    await fs.writeFile(path.join(cwd, 'qa-ai-output/test-design-proposal.md'), proposal, 'utf8');
    const result = await validateStrategyRouting(cwd, {
      config: {
        testDesign: { strategyRouting: { mode: 'strict' }, proposalPath: 'qa-ai-output/test-design-proposal.md' }
      }
    });
    assert.equal(result.ok, true, result.errors.join('\n'));
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});
