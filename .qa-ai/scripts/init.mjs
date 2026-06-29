#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs/promises';
import {
  defaultKarateApiSpecsPath,
  defaultKarateConfigPath,
  defaultKarateUiSpecsPath,
  isKarateFramework
} from './lib/automation-framework.mjs';
import { activeSpecialistsContent, configuredDirs, isConfiguredFramework, slug } from './lib/project-config.mjs';
import { FEATURE_SUBFOLDERS } from './lib/feature-layout.mjs';
import { defaultInitAdapters } from './lib/detect-adapters.mjs';
import { validateConfigContent } from './lib/config-schema.mjs';
import {
  commaList,
  ensureDir,
  getConfigValue,
  findChangeMeKeys,
  loadQaAiConfig,
  manifestEntry,
  manifestPath,
  parseArgs,
  parseSimpleYaml,
  pathExists,
  recordManifestEntries,
  readText,
  relativeTo,
  resolveRepoPath,
  writeFileSafe,
  yamlScalar,
  logHeader
} from './lib/utils.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);
const force = Boolean(args.force);
const withDocTemplates = Boolean(args['with-doc-templates'] || args.withDocTemplates);
const withTestManagementMapping = Boolean(args['with-test-management-mapping'] || args.withTestManagementMapping);
const withFeatureFolders = !(args['no-feature-folders'] || args.noFeatureFolders);
const withCi = args['with-ci'] || args.withCi;
const presetName = args.preset || 'playwright-full';
const withKarateConfig = Boolean(args['with-karate-config'] || args.withKarateConfig || presetName === 'karate-full');
const interfaceLanguage = normalizeLanguage(
  args['interface-language'] || args.interfaceLanguage || 'en',
  'interface language'
);
const gherkinLanguage = normalizeLanguage(
  args['gherkin-language'] || args.gherkinLanguage || args.gherkin || 'en',
  'Gherkin language'
);
let validatedQaContextPath = null;
const qaAiDir = path.join(cwd, '.qa-ai');
const presetsDir = path.join(qaAiDir, 'presets');
const presetPath = path.join(qaAiDir, 'presets', `${presetName}.yaml`);

function isKarateConfigured(cfg) {
  return (
    isKarateFramework(getConfigValue(cfg, 'automation.api.framework', '')) ||
    isKarateFramework(getConfigValue(cfg, 'automation.ui.framework', ''))
  );
}

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/init.mjs [options]

Options:
  --preset <name>          Base template from .qa-ai/presets (default: playwright-full)
  --project-name <name>    Project name for qa-ai.config.yaml (default: package.json name or folder name)
  --test-management-project <name> Test management project name (default: project name when enabled)
  --interface-language <en|es> User-facing workflow language (default: en)
  --gherkin-language <en|es>   Gherkin feature language (default: en)
  --requirements-source <name> Primary requirement source, for example markdown, jira, confluence
  --test-management-tool <name> Test management tool, for example none, testrail, zephyr, xray
  --issue-tracker <name>   Issue tracker, for example none, jira, github
  --qa-track <name>        QA workflow depth: quick, standard, enterprise (default from preset)
  --qa-context <path>      Repo-local folder with QA working-practice docs for agent-assisted init
  --ui-framework <name>    UI/E2E framework, or none/undecided
  --api-framework <name>   API/integration framework, or none/undecided
  --mobile-framework <name> Mobile framework, or none/undecided
  --ui-specs-path <path>   UI/E2E specs directory
  --ui-page-objects-path <path> UI page objects directory
  --api-specs-path <path>  API/integration specs directory
  --mobile-flows-path <path> Mobile automation flows directory
  --specialist-mode <auto|off|required> Specialist agent activation mode (default from base template)
  --set <key=value>        Repeatable scalar config override, for example automation.ui.framework=cypress
  --adapters <list>        Comma-separated adapters to generate, or "all" (default: detected hosts plus generic)
  --adapter <name>         Repeatable single adapter name
  --no-adapters            Skip adapter generation
  --no-interactive         Do not show interactive setup prompts
  --no-feature-folders     Skip canonical feature subfolder and .gitkeep creation
  --with-doc-templates     Generate starter QA docs under qa-ai-output/
  --with-test-management-mapping Generate the configured test management mapping file
  --with-karate-config         Create tests/karate/karate-config.js from template when Karate is used
  --force                  Overwrite generated files when they already exist
  --help                   Show this help
`);
}

async function availablePresets() {
  if (!(await pathExists(presetsDir))) return [];
  const entries = await fs.readdir(presetsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.yaml'))
    .map((entry) => path.basename(entry.name, '.yaml'))
    .sort();
}

function normalizeLanguage(value, label = 'language') {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (['es', 'esp', 'spa', 'spanish', 'espanol', 'español'].includes(normalized)) return 'es';
  if (['en', 'eng', 'english', 'ingles', 'inglés'].includes(normalized)) return 'en';
  console.error(`Unsupported ${label}: ${value}. Use "en" or "es".`);
  process.exit(1);
}

function scalarOverrideValue(value) {
  if (value === undefined || value === null || value === false) return null;
  return yamlScalar(String(value));
}

async function derivedProjectName() {
  const explicit = args['project-name'] || args.projectName;
  if (explicit) return String(explicit).trim();
  const packageJsonPath = path.join(cwd, 'package.json');
  if (await pathExists(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(await readText(packageJsonPath));
      if (typeof packageJson.name === 'string' && packageJson.name.trim()) return packageJson.name.trim();
    } catch {
      // Invalid package.json should not block init; fall back to the folder name.
    }
  }
  return path.basename(cwd);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function selectedQaContextPath() {
  const values = commaList(args['qa-context'] || args.qaContext || args['qa-context-path'] || args.qaContextPath);
  if (values.length === 0) return null;
  if (values.length > 1) {
    console.error('Only one --qa-context folder is supported in the MVP.');
    process.exit(1);
  }
  return values[0];
}

function setSimpleYamlScalar(content, keyPath, value) {
  const parts = String(keyPath || '')
    .split('.')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return content;

  const lines = content.replace(/\r/g, '').split('\n');
  let searchStart = 0;
  let parentIndent = -1;

  for (let depth = 0; depth < parts.length - 1; depth += 1) {
    const key = parts[depth];
    const pattern = new RegExp(`^(\\s*)${escapeRegExp(key)}:\\s*$`);
    let foundIndex = -1;
    let foundIndent = -1;
    for (let i = searchStart; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line.trim() || line.trim().startsWith('#')) continue;
      const indent = line.match(/^ */)?.[0].length ?? 0;
      if (parentIndent >= 0 && indent <= parentIndent) break;
      const match = line.match(pattern);
      if (match) {
        foundIndex = i;
        foundIndent = match[1].length;
        break;
      }
    }
    if (foundIndex === -1) return content;
    searchStart = foundIndex + 1;
    parentIndent = foundIndent;
  }

  const target = parts.at(-1);
  const targetPattern = new RegExp(`^(\\s*)${escapeRegExp(target)}:\\s*.*$`);
  for (let i = searchStart; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const indent = line.match(/^ */)?.[0].length ?? 0;
    if (parentIndent >= 0 && indent <= parentIndent) break;
    const match = line.match(targetPattern);
    if (match) {
      lines[i] = `${match[1]}${target}: ${value}`;
      return lines.join('\n');
    }
  }

  const indent = parentIndent >= 0 ? ' '.repeat(parentIndent + 2) : '';
  lines.splice(searchStart, 0, `${indent}${target}: ${value}`);
  return lines.join('\n');
}

function configOverrides(currentConfig = {}, projectName) {
  const uiFramework = args['ui-framework'] || args.uiFramework;
  const apiFramework = args['api-framework'] || args.apiFramework;
  const mobileFramework = args['mobile-framework'] || args.mobileFramework;
  const testManagementTool = args['test-management-tool'] || args.testManagementTool;
  const uiSpecsPath = args['ui-specs-path'] || args.uiSpecsPath;
  const uiPageObjectsPath = args['ui-page-objects-path'] || args.uiPageObjectsPath;
  const apiSpecsPath = args['api-specs-path'] || args.apiSpecsPath;
  const mobileFlowsPath = args['mobile-flows-path'] || args.mobileFlowsPath;
  const normalizedUiFramework = slug(uiFramework);
  const normalizedApiFramework = slug(apiFramework);
  const normalizedMobileFramework = slug(mobileFramework);
  const currentUiFramework = slug(getConfigValue(currentConfig, 'automation.ui.framework', ''));
  const currentApiFramework = slug(getConfigValue(currentConfig, 'automation.api.framework', ''));
  const currentMobileFramework = slug(getConfigValue(currentConfig, 'automation.mobile.framework', ''));
  const overrides = [
    ['project.name', projectName],
    ['project.defaultLanguage', interfaceLanguage],
    ['project.interfaceLanguage', interfaceLanguage],
    ['project.qaTrack', args['qa-track'] || args.qaTrack],
    ['gherkin.language', gherkinLanguage],
    ['knowledge.enabled', validatedQaContextPath ? 'true' : undefined],
    ['knowledge.sourcePath', validatedQaContextPath],
    ['sources.main', args['requirements-source'] || args.requirementsSource],
    ['tools.testManagement', testManagementTool],
    ['tools.issueTracker', args['issue-tracker'] || args.issueTracker],
    ['agents.specialistMode', args['specialist-mode'] || args.specialistMode],
    ['automation.ui.framework', uiFramework],
    ['automation.api.framework', apiFramework],
    ['automation.mobile.framework', mobileFramework],
    ['automation.ui.specsPath', uiSpecsPath],
    ['automation.ui.pageObjectsPath', uiPageObjectsPath],
    ['automation.api.specsPath', apiSpecsPath],
    ['automation.mobile.flowsPath', mobileFlowsPath]
  ];

  if (uiFramework && normalizedUiFramework !== currentUiFramework && !uiSpecsPath && isKarateFramework(uiFramework)) {
    overrides.push(['automation.ui.specsPath', defaultKarateUiSpecsPath()]);
    overrides.push(['automation.ui.pageObjectsPath', '']);
  } else if (
    uiFramework &&
    normalizedUiFramework !== currentUiFramework &&
    !uiSpecsPath &&
    normalizedUiFramework !== 'webdriverio'
  ) {
    overrides.push([
      'automation.ui.specsPath',
      isConfiguredFramework(uiFramework) ? ['tests', slug(uiFramework), 'specs'].join('/') : ''
    ]);
  }
  if (
    uiFramework &&
    normalizedUiFramework !== currentUiFramework &&
    !uiPageObjectsPath &&
    isKarateFramework(uiFramework)
  ) {
    overrides.push(['automation.ui.pageObjectsPath', '']);
  } else if (
    uiFramework &&
    normalizedUiFramework !== currentUiFramework &&
    !uiPageObjectsPath &&
    normalizedUiFramework !== 'webdriverio'
  ) {
    overrides.push([
      'automation.ui.pageObjectsPath',
      isConfiguredFramework(uiFramework) ? ['tests', slug(uiFramework), 'pageobjects'].join('/') : ''
    ]);
  }
  if (
    apiFramework &&
    normalizedApiFramework !== currentApiFramework &&
    !apiSpecsPath &&
    isKarateFramework(apiFramework)
  ) {
    overrides.push(['automation.api.specsPath', defaultKarateApiSpecsPath()]);
  } else if (
    apiFramework &&
    normalizedApiFramework !== currentApiFramework &&
    !apiSpecsPath &&
    normalizedApiFramework !== 'playwright-api'
  ) {
    overrides.push([
      'automation.api.specsPath',
      isConfiguredFramework(apiFramework) ? ['tests', slug(apiFramework), 'specs'].join('/') : ''
    ]);
  }
  if (mobileFramework && normalizedMobileFramework !== currentMobileFramework && !mobileFlowsPath) {
    overrides.push([
      'automation.mobile.flowsPath',
      isConfiguredFramework(mobileFramework) ? ['tests', slug(mobileFramework), 'flows'].join('/') : ''
    ]);
  }
  if (testManagementTool) {
    const isTestrail = String(testManagementTool).trim().toLowerCase() === 'testrail';
    overrides.push(['testrail.enabled', isTestrail ? 'true' : 'false']);
    if (!isTestrail) overrides.push(['testrail.mappingFile', '']);
  }

  const effectiveTestManagementTool = testManagementTool || getConfigValue(currentConfig, 'tools.testManagement', '');
  const testrailEnabled = isEnabled(getConfigValue(currentConfig, 'testrail.enabled', false));
  const hasTestManagement =
    isConfiguredTool(effectiveTestManagementTool) ||
    testrailEnabled ||
    String(effectiveTestManagementTool || '')
      .trim()
      .toLowerCase() === 'testrail';
  if (hasTestManagement) {
    overrides.push([
      'testrail.projectName',
      args['test-management-project'] || args.testManagementProject || projectName
    ]);
  }

  for (const item of commaList(args.set)) {
    const equalsIndex = item.indexOf('=');
    if (equalsIndex <= 0) {
      console.error(`Invalid --set value: ${item}. Use key.path=value.`);
      process.exit(1);
    }
    overrides.push([item.slice(0, equalsIndex).trim(), item.slice(equalsIndex + 1).trim()]);
  }

  return overrides.map(([key, value]) => [key, scalarOverrideValue(value)]).filter(([, value]) => value !== null);
}

function isEnabled(value) {
  return (
    value === true ||
    String(value || '')
      .trim()
      .toLowerCase() === 'true'
  );
}

function isConfiguredTool(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return Boolean(normalized) && !['none', 'undecided', 'n/a', 'na'].includes(normalized);
}

function personalizeConfig(content, projectName) {
  let updated = content;
  const currentConfig = parseSimpleYaml(updated);
  for (const [key, value] of configOverrides(currentConfig, projectName)) {
    updated = setSimpleYamlScalar(updated, key, value);
  }
  return updated;
}

function assertNoChangeMe(content) {
  const keys = findChangeMeKeys(content);
  if (keys.length === 0) return;
  console.error('Generated qa-ai.config.yaml still contains CHANGE_ME placeholders:');
  for (const key of keys) console.error(`- ${key}`);
  console.error('Pass explicit init flags or --set key=value overrides for these keys.');
  process.exit(1);
}

async function assertValidConfig(content) {
  const result = await validateConfigContent(content, cwd);
  if (result.ok) return;
  console.error('Generated qa-ai.config.yaml failed schema validation:');
  for (const error of result.errors) console.error(`- ${error}`);
  process.exit(1);
}

function shouldPromptForAdapters() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY && !process.env.CI && !args['no-interactive']);
}

async function promptAdapterSelection(defaultAdapters) {
  if (!shouldPromptForAdapters()) return defaultAdapters;

  const choices = [
    ['1', 'Auto-detect this repository', '__auto__'],
    ['2', 'Claude Code slash commands', 'claude'],
    ['3', 'OpenCode slash commands', 'opencode'],
    ['4', 'Codex adapter instructions', 'codex'],
    ['5', 'Gemini CLI context', 'gemini'],
    ['6', 'Generic AGENTS.md only', 'generic'],
    ['7', 'All adapters', 'all'],
    ['8', 'None', '__none__']
  ];
  const choiceMap = new Map([
    ...choices.map(([number, , value]) => [number, value]),
    ['auto', '__auto__'],
    ['detect', '__auto__'],
    ['none', '__none__']
  ]);
  const valueSet = new Set(choices.map(([, , value]) => value));
  const defaultLabel = defaultAdapters.length > 0 ? defaultAdapters.join(', ') : 'none';

  console.log('\nSelect AI coding CLI adapter(s):');
  for (const [number, label, value] of choices) {
    const suffix = value === '__auto__' ? ` (default: ${defaultLabel})` : '';
    console.log(`  ${number}. ${label}${suffix}`);
  }
  console.log('Use comma-separated numbers or adapter names, for example "2,3".');

  const { createInterface } = await import('node:readline/promises');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let answer;
  try {
    answer = await rl.question('Adapter selection [1]: ');
  } finally {
    rl.close();
  }

  const tokens = String(answer || '1')
    .split(/[,\s]+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  const selected = tokens.map((token) => choiceMap.get(token) || token);

  const invalid = selected.filter((value) => !valueSet.has(value));
  if (invalid.length > 0) {
    console.error(`Unknown adapter selection: ${invalid.join(', ')}`);
    console.error('Use one or more of: claude, opencode, codex, gemini, generic, all, none.');
    process.exit(1);
  }
  if (selected.includes('__auto__')) return defaultAdapters;
  if (selected.includes('__none__')) {
    if (selected.length > 1) {
      console.error('Adapter selection "none" cannot be combined with other adapters.');
      process.exit(1);
    }
    return [];
  }
  if (selected.includes('all')) return ['all'];
  return [...new Set(selected)];
}

async function selectedAdapters() {
  if (args['no-adapters']) return [];
  const requested = [...commaList(args.adapters), ...commaList(args.adapter)].map((name) => name.toLowerCase());
  if (requested.length === 0) return promptAdapterSelection(await defaultInitAdapters(cwd));
  if (requested.includes('all')) return ['all'];
  return [...new Set(requested)];
}

async function maybePrintClaudePluginHint() {
  const claudeDir = path.join(cwd, '.claude');
  if (!(await pathExists(claudeDir))) return;
  const localMarketplace = path.join(cwd, '.claude-plugin', 'marketplace.json');
  if (await pathExists(localMarketplace)) return;
  console.log(
    '\nClaude Code plugin tip: install the QA FlowKit plugin with `claude marketplace add warante/QA_FlowKit` for namespaced skills and hooks.'
  );
}

function generatedDocs(config) {
  const docs = [
    ['templates/requirement-analysis.template.md', 'qa-ai-output/requirement-analysis.md'],
    ['templates/source-analysis.template.md', 'qa-ai-output/source-analysis.md'],
    ['templates/test-management-coverage-analysis.template.md', 'qa-ai-output/test-management-coverage-analysis.md'],
    ['templates/test-design-system.template.md', 'qa-ai-output/test-design-system.md'],
    ['templates/test-design-proposal.template.md', 'qa-ai-output/test-design-proposal.md'],
    ['templates/automation-feasibility-report.template.md', 'qa-ai-output/automation-feasibility-report.md'],
    ['templates/automation-implementation-plan.template.md', 'qa-ai-output/automation-implementation-plan.md'],
    ['templates/traceability-matrix.template.md', 'qa-ai-output/traceability-matrix.md'],
    ['templates/test-management-sync-plan.template.md', 'qa-ai-output/test-management-sync-plan.md'],
    ['templates/jira-automation-task.template.md', 'qa-ai-output/jira-automation-task.md'],
    ['templates/pr-template.md', 'qa-ai-output/pr-summary.md'],
    ['templates/release-gate.template.yaml', 'qa-ai-output/release-gate.yaml'],
    ['templates/qa-custom/validate-naming.example.mjs', 'qa-custom/validate-naming.example.mjs']
  ];

  if (getConfigValue(config, 'testManagementSync.mode', 'proposal-only') === 'governed') {
    const diffPath = getConfigValue(config, 'testManagementSync.diffPath', 'qa-ai-output/test-management-sync-diff.md');
    const snapshotPath = getConfigValue(
      config,
      'testManagementSync.remoteSnapshotPath',
      'qa-ai-output/test-management-remote-snapshot.md'
    );
    const rollbackPath = getConfigValue(
      config,
      'testManagementSync.rollbackPath',
      'qa-ai-output/test-management-rollback-plan.md'
    );
    const applyLogPath = getConfigValue(
      config,
      'testManagementSync.applyLogPath',
      'qa-ai-output/test-management-apply-log.md'
    );
    docs.push(
      ['templates/test-management-sync-diff.template.md', diffPath],
      ['templates/test-management-remote-snapshot.template.md', snapshotPath],
      ['templates/test-management-rollback-plan.template.md', rollbackPath],
      ['templates/test-management-apply-log.template.md', applyLogPath]
    );
  }

  if (getConfigValue(config, 'sources.external.enabled', false)) {
    const reqImportPath = getConfigValue(
      config,
      'sources.external.requirementsImportPath',
      'qa-ai-output/imported-requirements.md'
    );
    const casesImportPath = getConfigValue(
      config,
      'sources.external.casesImportPath',
      'qa-ai-output/imported-cases.md'
    );
    docs.push(
      ['templates/imported-requirements.template.md', reqImportPath],
      ['templates/imported-cases.template.md', casesImportPath]
    );
  }

  return docs;
}

async function createFeatureFolders(config, manifestEntries, dirResults, writes) {
  if (!withFeatureFolders) {
    console.log('\nSkipping feature category folders. Use init without --no-feature-folders to create them.');
    return;
  }

  const featureRoot = getConfigValue(config, 'gherkin.featurePath', 'features');
  for (const subfolder of FEATURE_SUBFOLDERS) {
    const folder = resolveRepoPath(cwd, path.join(featureRoot, subfolder), {
      label: `feature category folder "${subfolder}"`
    });
    const dirResult = await ensureDir(folder);
    dirResults.push(dirResult);
    if (dirResult.created) {
      manifestEntries.push(
        await manifestEntry(cwd, dirResult.path, {
          type: 'dir',
          category: 'generated',
          source: 'init'
        })
      );
    }

    const keepResult = await writeFileSafe(path.join(folder, '.gitkeep'), '', { force: false });
    writes.push(keepResult);
    if (keepResult.written) {
      manifestEntries.push(
        await manifestEntry(cwd, keepResult.path, {
          type: 'file',
          category: 'generated',
          source: 'init'
        })
      );
    }
  }
}

const spanishTemplateHeadings = new Map([
  ['# Requirement Analysis', '# Analisis de requisitos'],
  ['# Source Analysis', '# Analisis de fuentes'],
  ['## Inputs', '## Entradas'],
  ['## Facts by source', '## Hechos por fuente'],
  ['## Cross-source agreements', '## Acuerdos entre fuentes'],
  ['## Contradictions', '## Contradicciones'],
  ['## Unsupported design observations', '## Observaciones de diseno no respaldadas'],
  ['## Extraction limitations', '## Limitaciones de extraccion'],
  ['## Pending decisions', '## Decisiones pendientes'],
  ['## Main source', '## Fuente principal'],
  ['## Complementary sources', '## Fuentes complementarias'],
  ['## Functional scope', '## Alcance funcional'],
  ['## Acceptance Criteria', '## Criterios de aceptacion'],
  ['## Inferred Acceptance Criteria', '## Criterios de aceptacion inferidos'],
  ['## Ambiguities requiring user decision', '## Ambiguedades que requieren decision del usuario'],
  ['## Ambiguities', '## Ambiguedades'],
  ['## Out of scope', '## Fuera de alcance'],
  ['## QA impact', '## Impacto en QA'],
  ['# Test Management Coverage Analysis', '# Analisis de cobertura de gestion de pruebas'],
  ['# System Test Design', '# Diseno de pruebas de sistema'],
  ['## Architecture alignment', '## Alineacion con arquitectura'],
  ['## Testability risks', '## Riesgos de testabilidad'],
  ['## Cross-RF coverage strategy', '## Estrategia de cobertura entre RFs'],
  ['## Shared fixtures and data', '## Fixtures y datos compartidos'],
  ['## Non-functional focus', '## Enfoque no funcional'],
  ['## Open questions', '## Preguntas abiertas'],
  ['# Test Design Proposal (per RF / epic)', '# Propuesta de diseno de pruebas (por RF / epic)'],
  ['## Official RF ID', '## RF oficial'],
  ['## Scope', '## Alcance'],
  ['## Proposed tests', '## Pruebas propuestas'],
  ['## Coverage obligations', '## Obligaciones de cobertura'],
  ['## Security review', '## Revision de seguridad'],
  ['## Residual coverage gaps', '## Brechas de cobertura residual'],
  ['## Existing tests to reuse', '## Pruebas existentes para reutilizar'],
  ['## Existing tests requiring modification', '## Pruebas existentes que requieren modificacion'],
  ['## New tests to create', '## Nuevas pruebas a crear'],
  ['## Approval request', '## Solicitud de aprobacion'],
  ['# Automation Feasibility Report', '# Informe de viabilidad de automatizacion'],
  ['# Automation Implementation Plan', '# Plan de implementacion de automatizacion'],
  ['# Traceability Matrix', '# Matriz de trazabilidad'],
  ['# Test Management Sync Plan', '# Plan de sincronizacion de gestion de pruebas'],
  ['# Jira Automation Task Draft', '# Borrador de tarea de automatizacion'],
  ['# PR Summary', '# Resumen de PR'],
  ['## Summary', '## Resumen'],
  ['## Validation', '## Validacion'],
  ['## Risks', '## Riesgos'],
  ['## Residual risk', '## Riesgo residual']
]);

function localizeTemplate(content, language) {
  if (String(language || '').toLowerCase() !== 'es') return content;
  let updated = content;
  for (const [english, spanish] of spanishTemplateHeadings) {
    updated = updated.replaceAll(english, spanish);
  }
  return updated.replaceAll(
    'Do you approve generating the proposed `.feature` files?',
    'Apruebas generar los archivos `.feature` propuestos?'
  );
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  logHeader('QA FlowKit init');

  if (!(await pathExists(qaAiDir))) {
    console.error('Missing .qa-ai folder. Copy it into the repository root first.');
    process.exit(1);
  }

  if (!(await pathExists(presetPath))) {
    const names = await availablePresets();
    console.error(`Base template not found: ${presetName}`);
    console.error(`Available base templates: ${names.length > 0 ? names.join(', ') : '(none found)'}`);
    process.exit(1);
  }

  const qaContextPath = selectedQaContextPath();
  if (qaContextPath) {
    const resolvedContext = resolveRepoPath(cwd, qaContextPath, { label: 'QA context folder' });
    if (!(await pathExists(resolvedContext))) {
      console.error(`QA context folder not found: ${relativeTo(cwd, resolvedContext)}`);
      process.exit(1);
    }
    const contextStats = await fs.stat(resolvedContext);
    if (!contextStats.isDirectory()) {
      console.error(`QA context path must be a folder: ${relativeTo(cwd, resolvedContext)}`);
      process.exit(1);
    }
    validatedQaContextPath = qaContextPath;
    console.log(`Using QA context folder: ${qaContextPath}`);
  }

  console.log(`Using base template: ${presetName}`);
  console.log(`Using interface language: ${interfaceLanguage}`);
  console.log(`Using Gherkin language: ${gherkinLanguage}`);

  const adapters = await selectedAdapters();

  const configPath = path.join(cwd, 'qa-ai.config.yaml');
  const projectName = await derivedProjectName();
  console.log(`Using project name: ${projectName}`);
  const configContent = personalizeConfig(await readText(presetPath), projectName);
  assertNoChangeMe(configContent);
  await assertValidConfig(configContent);
  const writes = [];
  const manifestEntries = [];
  const configWrite = await writeFileSafe(configPath, configContent, { force });
  writes.push(configWrite);
  if (configWrite.written) {
    manifestEntries.push(
      await manifestEntry(cwd, configWrite.path, {
        type: 'file',
        category: 'generated',
        source: 'init'
      })
    );
  }

  const effectiveConfigContent = configWrite.written ? configContent : (await loadQaAiConfig(cwd)).content;
  const config = parseSimpleYaml(effectiveConfigContent);

  const dirs = configuredDirs(config);

  const dirResults = [];
  for (const dir of [...dirs].filter(Boolean).sort()) {
    const result = await ensureDir(resolveRepoPath(cwd, dir, { label: `configured directory "${dir}"` }));
    dirResults.push(result);
    if (result.created) {
      manifestEntries.push(
        await manifestEntry(cwd, result.path, {
          type: 'dir',
          category: 'generated',
          source: 'init'
        })
      );
    }
  }

  await createFeatureFolders(config, manifestEntries, dirResults, writes);

  if (withDocTemplates) {
    for (const [src, dest] of generatedDocs(config)) {
      const source = path.join(qaAiDir, src);
      if (await pathExists(source)) {
        const outputLanguage = getConfigValue(config, 'project.interfaceLanguage', interfaceLanguage);
        const content = localizeTemplate(await readText(source), outputLanguage);
        const result = await writeFileSafe(
          resolveRepoPath(cwd, dest, { label: `generated artifact "${dest}"` }),
          content,
          { force }
        );
        writes.push(result);
        if (result.written) {
          manifestEntries.push(
            await manifestEntry(cwd, result.path, {
              type: 'file',
              category: 'generated',
              source: 'init'
            })
          );
        }
      }
    }
  } else {
    console.log('\nSkipping starter QA docs. Use --with-doc-templates to generate qa-ai-output/*.md templates.');
  }

  const specialistsResult = await writeFileSafe(
    resolveRepoPath(cwd, '.qa-ai/agents/specialists/active.md', { label: 'active specialists index' }),
    activeSpecialistsContent(config),
    { force: true }
  );
  writes.push(specialistsResult);
  if (specialistsResult.written) {
    manifestEntries.push(
      await manifestEntry(cwd, specialistsResult.path, {
        type: 'file',
        category: 'generated',
        source: 'init'
      })
    );
  }

  const mappingFile = getConfigValue(config, 'testrail.mappingFile', 'qa-ai-output/test-management-mapping.json');
  if (mappingFile && withTestManagementMapping) {
    const result = await writeFileSafe(
      resolveRepoPath(cwd, mappingFile, { label: 'test management mapping file' }),
      '{}\n',
      { force }
    );
    writes.push(result);
    if (result.written) {
      manifestEntries.push(
        await manifestEntry(cwd, result.path, {
          type: 'file',
          category: 'generated',
          source: 'init'
        })
      );
    }
  } else if (mappingFile) {
    console.log('Skipping test management mapping file. Use --with-test-management-mapping to create it.');
  }

  if (withKarateConfig || isKarateConfigured(config)) {
    const karateConfigRel = getConfigValue(config, 'automation.karate.configPath', defaultKarateConfigPath());
    const karateTemplate = path.join(qaAiDir, 'templates/karate-config.template.js');
    if (await pathExists(karateTemplate)) {
      const result = await writeFileSafe(
        resolveRepoPath(cwd, karateConfigRel, { label: 'Karate config file' }),
        await readText(karateTemplate),
        { force }
      );
      writes.push(result);
      if (result.written) {
        manifestEntries.push(
          await manifestEntry(cwd, result.path, {
            type: 'file',
            category: 'generated',
            source: 'init'
          })
        );
      }
    }
  }

  if (withCi === 'github') {
    const packageVersion = args['package-version'] || 'rc';
    let majorVersion = 'v1';
    if (!['beta', 'rc', 'latest'].includes(packageVersion)) {
      const match = packageVersion.match(/^v?(\d+)/);
      if (match) {
        majorVersion = `v${match[1]}`;
      }
    }
    const ciContent = [
      'name: QA FlowKit Quality Gate',
      '',
      'on:',
      '  pull_request:',
      '    branches: [ main ]',
      '',
      'jobs:',
      '  validate:',
      '    name: Validate QA Quality Gate',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - name: Checkout Code',
      '        uses: actions/checkout@v7',
      '',
      '      - name: QA FlowKit Validation',
      `        uses: warante/QA_FlowKit/actions/validate@${majorVersion}`,
      '        with:',
      `          version: '${packageVersion}'`,
      ''
    ].join('\n');

    const workflowPath = resolveRepoPath(cwd, '.github/workflows/qa-flowkit.yml', {
      label: 'GitHub Actions workflow file'
    });
    const result = await writeFileSafe(workflowPath, ciContent, { force });
    writes.push(result);
    if (result.written) {
      manifestEntries.push(
        await manifestEntry(cwd, result.path, {
          type: 'file',
          category: 'generated',
          source: 'init'
        })
      );
    }
  }

  if (adapters.length > 0) {
    console.log('\nSyncing agent adapters...');
    console.log(`Selected adapters: ${adapters.join(', ')}`);
    const { spawn } = await import('node:child_process');
    const syncArgs = [path.join(qaAiDir, 'scripts', 'sync-agent-adapters.mjs')];
    if (force) syncArgs.push('--force');
    if (!(adapters.length === 1 && adapters[0] === 'all')) syncArgs.push('--adapters', adapters.join(','));
    const exitCode = await new Promise((resolve) => {
      const child = spawn(process.execPath, syncArgs, { stdio: 'inherit', shell: false });
      child.on('close', resolve);
    });
    if (exitCode !== 0) process.exit(exitCode);
  } else {
    console.log('\nSkipping agent adapter sync.');
  }

  const manifest = await recordManifestEntries(cwd, manifestEntries);

  console.log('\nInit completed. Summary:');
  for (const result of dirResults) {
    console.log(`${result.created ? 'created' : 'exists '} ${relativeTo(cwd, result.path)}`);
  }
  for (const result of writes) {
    if (!result) continue;
    console.log(`${result.written ? 'created' : 'skipped'} ${relativeTo(cwd, result.path)}`);
  }
  if (manifest) console.log(`updated ${relativeTo(cwd, manifestPath(cwd))}`);
  await maybePrintClaudePluginHint();
  console.log('\nNext: node .qa-ai/scripts/doctor.mjs');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
