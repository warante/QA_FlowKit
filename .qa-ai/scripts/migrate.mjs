#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { pathExists } from './lib/utils.mjs';

const cwd = process.cwd();
const args = new Set(process.argv.slice(2));
const mappings = [
  ['qa-ai.config.yaml', '.qa-ai/qa-ai.config.yaml'],
  ['qa-ai-output', '.qa-ai/output'],
  ['features', '.qa-ai/features']
];

function modernizeConfig(content) {
  const legacyAllow = content.match(/^\s*allowInferredAcceptanceCriteria:\s*(true|false)\s*$/m)?.[1];
  const legacyApproval = content.match(/^\s*requireApprovalForInferredCriteria:\s*(true|false)\s*$/m)?.[1];
  const inferred =
    legacyAllow === 'false'
      ? 'forbid'
      : legacyAllow === 'true' && legacyApproval === 'false'
        ? 'allow'
        : legacyAllow === 'true'
          ? 'require-approval'
          : null;
  const existingInferred = content.match(/^\s*inferredAcceptanceCriteria:\s*([^\s#]+).*$/m)?.[1];
  if (inferred && existingInferred && inferred !== existingInferred) {
    throw new Error(
      `Conflicting inferred acceptance criteria policies: legacy=${inferred}, modern=${existingInferred}.`
    );
  }
  let updated = content
    .replace(/^([ \t]*)oneScenarioPerFile:\s*true\s*$/gm, '$1scenarioLayout: one-per-file')
    .replace(/^([ \t]*)oneScenarioPerFile:\s*false\s*$/gm, '$1scenarioLayout: multiple-per-file');
  updated = updated.replace(/^\s*allowInferredAcceptanceCriteria:.*\r?\n/gm, '');
  updated = updated.replace(/^\s*requireApprovalForInferredCriteria:.*\r?\n/gm, '');
  if (inferred && !existingInferred) {
    updated = updated.replace(/(^\s*requireOfficialRfId:.*$)/m, `$1\n  inferredAcceptanceCriteria: ${inferred}`);
  }
  updated = updated.replaceAll('qa-ai-output/', '.qa-ai/output/');
  updated = updated.replace(/(?<!\.qa-ai\/)features\//g, '.qa-ai/features/');
  updated = updated.replace(/(?<!\.qa-ai\/)tests\//g, '.qa-ai/tests/');
  return updated;
}

async function planMigration() {
  const actions = [];
  const rootConfigPath = path.join(cwd, 'qa-ai.config.yaml');
  const rootConfig = (await pathExists(rootConfigPath)) ? await fs.readFile(rootConfigPath, 'utf8') : '';
  const effectiveMappings = rootConfig.includes('tests/') ? [...mappings, ['tests', '.qa-ai/tests']] : mappings;
  for (const [from, to] of effectiveMappings) {
    const source = path.join(cwd, from);
    if (!(await pathExists(source))) continue;
    const target = path.join(cwd, to);
    if (await pathExists(target)) {
      if (from.endsWith('.yaml')) {
        actions.push({ type: 'config-replace', from, to });
      } else {
        const conflicts = await conflictingFiles(source, target);
        if (conflicts.length > 0) actions.push({ type: 'conflict', from, to, conflicts });
        else actions.push({ type: 'merge', from, to });
      }
    } else {
      actions.push({ type: from.endsWith('.yaml') ? 'config' : 'move', from, to });
    }
  }
  return actions;
}

async function conflictingFiles(source, target, relative = '') {
  const conflicts = [];
  for (const entry of await fs.readdir(source, { withFileTypes: true })) {
    const sourceEntry = path.join(source, entry.name);
    const targetEntry = path.join(target, entry.name);
    const childRelative = path.join(relative, entry.name);
    if (!(await pathExists(targetEntry))) continue;
    const targetStat = await fs.stat(targetEntry);
    if (entry.isDirectory() && targetStat.isDirectory()) {
      conflicts.push(...(await conflictingFiles(sourceEntry, targetEntry, childRelative)));
    } else if (!entry.isDirectory() && targetStat.isFile()) {
      const [left, right] = await Promise.all([fs.readFile(sourceEntry), fs.readFile(targetEntry)]);
      if (!left.equals(right)) conflicts.push(childRelative);
    } else {
      conflicts.push(childRelative);
    }
  }
  return conflicts;
}

async function confirm() {
  if (args.has('--yes')) return true;
  if (!process.stdin.isTTY || !process.stdout.isTTY) return false;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question('\nApply this migration? [y/N] ');
    return ['y', 'yes'].includes(answer.trim().toLowerCase());
  } finally {
    rl.close();
  }
}

async function main() {
  const actions = await planMigration();
  console.log('QA FlowKit legacy migration preview');
  if (actions.length === 0) {
    console.log('No legacy layout detected.');
    return;
  }
  for (const action of actions) {
    console.log(`- ${action.type}: ${action.from} -> ${action.to}`);
    for (const conflict of action.conflicts || []) console.log(`  conflicting file: ${conflict}`);
  }
  const conflicts = actions.filter((action) => action.type === 'conflict');
  if (conflicts.length > 0) {
    throw new Error(
      'Migration cannot continue while modern targets already exist. Merge or remove the conflicts explicitly.'
    );
  }
  if (args.has('--dry-run')) return;
  if (!(await confirm())) {
    throw new Error('Migration not approved. No files were changed. Re-run interactively or pass --yes.');
  }
  for (const action of actions) {
    const source = path.join(cwd, action.from);
    const target = path.join(cwd, action.to);
    await fs.mkdir(path.dirname(target), { recursive: true });
    if (action.type === 'config' || action.type === 'config-replace') {
      await fs.writeFile(target, modernizeConfig(await fs.readFile(source, 'utf8')), 'utf8');
      await fs.rm(source);
    } else if (action.type === 'merge') {
      await fs.cp(source, target, { recursive: true, force: true });
      await fs.rm(source, { recursive: true, force: true });
    } else {
      await fs.rename(source, target);
    }
  }
  console.log('Legacy migration applied. Run: node .qa-ai/scripts/doctor.mjs --strict');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
