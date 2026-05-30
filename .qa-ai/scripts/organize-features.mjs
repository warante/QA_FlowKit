#!/usr/bin/env node
/**
 * Move QA design .feature files from gherkin.featurePath root into type subfolders.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseFeatureTags, resolveFeatureSubfolder } from './lib/feature-layout.mjs';
import { getConfigValue, loadQaAiConfig, logHeader, parseArgs, relativeTo, resolveRepoPath } from './lib/utils.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/organize-features.mjs [options]

Moves .feature files sitting directly under gherkin.featurePath into type subfolders
(functional, integration, e2e, api, accessibility, manual) based on @type and @manual tags.

Options:
  --path <dir>   Override feature root
  --dry-run      Show planned moves without writing
  --help         Show this help
`);
}

async function listRootFeatures(featureRootPath) {
  const entries = await fs.readdir(featureRootPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.feature')) {
      files.push(path.join(featureRootPath, entry.name));
    }
  }
  return files;
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  logHeader('QA AI organize features');
  const configInfo = await loadQaAiConfig(cwd);
  const featureRoot = args.path || getConfigValue(configInfo.data, 'gherkin.featurePath', 'features');
  const featureRootPath = resolveRepoPath(cwd, featureRoot, { label: 'feature root' });
  const dryRun = Boolean(args['dry-run']);
  const files = await listRootFeatures(featureRootPath);

  if (files.length === 0) {
    console.log(`No .feature files in the root of ${featureRoot}. Nothing to organize.`);
    return;
  }

  let moved = 0;
  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const tags = parseFeatureTags(content);
    const subfolder = resolveFeatureSubfolder(tags);
    const target = path.join(featureRootPath, subfolder, path.basename(file));
    const relFrom = relativeTo(cwd, file);
    const relTo = relativeTo(cwd, target);

    if (path.normalize(file) === path.normalize(target)) {
      continue;
    }

    try {
      await fs.access(target);
      console.log(`[SKIP] ${relFrom} — target exists: ${relTo}`);
      continue;
    } catch {
      // target free
    }

    console.log(`${dryRun ? '[DRY-RUN]' : '[MOVE]'} ${relFrom} -> ${relTo}`);
    if (!dryRun) {
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.rename(file, target);
      moved += 1;
    }
  }

  console.log(dryRun ? '\nDry run complete.' : `\nMoved ${moved} file(s).`);
  if (!dryRun && moved > 0) {
    console.log('Run: node .qa-ai/scripts/validate-features.mjs');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
