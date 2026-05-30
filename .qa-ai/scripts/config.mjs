#!/usr/bin/env node
import path from 'node:path';
import { activeSpecialistsContent, configuredDirs } from './lib/project-config.mjs';
import {
  copyFileSafe,
  ensureDir,
  loadQaAiConfig,
  logHeader,
  manifestEntry,
  manifestPath,
  parseArgs,
  parseSimpleYaml,
  pathExists,
  readText,
  recordManifestEntries,
  relativeTo,
  resolveRepoPath,
  writeFileSafe
} from './lib/utils.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);
const force = Boolean(args.force);
const applyStructure = !args['no-structure'];
const qaAiDir = path.join(cwd, '.qa-ai');

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/config.mjs [options]

Options:
  --export <path>     Export qa-ai.config.yaml to a repo-local profile path
  --import <path>     Import a repo-local profile path as qa-ai.config.yaml
  --no-structure      On import, skip creating configured folders and active specialists
  --force             Overwrite the export target or existing imported config files
  --help              Show this help

Examples:
  node .qa-ai/scripts/config.mjs --export .qa-ai/config-profiles/team.yaml
  node .qa-ai/scripts/config.mjs --import .qa-ai/config-profiles/team.yaml --force
`);
}

function selectedMode() {
  const hasExport = Boolean(args.export);
  const hasImport = Boolean(args.import);
  if (hasExport && hasImport) {
    console.error('Use either --export or --import, not both.');
    process.exit(1);
  }
  if (hasExport) return 'export';
  if (hasImport) return 'import';
  console.error('Missing mode. Use --export <path> or --import <path>.');
  printHelp();
  process.exit(1);
}

function validateProfileContent(content, sourcePath) {
  const config = parseSimpleYaml(content);
  if (!config || typeof config !== 'object' || Object.keys(config).length === 0) {
    console.error(`Invalid QA AI config profile: ${relativeTo(cwd, sourcePath)} is empty or not supported YAML.`);
    process.exit(1);
  }
  return config;
}

async function exportConfig(targetArg) {
  logHeader('QA AI config export');

  const configInfo = await loadQaAiConfig(cwd);
  if (!configInfo.exists) {
    console.error('Missing qa-ai.config.yaml. Run init first or import an existing profile.');
    process.exit(1);
  }

  const target = resolveRepoPath(cwd, targetArg, { label: 'export path' });
  const result = await copyFileSafe(configInfo.path, target, { force });
  console.log(`${result.copied ? 'exported' : 'skipped '} ${relativeTo(cwd, result.path)}`);

  if (result.copied) {
    const manifest = await recordManifestEntries(cwd, [
      await manifestEntry(cwd, result.path, {
        type: 'file',
        category: 'generated',
        source: 'config-export'
      })
    ]);
    if (manifest) console.log(`updated ${relativeTo(cwd, manifestPath(cwd))}`);
  }

  if (!result.copied) {
    console.log('Use --force to overwrite the existing export target.');
  }
}

async function applyImportedStructure(config) {
  const manifestEntries = [];
  const dirResults = [];
  for (const dir of [...configuredDirs(config)].filter(Boolean).sort()) {
    const result = await ensureDir(resolveRepoPath(cwd, dir, { label: `configured directory "${dir}"` }));
    dirResults.push(result);
    if (result.created) {
      manifestEntries.push(
        await manifestEntry(cwd, result.path, {
          type: 'dir',
          category: 'generated',
          source: 'config-import'
        })
      );
    }
  }

  const specialistsResult = await writeFileSafe(
    resolveRepoPath(cwd, '.qa-ai/agents/specialists/active.md', { label: 'active specialists index' }),
    activeSpecialistsContent(config, 'node .qa-ai/scripts/config.mjs --import'),
    { force }
  );
  if (specialistsResult.written) {
    manifestEntries.push(
      await manifestEntry(cwd, specialistsResult.path, {
        type: 'file',
        category: 'generated',
        source: 'config-import'
      })
    );
  }

  return { dirResults, specialistsResult, manifestEntries };
}

async function importConfig(sourceArg) {
  logHeader('QA AI config import');

  if (!(await pathExists(qaAiDir))) {
    console.error('Missing .qa-ai folder. Copy it into the repository root first.');
    process.exit(1);
  }

  const source = resolveRepoPath(cwd, sourceArg, { label: 'import path' });
  if (!(await pathExists(source))) {
    console.error(`Import profile not found: ${relativeTo(cwd, source)}`);
    process.exit(1);
  }

  const content = await readText(source);
  const config = validateProfileContent(content, source);
  const configPath = path.join(cwd, 'qa-ai.config.yaml');
  const configWrite = await writeFileSafe(configPath, content.endsWith('\n') ? content : `${content}\n`, { force });
  console.log(`${configWrite.written ? 'imported' : 'skipped '} ${relativeTo(cwd, configWrite.path)}`);

  const manifestEntries = [];
  if (configWrite.written) {
    manifestEntries.push(
      await manifestEntry(cwd, configWrite.path, {
        type: 'file',
        category: 'generated',
        source: 'config-import'
      })
    );
  }

  let structureResult = null;
  if (applyStructure) {
    structureResult = await applyImportedStructure(config);
    manifestEntries.push(...structureResult.manifestEntries);
  } else {
    console.log('Skipping configured folders and active specialists because --no-structure was passed.');
  }

  const manifest = await recordManifestEntries(cwd, manifestEntries);

  console.log('\nImport summary:');
  if (structureResult) {
    for (const result of structureResult.dirResults) {
      console.log(`${result.created ? 'created' : 'exists '} ${relativeTo(cwd, result.path)}`);
    }
    console.log(
      `${structureResult.specialistsResult.written ? 'created' : 'skipped'} ${relativeTo(cwd, structureResult.specialistsResult.path)}`
    );
    if (!structureResult.specialistsResult.written) {
      console.log('Use --force to refresh the active specialists index.');
    }
  }
  if (!configWrite.written) {
    console.log('Use --force to overwrite the existing qa-ai.config.yaml.');
  }
  if (manifest) console.log(`updated ${relativeTo(cwd, manifestPath(cwd))}`);
  console.log('\nNext: node .qa-ai/scripts/doctor.mjs');
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const mode = selectedMode();
  if (mode === 'export') {
    await exportConfig(args.export);
    return;
  }
  await importConfig(args.import);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
