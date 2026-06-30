#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { activeSpecialistsContent } from '../../lib/project-config.mjs';
import {
  COMPACT_CONFIG_PATH,
  COMPACT_FEATURES_DIR,
  COMPACT_OUTPUT_DIR,
  DEFAULT_FEATURE_PATH,
  loadQaAiConfig,
  parseSimpleYaml,
  pathExists,
  resolveQaAiConfigPath
} from '../../lib/utils.mjs';
import { repoRoot } from './_shared.mjs';

async function copyFramework(targetRoot) {
  await fs.cp(path.join(repoRoot, '.qa-ai'), path.join(targetRoot, '.qa-ai'), { recursive: true });
}

async function writeActiveSpecialists(targetRoot, configRelPath, configText) {
  const config = parseSimpleYaml(configText);
  const content = activeSpecialistsContent(config, 'node .qa-ai/scripts/init.mjs', configRelPath);
  const activePath = path.join(targetRoot, '.qa-ai/agents/specialists/active.md');
  await fs.mkdir(path.dirname(activePath), { recursive: true });
  await fs.writeFile(activePath, content, 'utf8');
}

function runInit(targetRoot, args = []) {
  const result = spawnSync(process.execPath, [path.join(targetRoot, '.qa-ai/scripts/init.mjs'), ...args], {
    cwd: targetRoot,
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    throw new Error(`init failed (${result.status}): ${result.stderr || result.stdout}`);
  }
  return result;
}

test('config resolution: compact config when root is missing', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-cl-res-compact-'));
  await fs.mkdir(path.join(cwd, '.qa-ai'), { recursive: true });
  await fs.writeFile(path.join(cwd, COMPACT_CONFIG_PATH), 'project:\n  name: Compact\n', 'utf8');
  const info = await loadQaAiConfig(cwd);
  assert.equal(info.exists, true);
  assert.equal(info.source, 'compact');
  assert.equal(info.relPath, COMPACT_CONFIG_PATH);
});

test('config resolution: root config when only legacy exists', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-cl-res-root-'));
  await fs.writeFile(path.join(cwd, 'qa-ai.config.yaml'), 'project:\n  name: Legacy\n', 'utf8');
  const info = await loadQaAiConfig(cwd);
  assert.equal(info.exists, true);
  assert.equal(info.source, 'root');
  assert.equal(info.dualConfig, false);
});

test('config resolution: root config wins when both exist', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-cl-res-dual-'));
  await fs.mkdir(path.join(cwd, '.qa-ai'), { recursive: true });
  await fs.writeFile(path.join(cwd, 'qa-ai.config.yaml'), ['project:', '  name: Root Legacy', ''].join('\n'), 'utf8');
  await fs.writeFile(path.join(cwd, COMPACT_CONFIG_PATH), ['project:', '  name: Compact New', ''].join('\n'), 'utf8');
  const info = await loadQaAiConfig(cwd);
  assert.equal(info.source, 'root');
  assert.equal(info.dualConfig, true);
  assert.equal(info.data.project.name, 'Root Legacy');
});

test('config resolution: missing config reports compact recommended path', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-cl-res-missing-'));
  const resolved = await resolveQaAiConfigPath(cwd);
  assert.equal(resolved.source, 'missing');
  assert.equal(resolved.path, COMPACT_CONFIG_PATH);
  const info = await loadQaAiConfig(cwd);
  assert.equal(info.exists, false);
});

test('doctor warns on duplicate config without failing', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-cl-doctor-dual-'));
  await copyFramework(cwd);
  const preset = (await fs.readFile(path.join(repoRoot, '.qa-ai/presets/manual-only.yaml'), 'utf8')).replaceAll(
    'CHANGE_ME',
    'Dual'
  );
  await fs.writeFile(path.join(cwd, 'qa-ai.config.yaml'), preset, 'utf8');
  await writeActiveSpecialists(cwd, 'qa-ai.config.yaml', preset);
  await fs.writeFile(path.join(cwd, COMPACT_CONFIG_PATH), 'project:\n  name: Compact Duplicate\n', 'utf8');
  await fs.mkdir(path.join(cwd, '.qa-ai/features'), { recursive: true });
  await fs.mkdir(path.join(cwd, '.qa-ai/output'), { recursive: true });
  const result = spawnSync(process.execPath, [path.join(cwd, '.qa-ai/scripts/doctor.mjs')], {
    cwd,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /duplicate config/i);
});

test('init compact layout: writes config under .qa-ai and avoids root pollution', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-cl-init-compact-'));
  await copyFramework(cwd);
  runInit(cwd, ['--no-adapters', '--preset', 'manual-only']);

  assert.equal(await pathExists(path.join(cwd, COMPACT_CONFIG_PATH)), true);
  assert.equal(await pathExists(path.join(cwd, 'qa-ai.config.yaml')), false);
  assert.equal(await pathExists(path.join(cwd, 'qa-ai-output')), false);
  assert.equal(await pathExists(path.join(cwd, 'features')), false);
  assert.equal(await pathExists(path.join(cwd, 'tests')), false);
  assert.equal(await pathExists(path.join(cwd, COMPACT_FEATURES_DIR, 'api')), false);
  assert.equal(await pathExists(path.join(cwd, COMPACT_FEATURES_DIR, 'e2e')), false);

  const config = parseSimpleYaml(await fs.readFile(path.join(cwd, COMPACT_CONFIG_PATH), 'utf8'));
  assert.equal(config.gherkin.featurePath.replaceAll('\\', '/'), DEFAULT_FEATURE_PATH.replaceAll('\\', '/'));
  assert.match(config.testDesign.proposalPath, /^\.qa-ai\/output\//);
  assert.equal(config.testDesign.strategyRouting.mode, 'off');
});

test('init compact layout: playwright preset uses compact automation paths', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-cl-init-pw-'));
  await copyFramework(cwd);
  runInit(cwd, ['--no-adapters', '--preset', 'playwright-full']);
  const config = parseSimpleYaml(await fs.readFile(path.join(cwd, COMPACT_CONFIG_PATH), 'utf8'));
  assert.equal(config.automation.ui.specsPath, '.qa-ai/tests/playwright/ui');
  assert.equal(config.automation.api.specsPath, '.qa-ai/tests/playwright/api');
  assert.equal(config.testDesign.strategyRouting.mode, 'advisory');
});

test('show-config resolves Spanish languages from compact config without root file', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-cl-show-config-es-'));
  await copyFramework(cwd);
  runInit(cwd, [
    '--no-adapters',
    '--preset',
    'playwright-full',
    '--interface-language',
    'es',
    '--gherkin-language',
    'es'
  ]);
  assert.equal(await pathExists(path.join(cwd, 'qa-ai.config.yaml')), false);
  const { resolveProjectConfigSummary } = await import('../../lib/config-resolve.mjs');
  const summary = await resolveProjectConfigSummary(cwd);
  assert.equal(summary.ok, true);
  assert.equal(summary.configPath, COMPACT_CONFIG_PATH);
  assert.equal(summary.source, 'compact');
  assert.equal(summary.interfaceLanguage, 'es');
  assert.equal(summary.gherkinLanguage, 'es');
  const result = spawnSync(process.execPath, [path.join(cwd, '.qa-ai/scripts/show-config.mjs'), '--json'], {
    cwd,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const json = JSON.parse(result.stdout.trim());
  assert.equal(json.interfaceLanguage, 'es');
  assert.equal(json.gherkinLanguage, 'es');
});

test('legacy project: root config and legacy paths still load', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-cl-legacy-'));
  await copyFramework(cwd);
  const legacyPreset = (await fs.readFile(path.join(repoRoot, '.qa-ai/presets/manual-only.yaml'), 'utf8'))
    .replaceAll('.qa-ai/output/', 'qa-ai-output/')
    .replaceAll('featurePath: .qa-ai/features', 'featurePath: features');
  const legacyConfig = legacyPreset.replaceAll('CHANGE_ME', 'Legacy');
  await fs.writeFile(path.join(cwd, 'qa-ai.config.yaml'), legacyConfig, 'utf8');
  await writeActiveSpecialists(cwd, 'qa-ai.config.yaml', legacyConfig);
  await fs.mkdir(path.join(cwd, 'features'), { recursive: true });
  await fs.mkdir(path.join(cwd, 'qa-ai-output'), { recursive: true });

  const info = await loadQaAiConfig(cwd);
  assert.equal(info.source, 'root');
  assert.equal(info.data.gherkin.featurePath, 'features');

  const doctor = spawnSync(process.execPath, [path.join(cwd, '.qa-ai/scripts/doctor.mjs')], {
    cwd,
    encoding: 'utf8'
  });
  assert.equal(doctor.status, 0, doctor.stderr || doctor.stdout);
});

test('organize-features creates subfolder lazily', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-cl-lazy-feature-'));
  await copyFramework(cwd);
  runInit(cwd, ['--no-adapters', '--preset', 'manual-only']);
  const featureRoot = path.join(cwd, COMPACT_FEATURES_DIR);
  await fs.writeFile(
    path.join(featureRoot, 'RF-101-TC-001-login.feature'),
    [
      '@priority:high @type:functional @manual:false @rf:RF-101 @id:TC-001',
      'Feature: Login',
      '',
      'Acceptance Criteria:',
      '- User can sign in',
      '',
      'Scenario: RF-101 TC-001 login',
      '  Given valid credentials',
      '  When the user signs in',
      '  Then the home page is shown',
      ''
    ].join('\n'),
    'utf8'
  );
  assert.equal(await pathExists(path.join(featureRoot, 'functional')), false);
  const result = spawnSync(process.execPath, [path.join(cwd, '.qa-ai/scripts/organize-features.mjs')], {
    cwd,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(await pathExists(path.join(featureRoot, 'functional', 'RF-101-TC-001-login.feature')), true);
});
