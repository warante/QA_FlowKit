#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { checkPhase, nextPhase } from '../../lib/harness-controller.mjs';
import { hashFile } from '../../lib/utils.mjs';
import { ARTIFACT_PATHS, QA_OUTPUT_DIR } from '../../lib/artifact-paths.mjs';
import { copyFramework } from '../lib/integration-helpers.mjs';

export const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const cli = path.join(sourceRoot, 'bin', 'qa-flowkit.mjs');
export const node = process.execPath;

export { copyFramework };

export async function writeConfig(targetRoot, overrides = {}) {
  const base = {
    version: 1,
    project: {
      name: 'Harness Test',
      repoMode: 'qa-design-only',
      qaTrack: 'standard',
      defaultLanguage: 'en',
      interfaceLanguage: 'en'
    },
    tools: { testManagement: 'none', issueTracker: 'none', documentation: 'markdown' },
    knowledge: { enabled: false },
    sources: {
      external: {
        enabled: false,
        requirementsImportPath: ARTIFACT_PATHS.importedRequirements,
        casesImportPath: ARTIFACT_PATHS.importedCases
      }
    },
    requirements: { requireOfficialRfId: true },
    gherkin: { language: 'en', featurePath: 'features' },
    testDesign: {
      proposalPath: ARTIFACT_PATHS.testDesignProposal,
      systemPath: ARTIFACT_PATHS.testDesignSystem,
      quality: {
        mode: 'off',
        reportPath: ARTIFACT_PATHS.gherkinQualityReport,
        minDimensionsPassed: 7
      }
    },
    traceability: { matrixPath: ARTIFACT_PATHS.traceabilityMatrix },
    automation: { ui: { framework: 'none' }, api: { framework: 'none' } },
    release: { gatePath: ARTIFACT_PATHS.releaseGate }
  };
  const merged = JSON.parse(JSON.stringify(base));
  Object.assign(merged.project, overrides.project || {});
  if (overrides.tools) Object.assign(merged.tools, overrides.tools);
  if (overrides.knowledge) Object.assign(merged.knowledge, overrides.knowledge);
  if (overrides.sources?.external) Object.assign(merged.sources.external, overrides.sources.external);
  if (overrides.automation) Object.assign(merged.automation, overrides.automation);
  if (overrides.gherkin) Object.assign(merged.gherkin, overrides.gherkin);
  if (overrides.testDesign?.quality) Object.assign(merged.testDesign.quality, overrides.testDesign.quality);
  if (overrides.testManagementSync) merged.testManagementSync = overrides.testManagementSync;

  const lines = [
    'version: 1',
    'project:',
    `  name: ${merged.project.name}`,
    `  repoMode: ${merged.project.repoMode}`,
    `  qaTrack: ${merged.project.qaTrack}`,
    `  defaultLanguage: ${merged.project.defaultLanguage}`,
    `  interfaceLanguage: ${merged.project.interfaceLanguage}`,
    'tools:',
    `  testManagement: ${merged.tools.testManagement}`,
    `  issueTracker: ${merged.tools.issueTracker}`,
    'knowledge:',
    `  enabled: ${merged.knowledge.enabled}`,
    'sources:',
    '  external:',
    `    enabled: ${merged.sources.external.enabled}`,
    `    requirementsImportPath: ${merged.sources.external.requirementsImportPath}`,
    `    casesImportPath: ${merged.sources.external.casesImportPath}`,
    'requirements:',
    '  requireOfficialRfId: true',
    'gherkin:',
    '  language: en',
    `  featurePath: ${merged.gherkin.featurePath}`,
    'testDesign:',
    `  proposalPath: ${ARTIFACT_PATHS.testDesignProposal}`,
    `  systemPath: ${ARTIFACT_PATHS.testDesignSystem}`,
    '  quality:',
    `    mode: ${merged.testDesign.quality.mode}`,
    `    reportPath: ${merged.testDesign.quality.reportPath}`,
    `    minDimensionsPassed: ${merged.testDesign.quality.minDimensionsPassed}`,
    'traceability:',
    `  matrixPath: ${ARTIFACT_PATHS.traceabilityMatrix}`,
    'automation:',
    '  ui:',
    `    framework: ${merged.automation.ui.framework}`,
    '  api:',
    `    framework: ${merged.automation.api.framework}`,
    'release:',
    `  gatePath: ${merged.release.gatePath}`
  ];

  if (merged.testManagementSync) {
    lines.push('testManagementSync:');
    lines.push(`  mode: ${merged.testManagementSync.mode}`);
    lines.push(`  diffPath: ${merged.testManagementSync.diffPath}`);
    lines.push(`  applyLogPath: ${merged.testManagementSync.applyLogPath}`);
    lines.push(`  rollbackPath: ${merged.testManagementSync.rollbackPath}`);
    lines.push(`  remoteSnapshotPath: ${merged.testManagementSync.remoteSnapshotPath}`);
  }

  lines.push('');

  await fs.mkdir(path.join(targetRoot, QA_OUTPUT_DIR), { recursive: true });
  await fs.mkdir(path.join(targetRoot, 'features'), { recursive: true });
  await fs.writeFile(path.join(targetRoot, 'qa-ai.config.yaml'), lines.join('\n'), 'utf8');
}

export async function prepareRepo(track = 'standard', extra = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-harness-'));
  await copyFramework(dir);
  await writeConfig(dir, { project: { qaTrack: track }, ...extra });
  return dir;
}

export async function writeCustomValidator(cwd, { exitCode = 1, ok = false } = {}) {
  await fs.mkdir(path.join(cwd, 'qa-custom'), { recursive: true });
  await fs.writeFile(
    path.join(cwd, 'qa-custom', 'validate-custom.mjs'),
    [
      '#!/usr/bin/env node',
      'const args = new Set(process.argv.slice(2));',
      'if (args.has("--self-test")) {',
      '  console.log(JSON.stringify({ ok: true, findings: [] }));',
      '  process.exit(0);',
      '}',
      `console.log(JSON.stringify({ ok: ${ok}, findings: ${ok ? '[]' : '[{ file: "features/bad.feature", message: "Custom warning", severity: "error" }]'} }));`,
      `process.exit(${exitCode});`,
      ''
    ].join('\n'),
    'utf8'
  );
}

export function runCli(cwd, args, { expectFailure = false } = {}) {
  const result = spawnSync(node, [cli, ...args], { cwd, encoding: 'utf8', shell: false });
  const failed = result.status !== 0;
  if (expectFailure ? !failed : failed) {
    throw new Error(`CLI failed: qa-flowkit ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  }
  return result;
}

export function sleep(ms) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

export async function writeValidGherkinFeature(cwd, relativePath = 'features/RF-9-TC-001-sample.feature') {
  const featurePath = path.join(cwd, relativePath);
  await fs.mkdir(path.dirname(featurePath), { recursive: true });
  await fs.writeFile(
    featurePath,
    `@priority:high @type:functional @manual:true @rf:RF-9 @id:TC-001
Feature: Sample
  Acceptance Criteria:
    - Sample passes validation

  Scenario: RF-9 TC-001 Sample scenario
    Given a precondition
    When an action happens
    Then the outcome is visible
`,
    'utf8'
  );
}

export async function writeValidQualityReport(cwd, featureRel = 'features/functional/RF-9-TC-001-sample.feature') {
  await writeValidGherkinFeature(cwd, featureRel);
  const hash = await hashFile(path.join(cwd, featureRel));
  const dimensions = [
    'requirement-fidelity',
    'observability',
    'atomicity',
    'determinism',
    'data-independence',
    'ui-overspecification',
    'language-clarity',
    'source-criterion-alignment'
  ];
  const rows = dimensions.map(
    (dimension) => `| ${dimension} | ${dimension} criterion | pass | "Then the outcome is visible" |`
  );
  await fs.mkdir(path.join(cwd, QA_OUTPUT_DIR), { recursive: true });
  await fs.writeFile(
    path.join(cwd, ARTIFACT_PATHS.gherkinQualityReport),
    [
      '# Gherkin Quality Report',
      '- Rubric Version: 1',
      '- Run ID: RUN-001',
      '- RF ID: RF-9',
      '- Evaluation Date: 2026-06-18T00:00:00Z',
      '',
      '## Evaluated Files',
      '',
      '| File | Content hash |',
      '| ---- | ------------ |',
      `| ${featureRel} | ${hash} |`,
      '',
      `## File: ${featureRel}`,
      '',
      '| Dimension | Criterion | Verdict (pass/fail) | Evidence (quoted line) |',
      '| --------- | --------- | ------------------- | ---------------------- |',
      ...rows,
      '',
      '## Summary',
      '',
      '| File | Dimensions passed | Verdict |',
      '| ---- | ----------------- | ------- |',
      `| ${featureRel} | ${dimensions.length} | pass |`,
      ''
    ].join('\n'),
    'utf8'
  );
}
export async function writePhaseOutput(cwd, phaseId) {
  const outputs = {
    intake: ARTIFACT_PATHS.requirementAnalysis,
    normalize: ARTIFACT_PATHS.normalizedRequirements,
    gherkin: 'features/sample.feature',
    traceability: ARTIFACT_PATHS.traceabilityMatrix,
    pr: ARTIFACT_PATHS.prSummary
  };
  const target = outputs[phaseId];
  if (!target) return;
  const absolute = path.join(cwd, target);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, phaseId === 'gherkin' ? 'Feature: sample\n' : '# ok\n', 'utf8');
}

export async function advanceToPhase(cwd, targetPhaseId) {
  let packet = await nextPhase(cwd);
  let guard = 0;
  while (packet.phase && packet.phase.id !== targetPhaseId && guard++ < 12) {
    if (packet.blockers?.length) return packet;
    await writePhaseOutput(cwd, packet.phase.id);
    const result = await checkPhase(cwd);
    if (!result.ok) return packet;
    packet = await nextPhase(cwd);
  }
  return packet;
}
