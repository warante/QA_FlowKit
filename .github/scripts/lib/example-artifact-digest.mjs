import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

/** Only framework definitions are excluded; canonical output/features and user docs remain protected. */
export async function digestExampleArtifacts(root) {
  const entries = [];
  const frameworkPrefixes = [
    '.qa-ai/scripts/',
    '.qa-ai/agents/',
    '.qa-ai/rules/',
    '.qa-ai/templates/',
    '.qa-ai/contracts/',
    '.qa-ai/presets/',
    '.qa-ai/adapters/',
    '.qa-ai/workflows/',
    '.qa-ai/state/'
  ];
  const frameworkFiles = new Set(['.qa-ai/docs/test-strategy-guide.md']);
  async function visit(directory, depth = 0) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (depth === 0 && entry.name === 'node_modules') continue;
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join('/');
      if (entry.isDirectory()) await visit(absolute, depth + 1);
      else {
        if (frameworkFiles.has(relative) || frameworkPrefixes.some((prefix) => relative.startsWith(prefix))) continue;
        entries.push(
          `${relative}:${createHash('sha256')
            .update(await fs.readFile(absolute))
            .digest('hex')}`
        );
      }
    }
  }
  await visit(root);
  return entries.sort().join('\n');
}
