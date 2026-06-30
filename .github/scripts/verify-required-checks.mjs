#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { assert, readJson, repoRoot } from './lib/ci-helpers.mjs';

const manifestPath = path.join(repoRoot, 'docs', 'qa-ai', 'required-checks.v1.json');
const packagePath = path.join(repoRoot, 'package.json');
const ciDocsPath = path.join(repoRoot, 'docs', 'qa-ai', 'ci-observability.md');

function findJobBlock(workflowText, jobId) {
  const escaped = jobId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\n  ${escaped}:\\n([\\s\\S]*?)(?=\\n  [A-Za-z0-9_-]+:\\n|\\n[^\\s]|$)`);
  const match = `\n${workflowText}`.match(pattern);
  return match?.[1] || '';
}

function collectChecks(manifest) {
  return [...(manifest.checks || []), ...(manifest.scheduledChecks || [])];
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

async function syncManifestMetadata(manifest, packageJson) {
  const updates = [];
  if (manifest.qaFlowKitVersion !== packageJson.version) {
    manifest.qaFlowKitVersion = packageJson.version;
    updates.push(`qaFlowKitVersion -> ${packageJson.version}`);
  }
  const today = todayUtc();
  if (manifest.generatedAt !== today) {
    manifest.generatedAt = today;
    updates.push(`generatedAt -> ${today}`);
  }
  if (updates.length > 0) {
    await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    console.log(`Auto-synced required-checks manifest: ${updates.join(', ')}`);
  }
  return manifest;
}

async function main() {
  const errors = [];
  let manifest = await readJson(manifestPath);
  const packageJson = await readJson(packagePath);
  manifest = await syncManifestMetadata(manifest, packageJson);
  const docs = await fs.readFile(ciDocsPath, 'utf8');

  assert(manifest.schemaVersion === 1, 'required checks manifest schemaVersion must be 1', errors);
  assert(
    manifest.qaFlowKitVersion === packageJson.version,
    'required checks manifest version must match package.json',
    errors
  );
  assert(/^\d{4}-\d{2}-\d{2}$/.test(manifest.generatedAt || ''), 'generatedAt must be YYYY-MM-DD', errors);
  assert(
    Array.isArray(manifest.requiredBranchProtectionContexts) &&
      manifest.requiredBranchProtectionContexts.includes('Validate starter'),
    'requiredBranchProtectionContexts must include Validate starter',
    errors
  );

  const workflowCache = new Map();
  for (const check of collectChecks(manifest)) {
    assert(
      check.workflow && check.jobId && check.name,
      `check is missing workflow/jobId/name: ${JSON.stringify(check)}`,
      errors
    );
    assert(
      Number.isInteger(check.timeoutMinutes) && check.timeoutMinutes > 0,
      `${check.jobId}: timeoutMinutes required`,
      errors
    );
    assert(check.owner, `${check.jobId}: owner required`, errors);
    assert(check.triage, `${check.jobId}: triage guidance required`, errors);
    assert(docs.includes(check.name), `${check.jobId}: docs are missing check name "${check.name}"`, errors);
    assert(docs.includes(check.owner), `${check.jobId}: docs are missing owner "${check.owner}"`, errors);

    if (!workflowCache.has(check.workflow)) {
      workflowCache.set(check.workflow, await fs.readFile(path.join(repoRoot, check.workflow), 'utf8'));
    }
    const workflowText = workflowCache.get(check.workflow);
    const jobBlock = findJobBlock(workflowText, check.jobId);
    assert(jobBlock, `${check.workflow}: missing job ${check.jobId}`, errors);
    if (!jobBlock) continue;

    assert(
      jobBlock.includes(`name: ${check.name}`) ||
        jobBlock.includes(`name: '${check.name}'`) ||
        jobBlock.includes(`name: "${check.name}"`),
      `${check.jobId}: job name drifted`,
      errors
    );
    assert(
      jobBlock.includes(`timeout-minutes: ${check.timeoutMinutes}`),
      `${check.jobId}: timeout-minutes drifted`,
      errors
    );
  }

  const ciText =
    workflowCache.get('.github/workflows/ci.yml') ||
    (await fs.readFile(path.join(repoRoot, '.github/workflows/ci.yml'), 'utf8'));
  assert(/concurrency:\s*\n\s+group:/.test(ciText), 'ci.yml must define workflow concurrency', errors);
  assert(/cancel-in-progress: true/.test(ciText), 'ci.yml concurrency must cancel in-progress duplicate runs', errors);

  if (errors.length > 0) {
    console.error('Required checks verification failed:\n');
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  console.log(
    `Required checks verification passed (${manifest.checks.length} required workflow checks, ${manifest.scheduledChecks.length} scheduled checks).`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
