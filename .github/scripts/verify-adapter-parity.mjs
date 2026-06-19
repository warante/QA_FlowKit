#!/usr/bin/env node
/**
 * Ensures root adapter copies match .qa-ai/adapters templates (single source of truth).
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const pairs = [
  {
    label: 'Claude Code',
    expected: path.join(repoRoot, '.qa-ai', 'adapters', 'claude'),
    actual: path.join(repoRoot, '.claude')
  },
  {
    label: 'OpenCode',
    expected: path.join(repoRoot, '.qa-ai', 'adapters', 'opencode'),
    actual: path.join(repoRoot, '.opencode')
  }
];

async function listFiles(dir) {
  const results = [];
  async function walk(current) {
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else results.push(full);
    }
  }
  await walk(dir);
  return results.sort();
}

function hash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function relativeFiles(root, files) {
  const map = new Map();
  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    if (rel === 'settings.json') continue;
    const content = await fs.readFile(file);
    map.set(rel, hash(content));
  }
  return map;
}

async function comparePair({ label, expected, actual }) {
  const expectedFiles = await listFiles(expected);
  const actualFiles = await listFiles(actual);
  const expectedMap = await relativeFiles(expected, expectedFiles);
  const actualMap = await relativeFiles(actual, actualFiles);
  const errors = [];

  for (const rel of expectedMap.keys()) {
    if (!actualMap.has(rel)) {
      errors.push(`${label}: missing in root copy: ${rel}`);
      continue;
    }
    if (expectedMap.get(rel) !== actualMap.get(rel)) {
      errors.push(`${label}: content drift: ${rel}`);
    }
  }

  for (const rel of actualMap.keys()) {
    if (!expectedMap.has(rel)) {
      errors.push(`${label}: unexpected extra file in root copy: ${rel}`);
    }
  }

  return errors;
}

async function checkClaudeCommandsFrontmatter(repoRoot) {
  const commandsDir = path.join(repoRoot, '.qa-ai', 'adapters', 'claude', 'commands');
  let files;
  try {
    files = (await fs.readdir(commandsDir)).filter((f) => f.endsWith('.md'));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const errors = [];

  const readOnlyCommands = new Set([
    'qa-status.md',
    'qa-help.md',
    'qa-doctor.md',
    'qa-validate-features.md',
    'qa-validate-karate-features.md',
    'qa-coverage.md',
    'qa-quality.md'
  ]);

  for (const file of files) {
    const filePath = path.join(commandsDir, file);
    const content = await fs.readFile(filePath, 'utf8');

    // Parse frontmatter
    const lines = content.split(/\r?\n/);
    if (lines[0] !== '---') {
      errors.push(`Claude command ${file} is missing frontmatter start marker '---'`);
      continue;
    }

    const frontmatter = {};
    let endIdx = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '---') {
        endIdx = i;
        break;
      }
      const colonIndex = lines[i].indexOf(':');
      if (colonIndex > 0) {
        const key = lines[i].slice(0, colonIndex).trim();
        const val = lines[i].slice(colonIndex + 1).trim();
        frontmatter[key] = val;
      }
    }

    if (endIdx === -1) {
      errors.push(`Claude command ${file} is missing frontmatter end marker '---'`);
      continue;
    }

    // Assertion 1: description remains bilingual (regex \S+ / \S+)
    const description = frontmatter.description;
    if (!description) {
      errors.push(`Claude command ${file} is missing description in frontmatter`);
    } else {
      const bilingualPattern = /\S+\s*\/\s*\S+/;
      if (!bilingualPattern.test(description)) {
        errors.push(`Claude command ${file} description is not bilingual: "${description}"`);
      }
    }

    // Assertion 2: allowed-tools is present
    const allowedToolsStr = frontmatter['allowed-tools'];
    if (!allowedToolsStr) {
      errors.push(`Claude command ${file} is missing allowed-tools in frontmatter`);
    } else {
      // Parse array format [tool1, tool2]
      const tools = allowedToolsStr
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      // Assertion 3: read-only commands do not allow write/edit tools
      if (readOnlyCommands.has(file)) {
        for (const tool of tools) {
          const lowerTool = tool.toLowerCase();
          if (lowerTool.includes('write') || lowerTool.includes('edit')) {
            errors.push(`Claude command ${file} is read-only but allows modifying tool: "${tool}"`);
          }
        }
      }
    }

    // Assertion 4: qa-gate.md must get disable-model-invocation: true
    if (file === 'qa-gate.md') {
      const disableModel = frontmatter['disable-model-invocation'];
      if (disableModel !== 'true') {
        errors.push(`Claude command qa-gate.md is missing 'disable-model-invocation: true'`);
      }
    }
  }

  return errors;
}

async function main() {
  const allErrors = [];
  for (const pair of pairs) {
    allErrors.push(...(await comparePair(pair)));
  }

  allErrors.push(...(await checkClaudeCommandsFrontmatter(repoRoot)));

  if (allErrors.length > 0) {
    console.error('Adapter parity check failed:\n');
    for (const error of allErrors) console.error(`  - ${error}`);
    console.error('\nFix: edit .qa-ai/adapters/* only, then run:');
    console.error('  node .qa-ai/scripts/sync-agent-adapters.mjs --adapters claude,opencode --force');
    process.exit(1);
  }

  console.log('Adapter parity check passed (claude, opencode).');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
