#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs/promises';
import {
  commaList,
  ensureDir,
  getConfigValue,
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
const presetName = args.preset || 'webdriverio-playwright-api';
const interfaceLanguage = normalizeLanguage(args['interface-language'] || args.interfaceLanguage || 'en', 'interface language');
const gherkinLanguage = normalizeLanguage(args['gherkin-language'] || args.gherkinLanguage || args.gherkin || 'en', 'Gherkin language');
const qaAiDir = path.join(cwd, '.qa-ai');
const presetsDir = path.join(qaAiDir, 'presets');
const presetPath = path.join(qaAiDir, 'presets', `${presetName}.yaml`);

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/init.mjs [options]

Options:
  --preset <name>          Preset from .qa-ai/presets (default: webdriverio-playwright-api)
  --interface-language <en|es> User-facing workflow language (default: en)
  --gherkin-language <en|es>   Gherkin feature language (default: en)
  --requirements-source <name> Primary requirement source, for example markdown, jira, confluence
  --test-management-tool <name> Test management tool, for example none, testrail, zephyr, xray
  --issue-tracker <name>   Issue tracker, for example none, jira, github
  --ui-framework <name>    UI/E2E framework, or none/undecided
  --api-framework <name>   API/integration framework, or none/undecided
  --ui-specs-path <path>   UI/E2E specs directory
  --ui-page-objects-path <path> UI page objects directory
  --api-specs-path <path>  API/integration specs directory
  --specialist-mode <auto|off|required> Specialist agent activation mode (default from preset)
  --set <key=value>        Repeatable scalar config override, for example automation.ui.framework=cypress
  --adapters <list>        Comma-separated adapters to generate, or "all" (default: all)
  --adapter <name>         Repeatable single adapter name
  --no-adapters            Skip adapter generation
  --force                  Overwrite generated files when they already exist
  --help                   Show this help
`);
}

async function availablePresets() {
  if (!await pathExists(presetsDir)) return [];
  const entries = await fs.readdir(presetsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.yaml'))
    .map((entry) => path.basename(entry.name, '.yaml'))
    .sort();
}

function normalizeLanguage(value, label = 'language') {
  const normalized = String(value || '').trim().toLowerCase();
  if (['es', 'esp', 'spa', 'spanish', 'espanol', 'español'].includes(normalized)) return 'es';
  if (['en', 'eng', 'english', 'ingles', 'inglés'].includes(normalized)) return 'en';
  console.error(`Unsupported ${label}: ${value}. Use "en" or "es".`);
  process.exit(1);
}

function slug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'custom';
}

function isConfiguredFramework(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return Boolean(normalized) && !['none', 'undecided', 'manual', 'n/a', 'na'].includes(normalized);
}

function scalarOverrideValue(value) {
  if (value === undefined || value === null || value === false) return null;
  return yamlScalar(String(value));
}

function setSimpleYamlScalar(content, keyPath, value) {
  const parts = String(keyPath || '').split('.').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return content;

  const lines = content.replace(/\r/g, '').split('\n');
  let searchStart = 0;
  let parentIndent = -1;

  for (let depth = 0; depth < parts.length - 1; depth += 1) {
    const key = parts[depth];
    const pattern = new RegExp(`^(\\s*)${key}:\\s*$`);
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
  const targetPattern = new RegExp(`^(\\s*)${target}:\\s*.*$`);
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

function configOverrides() {
  const uiFramework = args['ui-framework'] || args.uiFramework;
  const apiFramework = args['api-framework'] || args.apiFramework;
  const testManagementTool = args['test-management-tool'] || args.testManagementTool;
  const uiSpecsPath = args['ui-specs-path'] || args.uiSpecsPath;
  const uiPageObjectsPath = args['ui-page-objects-path'] || args.uiPageObjectsPath;
  const apiSpecsPath = args['api-specs-path'] || args.apiSpecsPath;
  const normalizedUiFramework = slug(uiFramework);
  const normalizedApiFramework = slug(apiFramework);
  const overrides = [
    ['project.defaultLanguage', interfaceLanguage],
    ['project.interfaceLanguage', interfaceLanguage],
    ['gherkin.language', gherkinLanguage],
    ['sources.main', args['requirements-source'] || args.requirementsSource],
    ['tools.testManagement', testManagementTool],
    ['tools.issueTracker', args['issue-tracker'] || args.issueTracker],
    ['agents.specialistMode', args['specialist-mode'] || args.specialistMode],
    ['automation.ui.framework', uiFramework],
    ['automation.api.framework', apiFramework],
    ['automation.ui.specsPath', uiSpecsPath],
    ['automation.ui.pageObjectsPath', uiPageObjectsPath],
    ['automation.api.specsPath', apiSpecsPath]
  ];

  if (uiFramework && !uiSpecsPath && normalizedUiFramework !== 'webdriverio') {
    overrides.push(['automation.ui.specsPath', isConfiguredFramework(uiFramework) ? ['tests', slug(uiFramework), 'specs'].join('/') : '']);
  }
  if (uiFramework && !uiPageObjectsPath && normalizedUiFramework !== 'webdriverio') {
    overrides.push(['automation.ui.pageObjectsPath', isConfiguredFramework(uiFramework) ? ['tests', slug(uiFramework), 'pageobjects'].join('/') : '']);
  }
  if (apiFramework && !apiSpecsPath && normalizedApiFramework !== 'playwright-api') {
    overrides.push(['automation.api.specsPath', isConfiguredFramework(apiFramework) ? ['tests', slug(apiFramework), 'specs'].join('/') : '']);
  }
  if (testManagementTool) {
    const isTestrail = String(testManagementTool).trim().toLowerCase() === 'testrail';
    overrides.push(['testrail.enabled', isTestrail ? 'true' : 'false']);
    if (!isTestrail) overrides.push(['testrail.mappingFile', '']);
  }

  for (const item of commaList(args.set)) {
    const equalsIndex = item.indexOf('=');
    if (equalsIndex <= 0) {
      console.error(`Invalid --set value: ${item}. Use key.path=value.`);
      process.exit(1);
    }
    overrides.push([item.slice(0, equalsIndex).trim(), item.slice(equalsIndex + 1).trim()]);
  }

  return overrides
    .map(([key, value]) => [key, scalarOverrideValue(value)])
    .filter(([, value]) => value !== null);
}

function personalizeConfig(content) {
  let updated = content.replace(/^(\s*name:\s*)CHANGE_ME\s*$/m, `$1${yamlScalar(path.basename(cwd))}`);
  for (const [key, value] of configOverrides()) {
    updated = setSimpleYamlScalar(updated, key, value);
  }
  return updated;
}

function selectedAdapters() {
  if (args['no-adapters']) return [];
  const requested = [...commaList(args.adapters), ...commaList(args.adapter)].map((name) => name.toLowerCase());
  if (requested.length === 0 || requested.includes('all')) return ['all'];
  return requested.includes('generic') ? requested : ['generic', ...requested];
}

function addCommonDirs(dirs, config) {
  const featureRoot = getConfigValue(config, 'gherkin.featurePath', 'features');
  const featureTypes = ['functional', 'integration', 'e2e', 'api', 'accessibility', 'manual'];

  dirs.add('docs/qa');
  dirs.add(featureRoot);
  for (const type of featureTypes) dirs.add(path.join(featureRoot, type));

  const matrixPath = getConfigValue(config, 'traceability.matrixPath', 'docs/qa/traceability-matrix.md');
  if (matrixPath) dirs.add(path.dirname(matrixPath));

  const mappingFile = getConfigValue(config, 'testrail.mappingFile', 'docs/qa/testrail-mapping.json');
  if (mappingFile) dirs.add(path.dirname(mappingFile));
}

function addUiDirs(dirs, config) {
  const framework = String(getConfigValue(config, 'automation.ui.framework', 'none')).toLowerCase();
  const specsPath = getConfigValue(config, 'automation.ui.specsPath', '');
  const pageObjectsPath = getConfigValue(config, 'automation.ui.pageObjectsPath', '');

  if (isConfiguredFramework(framework)) {
    const base = specsPath ? path.dirname(specsPath) : path.join('tests', slug(framework));
    dirs.add(specsPath || path.join(base, 'specs'));
    if (pageObjectsPath || framework !== 'api') dirs.add(pageObjectsPath || path.join(base, 'pageobjects'));
    dirs.add(path.join(base, 'helpers'));
    dirs.add(path.join(base, 'fixtures'));
  }
}

function addApiDirs(dirs, config) {
  const framework = String(getConfigValue(config, 'automation.api.framework', 'none')).toLowerCase();
  const specsPath = getConfigValue(config, 'automation.api.specsPath', '');
  if (!isConfiguredFramework(framework)) return;

  const base = specsPath ? path.dirname(specsPath) : path.join('tests', slug(framework));
  dirs.add(specsPath || path.join(base, 'specs'));
  dirs.add(path.join(base, 'clients'));
  dirs.add(path.join(base, 'fixtures'));
  dirs.add(path.join(base, 'schemas'));
  dirs.add(path.join(base, 'helpers'));
}

function generatedDocs() {
  return [
    ['templates/requirement-analysis.template.md', 'docs/qa/requirement-analysis.md'],
    ['templates/testrail-coverage-analysis.template.md', 'docs/qa/testrail-coverage-analysis.md'],
    ['templates/test-design-proposal.template.md', 'docs/qa/test-design-proposal.md'],
    ['templates/automation-feasibility-report.template.md', 'docs/qa/automation-feasibility-report.md'],
    ['templates/automation-implementation-plan.template.md', 'docs/qa/automation-implementation-plan.md'],
    ['templates/traceability-matrix.template.md', 'docs/qa/traceability-matrix.md'],
    ['templates/testrail-sync-plan.template.md', 'docs/qa/testrail-sync-plan.md'],
    ['templates/jira-automation-task.template.md', 'docs/qa/jira-automation-task.md'],
    ['templates/pr-template.md', 'docs/qa/pr-summary.md']
  ];
}

const spanishTemplateHeadings = new Map([
  ['# Requirement Analysis', '# Analisis de requisitos'],
  ['## Main source', '## Fuente principal'],
  ['## Complementary sources', '## Fuentes complementarias'],
  ['## Functional scope', '## Alcance funcional'],
  ['## Acceptance Criteria', '## Criterios de aceptacion'],
  ['## Inferred Acceptance Criteria', '## Criterios de aceptacion inferidos'],
  ['## Ambiguities', '## Ambiguedades'],
  ['## Out of scope', '## Fuera de alcance'],
  ['## QA impact', '## Impacto en QA'],
  ['# TestRail Coverage Analysis', '# Analisis de cobertura de gestion de pruebas'],
  ['# Test Design Proposal', '# Propuesta de diseno de pruebas'],
  ['## Scope', '## Alcance'],
  ['## Proposed tests', '## Pruebas propuestas'],
  ['## Existing tests to reuse', '## Pruebas existentes para reutilizar'],
  ['## Existing tests requiring modification', '## Pruebas existentes que requieren modificacion'],
  ['## New tests to create', '## Nuevas pruebas a crear'],
  ['## Ambiguities requiring user decision', '## Ambiguedades que requieren decision del usuario'],
  ['## Approval request', '## Solicitud de aprobacion'],
  ['# Automation Feasibility Report', '# Informe de viabilidad de automatizacion'],
  ['# Automation Implementation Plan', '# Plan de implementacion de automatizacion'],
  ['# Traceability Matrix', '# Matriz de trazabilidad'],
  ['# TestRail Sync Plan', '# Plan de sincronizacion de gestion de pruebas'],
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
  return updated.replaceAll('Do you approve generating the proposed `.feature` files?', 'Apruebas generar los archivos `.feature` propuestos?');
}

const specialistCatalog = {
  'playwright-ui': {
    title: 'Playwright UI Specialist',
    categories: ['ui'],
    aliases: ['playwright', 'playwright-ui']
  },
  cypress: {
    title: 'Cypress Specialist',
    categories: ['ui'],
    aliases: ['cypress']
  },
  webdriverio: {
    title: 'WebdriverIO Specialist',
    categories: ['ui'],
    aliases: ['webdriverio', 'wdio']
  },
  selenium: {
    title: 'Selenium Specialist',
    categories: ['ui'],
    aliases: ['selenium', 'selenium-jest-browserstack']
  },
  'playwright-api': {
    title: 'Playwright API Specialist',
    categories: ['api'],
    aliases: ['playwright-api', 'playwright']
  },
  postman: {
    title: 'Postman/Newman Specialist',
    categories: ['api'],
    aliases: ['postman', 'newman']
  },
  'rest-assured': {
    title: 'REST Assured Specialist',
    categories: ['api'],
    aliases: ['rest-assured', 'restassured']
  },
  karate: {
    title: 'Karate API Specialist',
    categories: ['api'],
    aliases: ['karate']
  },
  appium: {
    title: 'Appium Specialist',
    categories: ['mobile'],
    aliases: ['appium']
  },
  'generic-test-design': {
    title: 'Generic Test Design Specialist',
    categories: ['test-design'],
    aliases: ['generic-test-design', 'test-design', 'non-gherkin']
  },
  testrail: {
    title: 'TestRail Specialist',
    categories: ['test-management'],
    aliases: ['testrail']
  },
  jira: {
    title: 'Jira Specialist',
    categories: ['issue-tracker'],
    aliases: ['jira']
  }
};

function activeSpecialists(config) {
  const mode = String(getConfigValue(config, 'agents.specialistMode', 'auto')).toLowerCase();
  if (mode === 'off' || mode === 'none') return [];

  const wanted = [
    ['ui', getConfigValue(config, 'automation.ui.framework', '')],
    ['api', getConfigValue(config, 'automation.api.framework', '')],
    ['test-management', getConfigValue(config, 'tools.testManagement', '')],
    ['issue-tracker', getConfigValue(config, 'tools.issueTracker', '')]
  ];

  const active = new Map();
  for (const [category, value] of wanted) {
    const normalized = slug(value);
    if (!isConfiguredFramework(normalized)) continue;
    const entry = Object.entries(specialistCatalog).find(([, details]) => (
      details.categories.includes(category) && details.aliases.map(slug).includes(normalized)
    ));
    if (entry) active.set(entry[0], entry[1]);
  }

  if (mode === 'required' && active.size < wanted.filter(([, value]) => isConfiguredFramework(slug(value))).length) {
    console.warn('Warning: specialistMode is required, but some configured tools do not have specialists yet.');
  }

  active.set('generic-test-design', specialistCatalog['generic-test-design']);
  return [...active.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function activeSpecialistsContent(config) {
  const specialists = activeSpecialists(config);
  const lines = [
    '# Active QA AI Specialists',
    '',
    'Generated by `node .qa-ai/scripts/init.mjs` from `qa-ai.config.yaml`.',
    'The orchestrator should load only these specialist instructions in addition to the generic agents.',
    ''
  ];

  if (specialists.length === 0) {
    lines.push('No specialist agents are active. Use the generic agents.');
  } else {
    for (const [id, details] of specialists) {
      lines.push(`- \`${id}\`: ${details.title} (` + details.categories.join(', ') + `)`);
      lines.push(`  - Source: \`.qa-ai/agents/specialists/available/${id}.md\``);
    }
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  logHeader('QA AI Starter init');

  if (!await pathExists(qaAiDir)) {
    console.error('Missing .qa-ai folder. Copy it into the repository root first.');
    process.exit(1);
  }

  if (!await pathExists(presetPath)) {
    const names = await availablePresets();
    console.error(`Preset not found: ${presetName}`);
    console.error(`Available presets: ${names.length > 0 ? names.join(', ') : '(none found)'}`);
    process.exit(1);
  }

  console.log(`Using preset: ${presetName}`);
  console.log(`Using interface language: ${interfaceLanguage}`);
  console.log(`Using Gherkin language: ${gherkinLanguage}`);

  const configPath = path.join(cwd, 'qa-ai.config.yaml');
  const configContent = personalizeConfig(await readText(presetPath));
  const writes = [];
  const manifestEntries = [];
  const configWrite = await writeFileSafe(configPath, configContent, { force });
  writes.push(configWrite);
  if (configWrite.written) {
    manifestEntries.push(await manifestEntry(cwd, configWrite.path, {
      type: 'file',
      category: 'generated',
      source: 'init'
    }));
  }

  const effectiveConfigContent = configWrite.written ? configContent : (await loadQaAiConfig(cwd)).content;
  const config = parseSimpleYaml(effectiveConfigContent);

  const dirs = new Set();
  addCommonDirs(dirs, config);
  addUiDirs(dirs, config);
  addApiDirs(dirs, config);

  const dirResults = [];
  for (const dir of [...dirs].filter(Boolean).sort()) {
    const result = await ensureDir(resolveRepoPath(cwd, dir, { label: `configured directory "${dir}"` }));
    dirResults.push(result);
    if (result.created) {
      manifestEntries.push(await manifestEntry(cwd, result.path, {
        type: 'dir',
        category: 'generated',
        source: 'init'
      }));
    }
  }

  for (const [src, dest] of generatedDocs()) {
    const source = path.join(qaAiDir, src);
    if (await pathExists(source)) {
      const outputLanguage = getConfigValue(config, 'project.interfaceLanguage', interfaceLanguage);
      const content = localizeTemplate(await readText(source), outputLanguage);
      const result = await writeFileSafe(resolveRepoPath(cwd, dest, { label: `generated artifact "${dest}"` }), content, { force });
      writes.push(result);
      if (result.written) {
        manifestEntries.push(await manifestEntry(cwd, result.path, {
          type: 'file',
          category: 'generated',
          source: 'init'
        }));
      }
    }
  }

  const specialistsResult = await writeFileSafe(
    resolveRepoPath(cwd, '.qa-ai/agents/specialists/active.md', { label: 'active specialists index' }),
    activeSpecialistsContent(config),
    { force }
  );
  writes.push(specialistsResult);
  if (specialistsResult.written) {
    manifestEntries.push(await manifestEntry(cwd, specialistsResult.path, {
      type: 'file',
      category: 'generated',
      source: 'init'
    }));
  }

  const mappingFile = getConfigValue(config, 'testrail.mappingFile', 'docs/qa/testrail-mapping.json');
  if (mappingFile) {
    const result = await writeFileSafe(resolveRepoPath(cwd, mappingFile, { label: 'test management mapping file' }), '{}\n', { force });
    writes.push(result);
    if (result.written) {
      manifestEntries.push(await manifestEntry(cwd, result.path, {
        type: 'file',
        category: 'generated',
        source: 'init'
      }));
    }
  }

  const adapters = selectedAdapters();
  if (adapters.length > 0) {
    console.log('\nSyncing agent adapters...');
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
  console.log('\nNext: node .qa-ai/scripts/doctor.mjs');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
