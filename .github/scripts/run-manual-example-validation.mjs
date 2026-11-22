#!/usr/bin/env node
/**
 * Installs the locally packed CLI into the public manual-only example and validates it strictly.
 */
import { node, run } from './lib/ci-helpers.mjs';
import { digestExampleArtifacts as digestTree } from './lib/example-artifact-digest.mjs';
import {
  exampleRootFromRepo,
  runPackedExampleValidation,
  runPackedInit,
  runPackedValidateTarget
} from './lib/packed-example-validation.mjs';

const exampleRoot = exampleRootFromRepo('examples', 'manual-only');

async function main() {
  await runPackedExampleValidation({
    tempPrefix: 'qa-flowkit-manual-example-',
    exampleRoot,
    structuralMessage: 'Manual-only public example passed packed install and strict validation.',
    validate: async ({ cli, targetRoot }) => {
      const originalDigest = await digestTree(targetRoot);

      runPackedInit(cli, targetRoot, 'manual-only');

      const afterInitDigest = await digestTree(targetRoot);
      if (afterInitDigest !== originalDigest) {
        const before = new Set(originalDigest.split('\n'));
        const after = new Set(afterInitDigest.split('\n'));
        const changed = [
          ...[...before].filter((entry) => !after.has(entry)).map((entry) => `before: ${entry}`),
          ...[...after].filter((entry) => !before.has(entry)).map((entry) => `after: ${entry}`)
        ];
        throw new Error(`Packed init modified canonical example artifacts:\n${changed.join('\n')}`);
      }

      run(node, [cli, 'doctor', '--strict'], { cwd: targetRoot });
      runPackedValidateTarget(cli, targetRoot);
    }
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
