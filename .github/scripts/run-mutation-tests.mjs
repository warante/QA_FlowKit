#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { repoRoot } from './lib/ci-helpers.mjs';
import { mutationTestModules } from './lib/mutation-suites.mjs';

for (const file of mutationTestModules(process.env.QA_FLOWKIT_MUTATION_TARGET || '')) {
  await import(pathToFileURL(path.join(repoRoot, file)).href);
}
