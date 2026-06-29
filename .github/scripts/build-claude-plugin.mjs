#!/usr/bin/env node
/**
 * Generates the Claude Code plugin from the Claude adapter source.
 *
 * The adapter remains the source of truth. This script writes the installable
 * plugin shape and can also verify that the committed plugin has no drift.
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { repoRoot } from './lib/ci-helpers.mjs';

const adapterRoot = path.join(repoRoot, '.qa-ai', 'adapters', 'claude');
const pluginRoot = path.join(repoRoot, 'plugin');
const marketplaceRoot = path.join(repoRoot, '.claude-plugin');
const checkOnly = process.argv.includes('--check');

const bilingualDescription =
  'QA FlowKit workflow skills, hooks and orchestrator agent / Skills, hooks y agente orquestador de QA FlowKit';

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function slashPath(value) {
  return value.replace(/\\/g, '/');
}

async function listFiles(root) {
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
  await walk(root);
  return results.sort();
}

function hash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function snapshot(root) {
  const files = await listFiles(root);
  const map = new Map();
  for (const file of files) {
    const rel = slashPath(path.relative(root, file));
    map.set(rel, hash(await fs.readFile(file)));
  }
  return map;
}

async function compareTrees(expectedRoot, actualRoot) {
  const expected = await snapshot(expectedRoot);
  const actual = await snapshot(actualRoot);
  const errors = [];

  for (const [rel, expectedHash] of expected.entries()) {
    if (!actual.has(rel)) {
      errors.push(`missing generated file: ${rel}`);
      continue;
    }
    if (actual.get(rel) !== expectedHash) errors.push(`generated file drift: ${rel}`);
  }
  for (const rel of actual.keys()) {
    if (!expected.has(rel)) errors.push(`unexpected generated file: ${rel}`);
  }
  return errors;
}

async function copyDir(source, target) {
  await fs.mkdir(target, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const src = path.join(source, entry.name);
    const dest = path.join(target, entry.name);
    if (entry.isDirectory()) await copyDir(src, dest);
    else await fs.copyFile(src, dest);
  }
}

function hookCommand(scriptPath) {
  const js = [
    "const fs=require('node:fs')",
    "const cp=require('node:child_process')",
    `const script='${scriptPath}'`,
    "if(!fs.existsSync(script)){console.error('QA FlowKit framework not installed in this repository. Run: npx qa-flowkit init');process.exit(0)}",
    "const res=cp.spawnSync(process.execPath,[script],{stdio:'inherit'})",
    'process.exit(res.status ?? 1)'
  ].join(';');
  return `node -e "${js}"`;
}

function generatedHooks() {
  return {
    hooks: {
      PostToolUse: [
        {
          matcher: 'Write|Edit',
          hooks: [
            {
              type: 'command',
              command: hookCommand('.qa-ai/scripts/hooks/post-edit-validate.mjs'),
              timeout: 30000
            }
          ]
        }
      ],
      Stop: [
        {
          hooks: [
            {
              type: 'command',
              command: hookCommand('.qa-ai/scripts/hooks/stop-gate.mjs')
            }
          ]
        }
      ]
    }
  };
}

async function parseFrontmatter(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  if (lines[0] !== '---') throw new Error(`${slashPath(path.relative(repoRoot, filePath))} is missing frontmatter`);
  const data = {};
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index] === '---') return data;
    const colonIndex = lines[index].indexOf(':');
    if (colonIndex > 0) {
      data[lines[index].slice(0, colonIndex).trim()] = lines[index].slice(colonIndex + 1).trim();
    }
  }
  throw new Error(`${slashPath(path.relative(repoRoot, filePath))} has unterminated frontmatter`);
}

async function generate(targetRoot, targetMarketplaceRoot) {
  const pkg = await readJson(path.join(repoRoot, 'package.json'));
  const commandsDir = path.join(adapterRoot, 'commands');
  const commandFiles = (await fs.readdir(commandsDir)).filter((name) => name.endsWith('.md')).sort();
  const agentFiles = (await fs.readdir(path.join(adapterRoot, 'agents'))).filter((name) => name.endsWith('.md')).sort();

  await fs.rm(targetRoot, { recursive: true, force: true });
  await fs.rm(targetMarketplaceRoot, { recursive: true, force: true });

  await fs.mkdir(path.join(targetRoot, '.claude-plugin'), { recursive: true });
  await fs.mkdir(path.join(targetRoot, 'skills'), { recursive: true });
  await fs.mkdir(path.join(targetRoot, 'hooks'), { recursive: true });
  await fs.mkdir(targetMarketplaceRoot, { recursive: true });

  await copyDir(path.join(adapterRoot, 'commands'), path.join(targetRoot, 'skills'));
  await copyDir(path.join(adapterRoot, 'agents'), path.join(targetRoot, 'agents'));
  await fs.writeFile(path.join(targetRoot, 'hooks', 'hooks.json'), `${JSON.stringify(generatedHooks(), null, 2)}\n`);

  const manifest = {
    name: 'qa-flowkit',
    description: bilingualDescription,
    version: pkg.version,
    author: 'warante',
    homepage: 'https://github.com/warante/QA_FlowKit',
    repository: 'https://github.com/warante/QA_FlowKit',
    license: 'MIT',
    skills: commandFiles.map((file) => ({
      name: path.basename(file, '.md'),
      path: `skills/${file}`,
      namespace: 'qa-flowkit'
    })),
    agents: agentFiles.map((file) => ({
      name: path.basename(file, '.md'),
      path: `agents/${file}`
    })),
    hooks: 'hooks/hooks.json'
  };

  await fs.writeFile(path.join(targetRoot, '.claude-plugin', 'plugin.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  const marketplace = {
    plugins: [
      {
        name: 'qa-flowkit',
        description: bilingualDescription,
        version: pkg.version,
        path: './plugin'
      }
    ]
  };
  await fs.writeFile(path.join(targetMarketplaceRoot, 'marketplace.json'), `${JSON.stringify(marketplace, null, 2)}\n`);
}

async function validateGenerated(root, marketplaceRoot) {
  const manifestPath = path.join(root, '.claude-plugin', 'plugin.json');
  const manifest = await readJson(manifestPath);
  const marketplace = await readJson(path.join(marketplaceRoot, 'marketplace.json'));
  const errors = [];

  for (const key of ['name', 'description', 'version', 'author', 'homepage', 'repository', 'license']) {
    if (!manifest[key]) errors.push(`plugin manifest missing ${key}`);
  }
  if (manifest.name !== 'qa-flowkit') errors.push('plugin manifest name must be qa-flowkit');
  if (!/\S+\s\/\s\S+/.test(manifest.description)) errors.push('plugin manifest description must be bilingual');
  if (!Array.isArray(manifest.skills) || manifest.skills.length === 0) errors.push('plugin manifest has no skills');
  if (!Array.isArray(manifest.agents) || manifest.agents.length === 0) errors.push('plugin manifest has no agents');

  const adapterSkillFiles = (await fs.readdir(path.join(adapterRoot, 'commands'))).filter((name) =>
    name.endsWith('.md')
  );
  const generatedSkillFiles = (await fs.readdir(path.join(root, 'skills'))).filter((name) => name.endsWith('.md'));
  if (generatedSkillFiles.length !== adapterSkillFiles.length) {
    errors.push(`expected ${adapterSkillFiles.length} skills, found ${generatedSkillFiles.length}`);
  }

  for (const file of adapterSkillFiles.sort()) {
    if (!generatedSkillFiles.includes(file)) errors.push(`missing generated skill ${file}`);
    const frontmatter = await parseFrontmatter(path.join(root, 'skills', file));
    if (!/\S+\s*\/\s*\S+/.test(frontmatter.description || '')) {
      errors.push(`skill ${file} description is not bilingual`);
    }
    if (file === 'qa-gate.md' && frontmatter['disable-model-invocation'] !== 'true') {
      errors.push('qa-gate skill must keep disable-model-invocation: true');
    }
  }

  const hooks = await readJson(path.join(root, 'hooks', 'hooks.json'));
  if (!hooks.hooks?.PostToolUse || !hooks.hooks?.Stop) errors.push('plugin hooks must include PostToolUse and Stop');
  if (!marketplace.plugins?.some((plugin) => plugin.name === 'qa-flowkit' && plugin.path === './plugin')) {
    errors.push('marketplace manifest must list qa-flowkit at ./plugin');
  }

  if (errors.length > 0) {
    throw new Error(`Claude plugin validation failed:\n- ${errors.join('\n- ')}`);
  }

  return { skills: generatedSkillFiles.length, agents: manifest.agents.length };
}

async function main() {
  if (!(await pathExists(adapterRoot))) throw new Error(`Claude adapter not found: ${adapterRoot}`);

  if (checkOnly) {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-flowkit-claude-plugin-'));
    const tmpPlugin = path.join(tmpRoot, 'plugin');
    const tmpMarketplace = path.join(tmpRoot, '.claude-plugin');
    await generate(tmpPlugin, tmpMarketplace);
    await validateGenerated(tmpPlugin, tmpMarketplace);
    const errors = [
      ...(await compareTrees(tmpPlugin, pluginRoot)),
      ...(await compareTrees(tmpMarketplace, marketplaceRoot))
    ];
    await fs.rm(tmpRoot, { recursive: true, force: true });
    if (errors.length > 0) {
      console.error('Claude plugin drift check failed:\n');
      for (const error of errors) console.error(`  - ${error}`);
      console.error('\nFix: run node .github/scripts/build-claude-plugin.mjs and commit the generated output.');
      process.exit(1);
    }
    console.log('Claude plugin drift check passed.');
    return;
  }

  await generate(pluginRoot, marketplaceRoot);
  const result = await validateGenerated(pluginRoot, marketplaceRoot);
  console.log(`Claude plugin generated (${result.skills} skills, ${result.agents} agent).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
