#!/usr/bin/env node
import { executeKarate } from './lib/karate-runtime.mjs';
import {
  exampleRootFromRepo,
  runPackedExampleValidation,
  runPackedInit,
  runPackedValidateTarget,
  wantsPackedExampleRuntime
} from './lib/packed-example-validation.mjs';

const exampleRoot = exampleRootFromRepo('examples', 'maestro-karate-mobile');

async function main() {
  await runPackedExampleValidation({
    tempPrefix: 'qa-flowkit-mobile-example-',
    exampleRoot,
    cliInstall: 'separate',
    structuralMessage: 'Mobile reference passed packed install and strict structural validation.',
    runtimeMessage: 'Mobile reference passed packed install, strict validation and Karate API execution.',
    validate: async ({ cli, targetRoot, tempRoot }) => {
      runPackedInit(cli, targetRoot, 'maestro-karate-mobile', [
        '--set',
        'automation.mobile.appId=com.example.qaflowkit'
      ]);
      runPackedValidateTarget(cli, targetRoot);

      if (wantsPackedExampleRuntime()) {
        await executeKarate({
          targetRoot,
          tempRoot,
          serverEntry: 'app/server.mjs',
          healthPath: '/api/accounts/demo/balance',
          karatePaths: ['tests/karate/features/api']
        });
      }
    }
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
