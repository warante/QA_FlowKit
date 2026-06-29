#!/usr/bin/env node
import { executeKarate } from './lib/karate-runtime.mjs';
import {
  exampleRootFromRepo,
  runPackedExampleValidation,
  runPackedInit,
  runPackedValidateTarget,
  wantsPackedExampleRuntime
} from './lib/packed-example-validation.mjs';

const exampleRoot = exampleRootFromRepo('examples', 'karate-full');

async function main() {
  await runPackedExampleValidation({
    tempPrefix: 'qa-flowkit-karate-example-',
    exampleRoot,
    structuralMessage: 'Karate public example passed packed install and strict structural validation.',
    runtimeMessage:
      'Karate public example passed packed install, strict validation and runtime execution.',
    validate: async ({ cli, targetRoot, tempRoot }) => {
      runPackedInit(cli, targetRoot, 'karate-full');
      runPackedValidateTarget(cli, targetRoot);

      if (wantsPackedExampleRuntime()) {
        await executeKarate({
          targetRoot,
          tempRoot,
          serverEntry: 'app/server.mjs',
          healthPath: '/api/profile',
          karatePaths: ['tests/karate/features/api', 'tests/karate/features/ui']
        });
      }
    }
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
