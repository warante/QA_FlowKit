import path from 'node:path';
import { copyDirSafe, manifestEntry, pathExists, readText, writeFileSafe } from './utils.mjs';

const SKILL_ROOTS = { claude: '.claude/skills', codex: '.agents/skills', opencode: '.opencode/skills' };

export async function syncNativeSkill(cwd, adapter, force = false) {
  if (!SKILL_ROOTS[adapter]) return [];
  const source = path.join(cwd, '.qa-ai/adapters/shared/skills/qa-flowkit');
  const target = path.join(cwd, SKILL_ROOTS[adapter], 'qa-flowkit');
  const results = await copyDirSafe(source, target, { force });
  const entries = [];
  for (const result of results) {
    if ((result.type === 'dir' && result.created) || (result.type === 'file' && result.copied)) {
      entries.push(
        await manifestEntry(cwd, result.path, { type: result.type, category: 'adapter', source: `adapter:${adapter}` })
      );
    }
  }
  return entries;
}

// No shell interpolation of repository paths. This launcher also works from nested directories.
export function codexHookCommand(hook) {
  if (!['post-edit', 'stop'].includes(hook)) throw new Error('Unknown Codex hook');
  const code = [
    "const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process')",
    'let root=process.cwd()',
    "while(!fs.existsSync(path.join(root,'.qa-ai/scripts/hooks/codex-hook.mjs'))){const parent=path.dirname(root);if(parent===root){console.error('QA FlowKit hook script missing');process.exit(1)}root=parent}",
    `const result=cp.spawnSync(process.execPath,[path.join(root,'.qa-ai/scripts/hooks/codex-hook.mjs'),'${hook}'],{cwd:root,stdio:'inherit'})`,
    'process.exit(result.status??1)'
  ].join(';');
  return `node -e "${code}"`;
}

export async function syncCodexHooks(cwd, force = false) {
  const target = path.join(cwd, '.codex/hooks.json');
  const exists = await pathExists(target);
  if (exists && !force) {
    console.log('  skipped .codex/hooks.json (use --hooks --force to merge; existing hooks are preserved)');
    return null;
  }
  const config = exists ? JSON.parse(await readText(target)) : {};
  if (
    !config ||
    Array.isArray(config) ||
    typeof config !== 'object' ||
    (config.hooks !== undefined && (!config.hooks || Array.isArray(config.hooks) || typeof config.hooks !== 'object'))
  ) {
    throw new Error('Invalid .codex/hooks.json; refusing to overwrite existing configuration.');
  }
  config.hooks ??= {};
  for (const [event, hook] of [
    ['PostToolUse', 'post-edit'],
    ['Stop', 'stop']
  ]) {
    const groups = config.hooks[event] ?? [];
    if (!Array.isArray(groups) || groups.some((group) => !group || !Array.isArray(group.hooks))) {
      throw new Error(`Invalid Codex ${event} hook groups; refusing to overwrite existing configuration.`);
    }
    // Replace our handlers only, including when a user shares the same matcher group.
    config.hooks[event] = groups
      .map((group) => ({
        ...group,
        hooks: group.hooks.filter(
          (handler) => !String(handler.command || '').includes('.qa-ai/scripts/hooks/codex-hook.mjs')
        )
      }))
      .filter((group) => group.hooks.length > 0);
    config.hooks[event].push({
      ...(event === 'PostToolUse' ? { matcher: '^(apply_patch|Edit|Write)$' } : {}),
      hooks: [{ type: 'command', command: codexHookCommand(hook), timeout: 30 }]
    });
  }
  await writeFileSafe(target, `${JSON.stringify(config, null, 2)}\n`, { force: exists });
  console.log('  configured .codex/hooks.json; review and trust these hooks with /hooks in Codex');
  return manifestEntry(cwd, target, { type: 'file', category: 'adapter', source: 'adapter:codex' });
}
