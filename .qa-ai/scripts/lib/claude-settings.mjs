import path from 'node:path';
import { pathExists, ensureDir, readText, writeFileSafe, manifestEntry, relativeTo } from './utils.mjs';

/**
 * Idempotently merges QA FlowKit Claude hooks settings fragment into target .claude/settings.json.
 *
 * @param {string} cwd Current working directory
 * @param {boolean} force Force overwrite/re-sync if required
 * @returns {Promise<object|null>} Manifest entry if updated or created, null otherwise
 */
export async function mergeClaudeSettings(cwd, force = false) {
  const sourceTemplatePath = path.join(cwd, '.qa-ai/adapters/claude/settings/hooks.json');
  const targetSettingsPath = path.join(cwd, '.claude/settings.json');

  if (!(await pathExists(sourceTemplatePath))) {
    console.warn(`[WARN] Claude settings hooks template not found at ${relativeTo(cwd, sourceTemplatePath)}`);
    return null;
  }

  let fragment;
  try {
    fragment = JSON.parse(await readText(sourceTemplatePath));
  } catch (err) {
    console.error(`[FAIL] Failed to parse Claude settings template: ${err.message}`);
    return null;
  }

  let settings = {};
  let exists = await pathExists(targetSettingsPath);
  if (exists) {
    try {
      settings = JSON.parse(await readText(targetSettingsPath));
    } catch {
      console.warn(
        `[WARN] Failed to parse existing ${relativeTo(cwd, targetSettingsPath)}. Initializing fresh settings.`
      );
      exists = false; // treat as fresh if corrupt
    }
  }

  if (!settings.hooks || typeof settings.hooks !== 'object') {
    settings.hooks = {};
  }

  let postEditExists = false;
  if (Array.isArray(settings.hooks.PostToolUse)) {
    for (const group of settings.hooks.PostToolUse) {
      if (group && Array.isArray(group.hooks)) {
        for (const hook of group.hooks) {
          if (hook && hook.command && String(hook.command).includes('post-edit-validate.mjs')) {
            postEditExists = true;
            break;
          }
        }
      }
      if (postEditExists) break;
    }
  } else {
    settings.hooks.PostToolUse = [];
  }

  let stopGateExists = false;
  if (Array.isArray(settings.hooks.Stop)) {
    for (const group of settings.hooks.Stop) {
      if (group && Array.isArray(group.hooks)) {
        for (const hook of group.hooks) {
          if (hook && hook.command && String(hook.command).includes('stop-gate.mjs')) {
            stopGateExists = true;
            break;
          }
        }
      }
      if (stopGateExists) break;
    }
  } else {
    settings.hooks.Stop = [];
  }

  // If both hooks exist and we are not forcing, we can skip with a warning
  if (postEditExists && stopGateExists && !force) {
    console.log(`  skipped ${relativeTo(cwd, targetSettingsPath)} (hooks already configured)`);
    return null;
  }

  let updated = false;

  if (!postEditExists || force) {
    // If forcing and it existed, filter it out first to avoid duplicates
    if (force && postEditExists) {
      settings.hooks.PostToolUse = settings.hooks.PostToolUse.filter((group) => {
        if (!group || !Array.isArray(group.hooks)) return true;
        return !group.hooks.some(
          (hook) => hook && hook.command && String(hook.command).includes('post-edit-validate.mjs')
        );
      });
    }

    const templatePostToolUse = fragment.hooks?.PostToolUse || [];
    settings.hooks.PostToolUse.push(...templatePostToolUse);
    updated = true;
  }

  if (!stopGateExists || force) {
    // If forcing and it existed, filter it out first to avoid duplicates
    if (force && stopGateExists) {
      settings.hooks.Stop = settings.hooks.Stop.filter((group) => {
        if (!group || !Array.isArray(group.hooks)) return true;
        return !group.hooks.some((hook) => hook && hook.command && String(hook.command).includes('stop-gate.mjs'));
      });
    }

    const templateStop = fragment.hooks?.Stop || [];
    settings.hooks.Stop.push(...templateStop);
    updated = true;
  }

  if (updated || !exists) {
    await ensureDir(path.dirname(targetSettingsPath));
    await writeFileSafe(targetSettingsPath, `${JSON.stringify(settings, null, 2)}\n`, { force: true });
    console.log(`  ${exists ? 'updated' : 'created'} ${relativeTo(cwd, targetSettingsPath)}`);

    return manifestEntry(cwd, targetSettingsPath, {
      type: 'file',
      category: 'adapter',
      source: 'adapter:claude'
    });
  }

  return null;
}
