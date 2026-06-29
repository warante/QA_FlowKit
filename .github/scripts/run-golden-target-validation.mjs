#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { runNodeScript } from './lib/ci-helpers.mjs';

const script = fileURLToPath(new URL('./run-fixture-target-validation.mjs', import.meta.url));
const result = runNodeScript(script, ['--fixture=golden-target']);
process.exit(result.status ?? 1);
