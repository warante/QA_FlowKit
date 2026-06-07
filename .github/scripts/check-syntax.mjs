#!/usr/bin/env node
/**
 * Portable syntax checker for .mjs scripts.
 * Replaces the bash `find | xargs node --check` step so CI works on
 * ubuntu-latest and windows-latest without shell portability issues.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function findMjs(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findMjs(fullPath, results);
    } else if (entry.name.endsWith('.mjs')) {
      results.push(fullPath);
    }
  }
  return results;
}

const toCheck = [
  ...findMjs(path.join('.qa-ai', 'scripts')),
  ...findMjs(path.join('.github', 'scripts')),
  path.join('bin', 'qa-flowkit.mjs')
];

let allPassed = true;
for (const file of toCheck) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(`Syntax error in ${file}`);
    if (result.stderr) console.error(result.stderr.trim());
    allPassed = false;
  }
}

if (!allPassed) {
  process.exit(1);
}
console.log(`Syntax check passed (${toCheck.length} files).`);
