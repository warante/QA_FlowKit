import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { cliPath, installPackTarball, node, repoRoot, resolvePackTarball, run } from './ci-helpers.mjs';

export function exampleRootFromRepo(...segments) {
  return path.join(repoRoot, ...segments);
}

export function wantsPackedExampleRuntime() {
  return process.argv.includes('--runtime');
}

/**
 * @param {object} options
 * @param {string} options.tempPrefix
 * @param {string} options.exampleRoot
 * @param {'target' | 'separate'} [options.cliInstall='target']
 */
export async function createPackedExampleWorkspace({ tempPrefix, exampleRoot, cliInstall = 'target' }) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), tempPrefix));
  const packDir = path.join(tempRoot, 'pack');
  const npmCache = path.join(tempRoot, 'npm-cache');
  const targetRoot = path.join(tempRoot, 'target');

  await fs.mkdir(npmCache, { recursive: true });
  await fs.cp(exampleRoot, targetRoot, { recursive: true });

  const { tarball } = await resolvePackTarball({ packDir, npmCache });

  let cliRoot;
  if (cliInstall === 'separate') {
    cliRoot = path.join(tempRoot, 'cli');
    await fs.mkdir(cliRoot, { recursive: true });
    installPackTarball(cliRoot, tarball, { npmCache });
  } else {
    cliRoot = targetRoot;
    installPackTarball(targetRoot, tarball, { npmCache });
  }

  return {
    tempRoot,
    packDir,
    npmCache,
    targetRoot,
    cliRoot,
    cli: cliPath(cliRoot)
  };
}

export function runPackedInit(cli, targetRoot, preset, extraInitArgs = []) {
  run(node, [cli, 'init', '--preset', preset, '--no-adapters', '--skip-doctor', ...extraInitArgs], { cwd: targetRoot });
}

export function runPackedValidateTarget(cli, targetRoot) {
  run(node, [cli, 'validate-target', '--allow-empty', '--allow-missing', '--no-strict-doctor'], { cwd: targetRoot });
}

/**
 * @param {object} options
 * @param {string} options.tempPrefix
 * @param {string} options.exampleRoot
 * @param {'target' | 'separate'} [options.cliInstall='target']
 * @param {(workspace: Awaited<ReturnType<typeof createPackedExampleWorkspace>>) => Promise<void>} options.validate
 * @param {string} options.structuralMessage
 * @param {string} [options.runtimeMessage]
 */
export async function runPackedExampleValidation({
  tempPrefix,
  exampleRoot,
  cliInstall = 'target',
  validate,
  structuralMessage,
  runtimeMessage = structuralMessage
}) {
  const workspace = await createPackedExampleWorkspace({ tempPrefix, exampleRoot, cliInstall });
  try {
    await validate(workspace);
    console.log(wantsPackedExampleRuntime() ? runtimeMessage : structuralMessage);
  } finally {
    await fs.rm(workspace.tempRoot, { recursive: true, force: true });
  }
}
