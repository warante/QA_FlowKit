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
  writeFileSafe,
  yamlScalar,
  logHeader
} from './lib/utils.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);
const force = Boolean(args.force);
const presetName = args.preset || 'webdriverio-playwright-api';
const qaAiDir = path.join(cwd, '.qa-ai');
const presetsDir = path.join(qaAiDir, 'presets');
const presetPath = path.join(qaAiDir, 'presets', `${presetName}.yaml`);

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/init.mjs [options]

Options:
  --preset <name>          Preset from .qa-ai/presets (default: webdriverio-playwright-api)
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

function personalizeConfig(content) {
  return content.replace(/^(\s*name:\s*)CHANGE_ME\s*$/m, `$1${yamlScalar(path.basename(cwd))}`);
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

  if (framework === 'webdriverio') {
    const base = specsPath ? path.dirname(specsPath) : 'tests/wdio';
    dirs.add(specsPath || path.join(base, 'specs'));
    dirs.add(pageObjectsPath || path.join(base, 'pageobjects'));
    dirs.add(path.join(base, 'helpers'));
    dirs.add(path.join(base, 'fixtures'));
    return;
  }

  if (framework === 'selenium-jest-browserstack' || framework === 'selenium') {
    const base = specsPath ? path.dirname(specsPath) : 'tests/selenium';
    dirs.add(specsPath || path.join(base, 'specs'));
    dirs.add(pageObjectsPath || path.join(base, 'pageobjects'));
    dirs.add(path.join(base, 'helpers'));
    dirs.add(path.join(base, 'fixtures'));
  }
}

function addApiDirs(dirs, config) {
  const framework = String(getConfigValue(config, 'automation.api.framework', 'none')).toLowerCase();
  const specsPath = getConfigValue(config, 'automation.api.specsPath', '');
  if (framework !== 'playwright-api' && framework !== 'playwright') return;

  const base = specsPath ? path.dirname(specsPath) : 'tests/api';
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
    const result = await ensureDir(path.join(cwd, dir));
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
      const result = await writeFileSafe(path.join(cwd, dest), await readText(source), { force });
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

  const mappingFile = getConfigValue(config, 'testrail.mappingFile', 'docs/qa/testrail-mapping.json');
  if (mappingFile) {
    const result = await writeFileSafe(path.join(cwd, mappingFile), '{}\n', { force });
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
