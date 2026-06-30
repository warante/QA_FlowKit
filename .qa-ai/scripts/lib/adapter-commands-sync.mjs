import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ADAPTER_COMMAND_HOSTS,
  HOST_SPECIFIC_ADAPTER_COMMANDS,
  SHARED_ADAPTER_COMMANDS
} from './inventory-manifest.mjs';
import { pathExists, readText, writeFileSafe } from './utils.mjs';

const HOST_VARIANTS = {
  claude: {
    QUESTION_TOOL: "Claude Code's interactive question tool",
    HOST_NAME: 'Claude Code',
    ADAPTER_OPTIONS: '`claude`, `claude,opencode`, `all` and `none`',
    ADAPTER_RECOMMENDATION: 'Recommend `claude,opencode` when the user wants both.'
  },
  opencode: {
    QUESTION_TOOL: "OpenCode's built-in `question` tool",
    HOST_NAME: 'OpenCode',
    ADAPTER_OPTIONS: '`opencode`, `opencode,claude`, `all` and `none`',
    ADAPTER_RECOMMENDATION: 'Recommend `opencode,claude` when the user wants both.'
  }
};

function renderTemplate(content, vars) {
  let rendered = content;
  for (const [key, value] of Object.entries(vars)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value);
  }
  return rendered;
}

/**
 * Regenerate claude/opencode slash commands from shared/commands templates.
 * @param {string} frameworkRoot Absolute path to `.qa-ai` directory.
 */
export async function syncAdapterCommands(frameworkRoot) {
  const sharedDir = path.join(frameworkRoot, 'adapters', 'shared', 'commands');
  if (!(await pathExists(sharedDir))) {
    throw new Error(`Missing shared adapter commands directory: ${sharedDir}`);
  }

  for (const host of ADAPTER_COMMAND_HOSTS) {
    const vars = HOST_VARIANTS[host];
    if (!vars) throw new Error(`Missing host variants for adapter: ${host}`);
    const targetDir = path.join(frameworkRoot, 'adapters', host, 'commands');
    await fs.mkdir(targetDir, { recursive: true });

    for (const fileName of SHARED_ADAPTER_COMMANDS) {
      const source = path.join(sharedDir, fileName);
      const content = await readText(source);
      await writeFileSafe(path.join(targetDir, fileName), content, { force: true });
    }

    for (const fileName of HOST_SPECIFIC_ADAPTER_COMMANDS) {
      const source = path.join(sharedDir, fileName);
      const template = await readText(source);
      await writeFileSafe(path.join(targetDir, fileName), renderTemplate(template, vars), { force: true });
    }
  }
}
