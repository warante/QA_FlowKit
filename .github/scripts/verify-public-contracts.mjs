#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cliValidatorCommandMap } from '../../.qa-ai/scripts/lib/validator-registry.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const inventoryPath = path.join(repoRoot, '.qa-ai', 'contracts', 'public-contracts.v1.json');

function valuesByClassification(group) {
  return ['stable', 'experimental', 'deprecated'].flatMap((classification) => group?.[classification] || []);
}

function uniqueErrors(values, label) {
  const seen = new Set();
  const errors = [];
  for (const value of values) {
    if (seen.has(value)) errors.push(`${label} contains duplicate value: ${value}`);
    seen.add(value);
  }
  return errors;
}

async function directChildNames(directory, suffix) {
  const entries = await fs.readdir(path.join(repoRoot, directory), { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
    .map((entry) => entry.name.slice(0, -suffix.length))
    .sort();
}

function extractCliCommands(source) {
  const mapped = [...source.matchAll(/^\s{2}(?:'([^']+)'|([a-z][a-z-]*)):\s*'[^']+\.mjs',?$/gm)].map(
    (match) => match[1] || match[2]
  );
  return [
    ...new Set([...mapped, ...Object.keys(cliValidatorCommandMap()), 'init', 'update', 'run', 'help', 'version'])
  ].sort();
}

function extractRunSubcommands(source) {
  return [...source.matchAll(/if \(subcommand === '([^']+)'\)/g)].map((match) => match[1]).sort();
}

async function main() {
  const inventory = JSON.parse(await fs.readFile(inventoryPath, 'utf8'));
  const errors = [];
  if (inventory.schemaVersion !== 1) errors.push('public contract inventory schemaVersion must be 1.');

  const classifiedCommands = valuesByClassification(inventory.cli?.commands).sort();
  const cliSource = await fs.readFile(path.join(repoRoot, 'bin', 'qa-flowkit.mjs'), 'utf8');
  const actualCommands = extractCliCommands(cliSource);
  if (JSON.stringify(classifiedCommands) !== JSON.stringify(actualCommands)) {
    errors.push(
      `CLI command inventory mismatch.\n  actual: ${actualCommands.join(', ')}\n  classified: ${classifiedCommands.join(', ')}`
    );
  }
  errors.push(...uniqueErrors(classifiedCommands, 'CLI command inventory'));

  const classifiedRun = valuesByClassification(inventory.cli?.runSubcommands).sort();
  const runSource = await fs.readFile(path.join(repoRoot, '.qa-ai', 'scripts', 'qa-run.mjs'), 'utf8');
  const actualRun = extractRunSubcommands(runSource);
  if (JSON.stringify(classifiedRun) !== JSON.stringify(actualRun)) {
    errors.push(
      `Run subcommand inventory mismatch.\n  actual: ${actualRun.join(', ')}\n  classified: ${classifiedRun.join(', ')}`
    );
  }
  errors.push(...uniqueErrors(classifiedRun, 'Run subcommand inventory'));

  const presets = await directChildNames('.qa-ai/presets', '.yaml');
  const deprecatedPresetIds = inventory.deprecated
    .map((entry) => entry.id)
    .filter((id) => id.startsWith('preset.'))
    .map((id) => id.slice('preset.'.length));
  for (const preset of deprecatedPresetIds) {
    if (!presets.includes(preset)) errors.push(`Deprecated preset is missing from .qa-ai/presets: ${preset}`);
  }

  for (const [id, collection] of Object.entries(inventory.collections || {})) {
    try {
      const stat = await fs.stat(path.join(repoRoot, collection.path || ''));
      if (!stat.isDirectory()) errors.push(`Collection ${id} is not a directory: ${collection.path}`);
    } catch {
      errors.push(`Collection ${id} path is missing: ${collection.path}`);
    }
    if (!inventory.classifications.includes(collection.classification)) {
      errors.push(`Collection ${id} has invalid classification: ${collection.classification}`);
    }
  }

  if (errors.length > 0) {
    console.error('Public contract inventory check failed:\n');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(
    `Public contract inventory passed (${actualCommands.length} commands, ${actualRun.length} run subcommands, ${presets.length} presets).`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
