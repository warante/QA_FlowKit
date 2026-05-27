#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs/promises';
import {
  activeSpecialistsContent,
  configuredDirs,
  isConfiguredFramework,
  slug
} from './lib/project-config.mjs';
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
const withDocTemplates = Boolean(args['with-doc-templates'] || args.withDocTemplates);
const withTestManagementMapping = Boolean(args['with-test-management-mapping'] || args.withTestManagementMapping);
const presetName = args.preset || 'webdriverio-playwright-api';
const interfaceLanguage = normalizeLanguage(args['interface-language'] || args.interfaceLanguage || 'en', 'interface language');
const gherkinLanguage = normalizeLanguage(args['gherkin-language'] || args.gherkinLanguage || args.gherkin || 'en', 'Gherkin language');
let validatedQaContextPath = null;
const qaAiDir = path.join(cwd, '.qa-ai');
const presetsDir = path.join(qaAiDir, 'presets');
const presetPath = path.join(qaAiDir, 'presets', `${presetName}.yaml`);

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/init.mjs [options]

Options:
  --preset <name>          Base template from .qa-ai/presets (default: webdriverio-playwright-api)
  --interface-language <en|es> User-facing workflow language (default: en)
  --gherkin-language <en|es>   Gherkin feature language (default: en)
  --requirements-source <name> Primary requirement source, for example markdown, jira, confluence
  --test-management-tool <name> Test management tool, for example none, testrail, zephyr, xray
  --issue-tracker <name>   Issue tracker, for example none, jira, github
  --qa-track <name>        QA workflow depth: quick, standard, enterprise (default from preset)
  --qa-context <path>      Repo-local folder with QA working-practice docs for agent-assisted init
  --ui-framework <name>    UI/E2E framework, or none/undecided
  --api-framework <name>   API/integration framework, or none/undecided
  --ui-specs-path <path>   UI/E2E specs directory
  --ui-page-objects-path <path> UI page objects directory
  --api-specs-path <path>  API/integration specs directory
  --specialist-mode <auto|off|required> Specialist agent activation mode (default from base template)
  --set <key=value>        Repeatable scalar config override, for example automation.ui.framework=cypress
  --adapters <list>        Comma-separated adapters to generate, or "all" (default: opencode)
  --adapter <name>         Repeatable single adapter name
  --no-adapters            Skip adapter generation
  --with-doc-templates     Generate starter QA docs under qa-ai-output/
  --with-test-management-mapping Generate the configured test management mapping file
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

function scalarOverrideValue(value) {
  if (value === undefined || value === null || value === false) return null;
  return yamlScalar(String(value));
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
  const parts = String(keyPath || '').split('.').map((part) => part.trim()).filter(Boolean);
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
  if (requested.length === 0) return ['opencode'];
  if (requested.includes('all')) return ['all'];
  return requested.includes('generic') ? requested : ['generic', ...requested];
}

function generatedDocs() {
  return [
    ['templates/requirement-analysis.template.md', 'qa-ai-output/requirement-analysis.md'],
    ['templates/testrail-coverage-analysis.template.md', 'qa-ai-output/testrail-coverage-analysis.md'],
    ['templates/test-design-system.template.md', 'qa-ai-output/test-design-system.md'],
    ['templates/test-design-proposal.template.md', 'qa-ai-output/test-design-proposal.md'],
    ['templates/automation-feasibility-report.template.md', 'qa-ai-output/automation-feasibility-report.md'],
    ['templates/automation-implementation-plan.template.md', 'qa-ai-output/automation-implementation-plan.md'],
    ['templates/traceability-matrix.template.md', 'qa-ai-output/traceability-matrix.md'],
    ['templates/testrail-sync-plan.template.md', 'qa-ai-output/testrail-sync-plan.md'],
    ['templates/jira-automation-task.template.md', 'qa-ai-output/jira-automation-task.md'],
    ['templates/pr-template.md', 'qa-ai-output/pr-summary.md'],
    ['templates/release-gate.template.yaml', 'qa-ai-output/release-gate.yaml']
  ];
}

const spanishTemplateHeadings = new Map([
  ['# Requirement Analysis', '# Analisis de requisitos'],
  ['## Main source', '## Fuente principal'],
  ['## Complementary sources', '## Fuentes complementarias'],
  ['## Functional scope', '## Alcance funcional'],
  ['## Acceptance Criteria', '## Criterios de aceptacion'],
  ['## Inferred Acceptance Criteria', '## Criterios de aceptacion inferidos'],
  ['## Ambiguities requiring user decision', '## Ambiguedades que requieren decision del usuario'],
  ['## Ambiguities', '## Ambiguedades'],
  ['## Out of scope', '## Fuera de alcance'],
  ['## QA impact', '## Impacto en QA'],
  ['# TestRail Coverage Analysis', '# Analisis de cobertura de gestion de pruebas'],
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
  ['## Existing tests to reuse', '## Pruebas existentes para reutilizar'],
  ['## Existing tests requiring modification', '## Pruebas existentes que requieren modificacion'],
  ['## New tests to create', '## Nuevas pruebas a crear'],
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

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  logHeader('QA FlowKit init');

  if (!await pathExists(qaAiDir)) {
    console.error('Missing .qa-ai folder. Copy it into the repository root first.');
    process.exit(1);
  }

  if (!await pathExists(presetPath)) {
    const names = await availablePresets();
    console.error(`Base template not found: ${presetName}`);
    console.error(`Available base templates: ${names.length > 0 ? names.join(', ') : '(none found)'}`);
    process.exit(1);
  }

  const qaContextPath = selectedQaContextPath();
  if (qaContextPath) {
    const resolvedContext = resolveRepoPath(cwd, qaContextPath, { label: 'QA context folder' });
    if (!await pathExists(resolvedContext)) {
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

  const dirs = configuredDirs(config);

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

  if (withDocTemplates) {
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
    manifestEntries.push(await manifestEntry(cwd, specialistsResult.path, {
      type: 'file',
      category: 'generated',
      source: 'init'
    }));
  }

  const mappingFile = getConfigValue(config, 'testrail.mappingFile', 'qa-ai-output/test-management-mapping.json');
  if (mappingFile && withTestManagementMapping) {
    const result = await writeFileSafe(resolveRepoPath(cwd, mappingFile, { label: 'test management mapping file' }), '{}\n', { force });
    writes.push(result);
    if (result.written) {
      manifestEntries.push(await manifestEntry(cwd, result.path, {
        type: 'file',
        category: 'generated',
        source: 'init'
      }));
    }
  } else if (mappingFile) {
    console.log('Skipping test management mapping file. Use --with-test-management-mapping to create it.');
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
