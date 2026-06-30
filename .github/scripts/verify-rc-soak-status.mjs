#!/usr/bin/env node
import fs from 'node:fs/promises';
import { assert, isMain, readJson, repoRoot } from './lib/ci-helpers.mjs';
import path from 'node:path';

const ALLOWED_STATUS = new Set(['planned', 'in_progress', 'completed']);
const ALLOWED_STEP_STATUS = new Set(['pending', 'passed', 'failed']);
function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function wholeDaysBetween(startDate, endDate) {
  const startUtc = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const endUtc = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
  return Math.floor((endUtc - startUtc) / (24 * 60 * 60 * 1000));
}

export async function verifyRcSoakStatus({ root = repoRoot } = {}) {
  const errors = [];
  const soakPath = path.join(root, 'docs', 'qa-ai', 'rc-soak-status.v1.json');
  const openRiskPath = path.join(root, 'docs', 'qa-ai', 'open-risk-register.v1.json');
  const packagePath = path.join(root, 'package.json');
  const soakDocPath = path.join(root, 'docs', 'qa-ai', 'beta-to-rc-release.md');

  const soak = await readJson(soakPath);
  const risks = await readJson(openRiskPath);
  const packageJson = await readJson(packagePath);
  const soakDoc = await fs.readFile(soakDocPath, 'utf8');

  assert(soak.schemaVersion === 1, 'rc-soak-status schemaVersion must be 1', errors);
  assert(soak.task === 'TASK-081', 'rc-soak-status task must be TASK-081', errors);
  assert(ALLOWED_STATUS.has(soak.status), `invalid soak status: ${soak.status}`, errors);
  assert(soak.qaFlowKitVersion === packageJson.version, 'rc-soak-status version must match package.json', errors);
  assert(Number.isInteger(soak.soakWindowDays) && soak.soakWindowDays >= 14, 'soakWindowDays must be >= 14', errors);
  assert(Array.isArray(soak.clockRestartedAt), 'clockRestartedAt must be an array', errors);
  assert(
    Array.isArray(soak.contractChangingFixesDuringSoak),
    'contractChangingFixesDuringSoak must be an array',
    errors
  );
  assert(Array.isArray(soak.riskAcceptance?.openP0), 'riskAcceptance.openP0 must be an array', errors);
  assert(Array.isArray(soak.riskAcceptance?.openP1), 'riskAcceptance.openP1 must be an array', errors);

  const cleanInstallStatus = soak.checks?.cleanInstallReplayNearEnd?.status;
  const betaUpdateStatus = soak.checks?.betaUpdateReplayNearEnd?.status;
  assert(ALLOWED_STEP_STATUS.has(cleanInstallStatus), 'cleanInstallReplayNearEnd.status invalid', errors);
  assert(ALLOWED_STEP_STATUS.has(betaUpdateStatus), 'betaUpdateReplayNearEnd.status invalid', errors);

  const startDate = parseDate(soak.soakStartDate);
  const endDate = parseDate(soak.soakEndDate);
  if (soak.status !== 'planned') {
    assert(startDate, 'soakStartDate required when status is not planned', errors);
  }
  if (soak.status === 'completed') {
    assert(endDate, 'soakEndDate required when status is completed', errors);
    if (startDate && endDate) {
      const elapsedDays = wholeDaysBetween(startDate, endDate);
      assert(elapsedDays >= soak.soakWindowDays, `completed soak must run >= ${soak.soakWindowDays} days`, errors);
    }
    assert(soak.riskAcceptance.openP0.length === 0, 'completed soak cannot have open P0 items', errors);
    assert(soak.riskAcceptance.openP1.length === 0, 'completed soak cannot have open P1 items', errors);
    assert(cleanInstallStatus === 'passed', 'completed soak requires clean install replay passed', errors);
    assert(betaUpdateStatus === 'passed', 'completed soak requires beta update replay passed', errors);
  }

  const openP0 = (risks.risks || [])
    .filter((risk) => risk.severity === 'P0' && risk.status === 'open')
    .map((risk) => risk.id);
  const openP1 = (risks.risks || [])
    .filter((risk) => risk.severity === 'P1' && risk.status === 'open')
    .map((risk) => risk.id);
  assert(
    JSON.stringify(openP0) === JSON.stringify(soak.riskAcceptance.openP0),
    'rc-soak-status openP0 must match open-risk-register',
    errors
  );
  assert(
    JSON.stringify(openP1) === JSON.stringify(soak.riskAcceptance.openP1),
    'rc-soak-status openP1 must match open-risk-register',
    errors
  );

  assert(
    soakDoc.includes('rc-soak-status.v1.json'),
    'beta-to-rc-release.md must reference rc-soak-status.v1.json',
    errors
  );
  assert(soakDoc.includes('TASK-081'), 'beta-to-rc-release.md must include TASK-081 guidance', errors);

  return { ok: errors.length === 0, errors, status: soak.status };
}

async function main() {
  const result = await verifyRcSoakStatus();
  if (!result.ok) {
    console.error('RC soak status verification failed:\n');
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`RC soak status verification passed (status=${result.status}).`);
}

if (isMain(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
