#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs/promises';
import readline from 'node:readline/promises';
import { defaultKarateConfigPath } from './lib/automation-framework.mjs';
import { activeSpecialistsContent, configuredDirs } from './lib/project-config.mjs';
import { getTestManagementMappingFile } from './lib/test-management-config.mjs';
import { normalizeLanguageStrict } from './lib/gherkin-validate.mjs';
import { maybePrintClaudePluginHint, selectedAdapters } from './lib/init/adapters-init.mjs';
import { githubValidateActionRef } from './lib/package-origin.mjs';
import { assertNoChangeMe, assertValidConfig, personalizeConfig } from './lib/init/config-build.mjs';
import { createFeatureFolders } from './lib/init/directories.mjs';
import { generatedDocs, localizeTemplate } from './lib/init/docs.mjs';
import { printHelp } from './lib/init/help.mjs';
import { availablePresets, isKarateConfigured } from './lib/init/presets.mjs';
import { derivedProjectName, selectedQaContextPath } from './lib/init/project-name.mjs';
import {
  COMPACT_CONFIG_PATH,
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
  resolveQaAiConfigPath,
  resolveRepoPath,
  writeFileSafe,
  logHeader
} from './lib/utils.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);
const force = Boolean(args.force);
const withDocTemplates = Boolean(args['with-doc-templates'] || args.withDocTemplates);
const withTestManagementMapping = Boolean(args['with-test-management-mapping'] || args.withTestManagementMapping);
const withFeatureFolders = !(args['no-feature-folders'] || args.noFeatureFolders);
const skipStructure = Boolean(args['skip-structure'] || args.skipStructure);
const withCi = args['with-ci'] || args.withCi;
const presetName = args.preset || 'playwright-full';
const withKarateConfig = Boolean(args['with-karate-config'] || args.withKarateConfig || presetName === 'karate-full');
let validatedQaContextPath = null;
const qaAiDir = path.join(cwd, '.qa-ai');
const presetsDir = path.join(qaAiDir, 'presets');
const presetPath = path.join(qaAiDir, 'presets', `${presetName}.yaml`);

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  logHeader('QA FlowKit init');

  const interfaceLanguage = normalizeLanguageStrict(
    args['interface-language'] || args.interfaceLanguage || 'en',
    'interface language'
  );
  const gherkinLanguage = normalizeLanguageStrict(
    args['gherkin-language'] || args.gherkinLanguage || args.gherkin || 'en',
    'Gherkin language'
  );

  if (!(await pathExists(qaAiDir))) {
    console.error('Missing .qa-ai folder. Copy it into the repository root first.');
    process.exit(1);
  }

  if (!(await pathExists(presetPath))) {
    const names = await availablePresets(presetsDir);
    console.error(`Base template not found: ${presetName}`);
    console.error(`Available base templates: ${names.length > 0 ? names.join(', ') : '(none found)'}`);
    process.exit(1);
  }

  const presetContent = await readText(presetPath);
  const presetConfig = parseSimpleYaml(presetContent);
  const configuredTestManagement = String(
    args['test-management-tool'] || args.testManagementTool || getConfigValue(presetConfig, 'tools.testManagement', '')
  ).toLowerCase();
  let scenarioLayout = args['scenario-layout'] || args.scenarioLayout;
  if (!scenarioLayout && process.stdin.isTTY && process.stdout.isTTY && !process.env.CI && !args['no-interactive']) {
    const testRailFirst = configuredTestManagement === 'testrail';
    const choices = testRailFirst
      ? [
          ['1', 'one-per-file', 'One scenario per file (recommended for TestRail)'],
          ['2', 'multiple-per-file', 'Multiple scenarios per feature (standard Gherkin)']
        ]
      : [
          ['1', 'multiple-per-file', 'Multiple scenarios per feature (standard Gherkin)'],
          ['2', 'one-per-file', 'One scenario per file (recommended for TestRail)']
        ];
    console.log('\nSelect the Gherkin scenario layout:');
    for (const [key, , label] of choices) console.log(`  ${key}. ${label}`);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      const answer = (await rl.question('\nScenario layout [1]: ')).trim() || '1';
      scenarioLayout = choices.find(([key, value]) => answer === key || answer === value)?.[1] || choices[0][1];
    } finally {
      rl.close();
    }
  }
  scenarioLayout ||= configuredTestManagement === 'testrail' ? 'one-per-file' : 'multiple-per-file';
  if (!['one-per-file', 'multiple-per-file'].includes(scenarioLayout)) {
    throw new Error('Invalid scenario layout. Use one-per-file or multiple-per-file.');
  }
  args.scenarioLayout = scenarioLayout;

  const qaContextPath = selectedQaContextPath(args);
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
  console.log(`Using Gherkin scenario layout: ${scenarioLayout}`);

  const adapters = await selectedAdapters(cwd, args);

  const resolvedConfig = await resolveQaAiConfigPath(cwd);
  const configPath = resolvedConfig.source === 'missing' ? path.join(cwd, COMPACT_CONFIG_PATH) : resolvedConfig.absPath;
  const configRelPath = resolvedConfig.source === 'missing' ? COMPACT_CONFIG_PATH : resolvedConfig.path;
  const projectName = await derivedProjectName(cwd, args);
  console.log(`Using project name: ${projectName}`);
  const configContent = personalizeConfig({
    content: presetContent,
    projectName,
    args,
    interfaceLanguage,
    gherkinLanguage,
    validatedQaContextPath
  });
  assertNoChangeMe(configContent);
  await assertValidConfig(configContent, cwd);
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

  const dirResults = [];
  if (!skipStructure) {
    const dirs = configuredDirs(config);
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

    await createFeatureFolders({ withFeatureFolders });
  } else {
    console.log('\nSkipping configured directory creation (--skip-structure).');
  }

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
    console.log('\nSkipping starter QA docs. Use --with-doc-templates to generate .qa-ai/output/*.md templates.');
  }

  const specialistsResult = await writeFileSafe(
    resolveRepoPath(cwd, '.qa-ai/agents/specialists/active.md', { label: 'active specialists index' }),
    activeSpecialistsContent(config, 'node .qa-ai/scripts/init.mjs', configRelPath),
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

  const mappingFile = getTestManagementMappingFile(config);
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
      `        uses: ${githubValidateActionRef(majorVersion)}`,
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
  await maybePrintClaudePluginHint(cwd);
  console.log('\nNext: node .qa-ai/scripts/doctor.mjs');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
