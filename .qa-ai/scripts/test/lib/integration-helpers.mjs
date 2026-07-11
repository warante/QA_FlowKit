import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const sourceRoot = path.resolve(path.join(import.meta.dirname, '..', '..', '..', '..'));

export const frameworkSourceRoot = sourceRoot;
const node = process.execPath;

export async function copyFramework(targetDir) {
  await fs.cp(path.join(sourceRoot, '.qa-ai'), path.join(targetDir, '.qa-ai'), { recursive: true, force: true });
  await fs.rm(path.join(targetDir, '.qa-ai', 'qa-ai.config.yaml'), { force: true });
  await fs.rm(path.join(targetDir, '.qa-ai', 'features'), { recursive: true, force: true });
  await fs.rm(path.join(targetDir, '.qa-ai', 'output'), { recursive: true, force: true });
  await fs.rm(path.join(targetDir, '.qa-ai', 'state', 'init-manifest.json'), { force: true });
}

export function runInWorkspace(cwd, args, { expectFailure = false } = {}) {
  const result = spawnSync(node, args, { cwd, encoding: 'utf8', shell: false });
  const failed = result.status !== 0;
  if (expectFailure ? !failed : failed) {
    throw new Error(
      [
        `Command ${expectFailure ? 'succeeded unexpectedly' : 'failed'}: node ${args.join(' ')}`,
        result.stdout,
        result.stderr
      ]
        .filter(Boolean)
        .join('\n')
    );
  }
  return result;
}

export async function withCopiedFramework(run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-flowkit-integration-'));
  try {
    await copyFramework(tempDir);
    return await run(tempDir);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
