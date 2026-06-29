#!/usr/bin/env node
import fs from 'node:fs';

const file = '.github/workflows/ci.yml';
let yml = fs.readFileSync(file, 'utf8');
const insert = '      - uses: ./.github/actions/download-pack-artifact\n\n';
const jobs = [
  'karate-example:',
  'playwright-example:',
  'mobile-example:',
  'quick-path:',
  'manual-example:',
  'update-migration:',
  'clean-install:',
  'adversarial-failure:',
  'release-dry-run:',
  'stable-config-rehearsal:'
];

for (const job of jobs) {
  const idx = yml.indexOf(job);
  if (idx === -1) continue;
  const checkout = yml.indexOf('uses: actions/checkout@v7', idx);
  const afterCheckout = yml.indexOf('\n', checkout) + 1;
  const nextChunk = yml.slice(afterCheckout, afterCheckout + 120);
  if (nextChunk.includes('download-pack-artifact')) continue;
  yml = `${yml.slice(0, afterCheckout)}\n${insert}${yml.slice(afterCheckout)}`;
}

fs.writeFileSync(file, yml);
console.log('Patched ci.yml with download-pack-artifact steps.');
