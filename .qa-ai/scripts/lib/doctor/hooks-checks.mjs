import path from 'node:path';
import fs from 'node:fs/promises';
import { pathExists } from '../utils.mjs';

export async function runHooksChecks(cwd) {
  let warned = 0;
  const claudeAdapterDir = path.join(cwd, '.claude');
  if (!(await pathExists(claudeAdapterDir))) {
    return { warned };
  }

  let hooksValid = true;
  let hooksReason = '';
  const settingsPath = path.join(cwd, '.claude/settings.json');
  if (!(await pathExists(settingsPath))) {
    hooksValid = false;
    hooksReason = 'missing settings file';
  } else {
    try {
      const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
      let postEditExists = false;
      if (settings.hooks && Array.isArray(settings.hooks.PostToolUse)) {
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
      }
      let stopGateExists = false;
      if (settings.hooks && Array.isArray(settings.hooks.Stop)) {
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
      }
      if (!postEditExists || !stopGateExists) {
        hooksValid = false;
        hooksReason = 'hooks not registered in settings';
      }
    } catch (err) {
      hooksValid = false;
      hooksReason = `failed to parse settings JSON (${err.message})`;
    }
  }

  if (hooksValid) {
    const { spawnSync } = await import('node:child_process');
    const postEditScript = path.join(cwd, '.qa-ai/scripts/hooks/post-edit-validate.mjs');
    const stopGateScript = path.join(cwd, '.qa-ai/scripts/hooks/stop-gate.mjs');

    if (!(await pathExists(postEditScript)) || !(await pathExists(stopGateScript))) {
      hooksValid = false;
      hooksReason = 'hook scripts not found in framework';
    } else {
      const postEditRes = spawnSync(process.execPath, [postEditScript, '--self-test'], { encoding: 'utf8' });
      const stopGateRes = spawnSync(process.execPath, [stopGateScript, '--self-test'], { encoding: 'utf8' });

      if (postEditRes.status !== 0 || stopGateRes.status !== 0) {
        hooksValid = false;
        hooksReason = 'hook scripts self-test failed';
      }
    }
  }

  if (hooksValid) {
    console.log('[PASS] Claude adapter hooks: configured and verified');
  } else {
    warned += 1;
    console.log(`[WARN] Claude adapter hooks: incomplete or not verified (${hooksReason})`);
  }

  return { warned };
}
