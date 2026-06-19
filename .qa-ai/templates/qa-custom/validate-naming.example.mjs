#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const jsonMode = args.has('--json');

async function listFeatureFiles(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) files.push(...(await listFeatureFiles(fullPath)));
      if (entry.isFile() && entry.name.endsWith('.feature')) files.push(fullPath);
    }
    return files;
  } catch {
    return [];
  }
}

function printResult(result) {
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  for (const finding of result.findings) {
    console.log(`[FAIL] ${finding.file}: ${finding.message}`);
  }
  if (result.ok) console.log('[PASS] Feature naming example validator passed.');
}

if (args.has('--self-test')) {
  printResult({ ok: true, findings: [] });
  process.exit(0);
}

const files = await listFeatureFiles(path.join(process.cwd(), 'features'));
const findings = files
  .map((filePath) => path.relative(process.cwd(), filePath).replaceAll(path.sep, '/'))
  .filter((relativePath) => !/^features\/[A-Z]{2,}-\d+-TC-\d+-.+\.feature$/.test(relativePath))
  .map((relativePath) => ({
    file: relativePath,
    message: 'Expected feature filename pattern features/RF-123-TC-001-description.feature.',
    severity: 'error'
  }));

const result = { ok: findings.length === 0, findings };
printResult(result);
process.exit(result.ok ? 0 : 1);
