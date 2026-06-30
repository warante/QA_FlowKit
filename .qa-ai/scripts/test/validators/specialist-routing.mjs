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
import {
  validateStrategyRouting,
  resolveCriticalSignals,
  DEFAULT_CRITICAL_SIGNALS
} from '../../lib/strategy-routing-validate.mjs';
import { NFR_EVIDENCE_TYPES } from '../../lib/nfr-coverage.mjs';
import { getConfigValue } from '../../lib/utils.mjs';
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
  'mobile-advanced-agent',
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

const EVIDENCE_COLUMN_NAMES = new Set(['evidence type', 'evidence', 'qa evidence']);
const INVALID_EVIDENCE_COMBINATION = /[/+]|\s+or\s+|\s+and\s+/i;

function normalizeEvidenceCell(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function parseMarkdownTableRows(content) {
  const lines = content.split(/\r?\n/);
  const issues = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line.startsWith('|')) continue;
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length === 0) continue;
    const headerCells = cells.map((cell) => cell.toLowerCase());
    const evidenceIndexes = headerCells
      .map((name, cellIndex) => (EVIDENCE_COLUMN_NAMES.has(name) ? cellIndex : -1))
      .filter((cellIndex) => cellIndex >= 0);
    if (evidenceIndexes.length === 0) continue;
    let rowIndex = index + 1;
    while (rowIndex < lines.length) {
      const rowLine = lines[rowIndex].trim();
      if (!rowLine.startsWith('|')) break;
      if (/^\|\s*[-:]+/.test(rowLine)) {
        rowIndex += 1;
        continue;
      }
      const rowCells = rowLine
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim());
      for (const evidenceIndex of evidenceIndexes) {
        const raw = rowCells[evidenceIndex] || '';
        if (!raw || raw === '<path>' || raw.includes('<')) continue;
        if (INVALID_EVIDENCE_COMBINATION.test(raw)) {
          issues.push(`line ${rowIndex + 1}: combined evidence value "${raw}"`);
          continue;
        }
        const normalized = normalizeEvidenceCell(raw);
        if (normalized && !NFR_EVIDENCE_TYPES.includes(normalized)) {
          issues.push(`line ${rowIndex + 1}: unknown evidence type "${raw}"`);
        }
      }
      rowIndex += 1;
    }
    index = rowIndex - 1;
  }
  return issues;
}

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

test('specialist evidence templates: no invalid Evidence type values in available specialists', async () => {
  const dir = path.join(repoRoot, '.qa-ai/agents/specialists/available');
  const files = (await fs.readdir(dir)).filter((name) => name.endsWith('.md'));
  const failures = [];
  for (const file of files) {
    const content = await fs.readFile(path.join(dir, file), 'utf8');
    const issues = parseMarkdownTableRows(content);
    if (issues.length > 0) failures.push(`${file}: ${issues.join('; ')}`);
  }
  assert.equal(failures.length, 0, failures.join('\n'));
});

const STANDARD_PRESETS = [
  'playwright-full.yaml',
  'karate-full.yaml',
  'maestro-karate-mobile.yaml',
  'selenium-jest-browserstack.yaml',
  'webdriverio-playwright-api.yaml'
];

test('presets: standard track defaults strategyRouting to advisory', async () => {
  for (const preset of STANDARD_PRESETS) {
    const content = await fs.readFile(path.join(repoRoot, '.qa-ai/presets', preset), 'utf8');
    const config = parseSimpleYaml(content);
    assert.equal(
      getConfigValue(config, 'testDesign.strategyRouting.mode', 'off'),
      'advisory',
      `${preset} should use advisory strategy routing`
    );
  }
});

test('presets: manual-only keeps strategyRouting off', async () => {
  const content = await fs.readFile(path.join(repoRoot, '.qa-ai/presets/manual-only.yaml'), 'utf8');
  const config = parseSimpleYaml(content);
  assert.equal(getConfigValue(config, 'testDesign.strategyRouting.mode', 'off'), 'off');
});

test('routeStrategiesForText: mobile advanced signals route to mobile-advanced-agent', () => {
  const signals = [
    'Verify push notification opt-out after login.',
    'Open the marketing deep link on cold start.',
    'App must recover after going offline mid-checkout.',
    'Biometric login fallback when Face ID is unavailable.',
    'Camera permission denied shows graceful error.',
    'App upgrade must preserve user session data.'
  ];
  for (const text of signals) {
    const routes = routeStrategiesForText(text, { mode: 'advisory' });
    assert.ok(
      routes.some((route) => route.specialistId === 'mobile-advanced-agent'),
      `Expected mobile-advanced-agent for: ${text}`
    );
  }
});

test('routeStrategiesForText: Appium or Maestro alone do not route mobile-advanced-agent', () => {
  for (const text of ['Run Appium smoke on Android emulator.', 'Execute Maestro flows for login.']) {
    const routes = routeStrategiesForText(text, { mode: 'advisory' });
    assert.ok(!routes.some((route) => route.specialistId === 'mobile-advanced-agent'), text);
  }
});

test('activeSpecialists: maestro preset loads maestro but not mobile-advanced-agent', async () => {
  const content = await fs.readFile(path.join(repoRoot, '.qa-ai/presets/maestro-karate-mobile.yaml'), 'utf8');
  const config = parseSimpleYaml(content);
  const ids = activeSpecialists(config).map(([id]) => id);
  assert.ok(ids.includes('maestro'));
  assert.ok(!ids.includes('mobile-advanced-agent'));
});

test('routeStrategiesForText: BrowserStack plus push notification routes cloud and mobile advanced', () => {
  const routes = routeStrategiesForText('Run push notification test on BrowserStack App Automate.', {
    mode: 'advisory'
  });
  assert.ok(routes.some((route) => route.specialistId === 'browserstack-strategy-agent'));
  assert.ok(routes.some((route) => route.specialistId === 'mobile-advanced-agent'));
});

test('resolveCriticalSignals: uses defaults when not configured', () => {
  assert.deepEqual(resolveCriticalSignals({}), DEFAULT_CRITICAL_SIGNALS);
  assert.deepEqual(
    resolveCriticalSignals({ testDesign: { strategyRouting: { mode: 'strict' } } }),
    DEFAULT_CRITICAL_SIGNALS
  );
});

test('resolveCriticalSignals: normalizes trims and deduplicates', () => {
  const resolved = resolveCriticalSignals({
    testDesign: { strategyRouting: { criticalSignals: [' GDPR ', 'gdpr', 'Figma'] } }
  });
  assert.deepEqual(resolved, ['gdpr', 'figma']);
});

test('resolveCriticalSignals: empty array disables critical enforcement', () => {
  assert.deepEqual(resolveCriticalSignals({ testDesign: { strategyRouting: { criticalSignals: [] } } }), []);
});

async function writeStrictProposal(cwd, bodyLines = []) {
  await fs.mkdir(path.join(cwd, 'qa-ai-output'), { recursive: true });
  const proposal = ['# Test Design Proposal', '## Official RF ID', 'RF-1', ...bodyLines, ''].join('\n');
  await fs.writeFile(path.join(cwd, 'qa-ai-output/test-design-proposal.md'), proposal, 'utf8');
}

test('validateStrategyRouting: strict fails when configured critical signal lacks routing row', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-strategy-figma-fail-'));
  try {
    await writeStrictProposal(cwd, [
      '## Strategy routing decisions',
      '',
      '| RF | Criterion IDs | Signal | Specialist(s) | Decision | Evidence type | Rationale |',
      '| --- | ------------- | ------ | ------------- | -------- | ------------- | --------- |',
      '| RF-1 | CA-1 | unrelated | test-data-agent | applicable | test-plan | unrelated |',
      '',
      'Compare layout against the new Figma redesign.'
    ]);
    const result = await validateStrategyRouting(cwd, {
      config: {
        testDesign: {
          strategyRouting: { mode: 'strict', criticalSignals: ['figma'] },
          proposalPath: 'qa-ai-output/test-design-proposal.md'
        }
      }
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.includes('figma')));
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('validateStrategyRouting: strict passes when configured critical signal has routing row', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-strategy-figma-pass-'));
  try {
    await writeStrictProposal(cwd, [
      '## Strategy routing decisions',
      '',
      '| RF | Criterion IDs | Signal | Specialist(s) | Decision | Evidence type | Rationale |',
      '| --- | ------------- | ------ | ------------- | -------- | ------------- | --------- |',
      '| RF-1 | CA-1 | figma | visual-regression-agent | applicable | automation-script | layout parity |',
      '',
      'Compare layout against the new Figma redesign.'
    ]);
    const result = await validateStrategyRouting(cwd, {
      config: {
        testDesign: {
          strategyRouting: { mode: 'strict', criticalSignals: ['figma'] },
          proposalPath: 'qa-ai-output/test-design-proposal.md'
        }
      }
    });
    assert.equal(result.ok, true, result.errors.join('\n'));
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('validateStrategyRouting: strict with analytics event critical signal', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-strategy-analytics-'));
  try {
    await writeStrictProposal(cwd, [
      '## Strategy routing decisions',
      '',
      '| RF | Criterion IDs | Signal | Specialist(s) | Decision | Evidence type | Rationale |',
      '| --- | ------------- | ------ | ------------- | -------- | ------------- | --------- |',
      '| RF-1 | CA-1 | analytics event | analytics-tracking-agent | applicable | automation-script | event check |',
      '',
      'Verify analytics event payload on checkout.'
    ]);
    const result = await validateStrategyRouting(cwd, {
      config: {
        testDesign: {
          strategyRouting: { mode: 'strict', criticalSignals: ['analytics event'] },
          proposalPath: 'qa-ai-output/test-design-proposal.md'
        }
      }
    });
    assert.equal(result.ok, true, result.errors.join('\n'));
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('validateStrategyRouting: advisory does not enforce critical signals', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-strategy-advisory-'));
  try {
    await writeStrictProposal(cwd, ['## Scope', '', 'User consent and GDPR deletion must be verified.']);
    const result = await validateStrategyRouting(cwd, {
      config: {
        testDesign: {
          strategyRouting: { mode: 'advisory', criticalSignals: ['gdpr'] },
          proposalPath: 'qa-ai-output/test-design-proposal.md'
        }
      },
      mode: 'advisory'
    });
    assert.equal(result.ok, true, result.errors.join('\n'));
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('validateStrategyRouting: strict fails when default critical signal lacks routing row', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-strategy-gdpr-default-fail-'));
  try {
    await writeStrictProposal(cwd, [
      '## Strategy routing decisions',
      '',
      '| RF | Criterion IDs | Signal | Specialist(s) | Decision | Evidence type | Rationale |',
      '| --- | ------------- | ------ | ------------- | -------- | ------------- | --------- |',
      '| RF-1 | CA-1 | unrelated | test-data-agent | applicable | test-plan | unrelated |',
      '',
      'User consent and GDPR deletion must be verified.'
    ]);
    const result = await validateStrategyRouting(cwd, {
      config: {
        testDesign: {
          strategyRouting: { mode: 'strict' },
          proposalPath: 'qa-ai-output/test-design-proposal.md'
        }
      }
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.includes('gdpr')));
    assert.ok(result.errors.some((error) => error.includes('privacy-testing-agent')));
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('validateStrategyRouting: empty criticalSignals does not fail on gdpr text', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-strategy-empty-critical-'));
  try {
    await writeStrictProposal(cwd, [
      '## Strategy routing decisions',
      '',
      '| RF | Criterion IDs | Signal | Specialist(s) | Decision | Evidence type | Rationale |',
      '| --- | ------------- | ------ | ------------- | -------- | ------------- | --------- |',
      '| RF-1 | CA-1 | scope | test-data-agent | applicable | test-plan | placeholder |',
      '',
      'User consent and GDPR deletion must be verified.'
    ]);
    const result = await validateStrategyRouting(cwd, {
      config: {
        testDesign: {
          strategyRouting: { mode: 'strict', criticalSignals: [] },
          proposalPath: 'qa-ai-output/test-design-proposal.md'
        }
      }
    });
    assert.equal(result.ok, true, result.errors.join('\n'));
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});
