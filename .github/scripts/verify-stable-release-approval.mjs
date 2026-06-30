#!/usr/bin/env node
import fs from 'node:fs/promises';
import { assert, isMain, readJson, repoRoot } from './lib/ci-helpers.mjs';
import path from 'node:path';
import { verifyReleasePolicy } from './verify-release-policy.mjs';

const ALLOWED_STATUS = new Set(['pending', 'in_review', 'approved', 'blocked']);
const ALLOWED_DECISIONS = new Set(['GO', 'GO_WITH_ACCEPTED_RISKS', 'NO_GO']);
const ALLOWED_SIGN_OFF = new Set(['pending', 'approved', 'rejected']);
const APPROVED_SIGN_OFF_PATTERN = /^approved \d{4}-\d{2}-\d{2}$/;

function isValidSignOffValue(value) {
  return ALLOWED_SIGN_OFF.has(value) || APPROVED_SIGN_OFF_PATTERN.test(value);
}

function isApprovedSignOff(value) {
  return value === 'approved' || APPROVED_SIGN_OFF_PATTERN.test(value);
}
const ALLOWED_HUMAN_SETTING = new Set(['pending', 'confirmed', 'not_applicable']);
function openRiskIds(risks, severity) {
  return (risks.risks || [])
    .filter((risk) => risk.severity === severity && risk.status === 'open')
    .map((risk) => risk.id)
    .sort();
}

export async function verifyStableReleaseApproval({ root = repoRoot } = {}) {
  const errors = [];
  const approvalPath = path.join(root, 'docs', 'qa-ai', 'stable-release-approval.v1.json');
  const soakPath = path.join(root, 'docs', 'qa-ai', 'rc-soak-status.v1.json');
  const riskPath = path.join(root, 'docs', 'qa-ai', 'open-risk-register.v1.json');
  const packagePath = path.join(root, 'package.json');
  const releaseDocPath = path.join(root, 'docs', 'qa-ai', 'beta-to-rc-release.md');
  const approvalDocPath = path.join(root, 'docs', 'qa-ai', 'stable-release-approval.md');

  const approval = await readJson(approvalPath);
  const soak = await readJson(soakPath);
  const risks = await readJson(riskPath);
  const packageJson = await readJson(packagePath);
  const releaseDoc = await fs.readFile(releaseDocPath, 'utf8');
  const approvalDoc = await fs.readFile(approvalDocPath, 'utf8');

  assert(approval.schemaVersion === 1, 'stable-release-approval schemaVersion must be 1', errors);
  assert(approval.task === 'TASK-082', 'stable-release-approval task must be TASK-082', errors);
  assert(ALLOWED_STATUS.has(approval.status), `invalid approval status: ${approval.status}`, errors);
  assert(approval.qaFlowKitVersion === packageJson.version, 'approval version must match package.json', errors);
  assert(
    approval.prerequisites?.rcSoakRecord === 'docs/qa-ai/rc-soak-status.v1.json',
    'rcSoakRecord path drift',
    errors
  );
  assert(
    approval.prerequisites?.stableReleasePolicy === '.release-please-config.stable.json',
    'stableReleasePolicy path drift',
    errors
  );
  assert(
    approval.prerequisites?.openRiskRegister === 'docs/qa-ai/open-risk-register.v1.json',
    'openRiskRegister path drift',
    errors
  );

  const policy = await verifyReleasePolicy({ root });
  assert(policy.ok, `release policy must pass: ${policy.errors.join('; ')}`, errors);

  assert(Array.isArray(approval.riskAcceptance?.openP0), 'riskAcceptance.openP0 must be an array', errors);
  assert(Array.isArray(approval.riskAcceptance?.openP1), 'riskAcceptance.openP1 must be an array', errors);
  assert(
    Array.isArray(approval.riskAcceptance?.acceptedRisks),
    'riskAcceptance.acceptedRisks must be an array',
    errors
  );

  const openP0 = openRiskIds(risks, 'P0');
  const openP1 = openRiskIds(risks, 'P1');
  assert(
    JSON.stringify(openP0) === JSON.stringify([...(approval.riskAcceptance.openP0 || [])].sort()),
    'stable-release-approval openP0 must match open-risk-register',
    errors
  );
  assert(
    JSON.stringify(openP1) === JSON.stringify([...(approval.riskAcceptance.openP1 || [])].sort()),
    'stable-release-approval openP1 must match open-risk-register',
    errors
  );

  for (const [role, value] of Object.entries(approval.signOffs || {})) {
    assert(isValidSignOffValue(value), `signOff ${role} has invalid value: ${value}`, errors);
  }

  for (const [setting, value] of Object.entries(approval.humanSettings || {})) {
    assert(ALLOWED_HUMAN_SETTING.has(value), `humanSettings.${setting} invalid: ${value}`, errors);
  }

  if (approval.status === 'approved') {
    assert(
      approval.decision && ALLOWED_DECISIONS.has(approval.decision),
      'approved record requires valid decision',
      errors
    );
    assert(approval.decision !== 'NO_GO', 'approved status cannot use NO_GO decision', errors);
    assert(approval.epic20Unblocked === true, 'approved record must set epic20Unblocked true', errors);
    assert(
      approval.stablePolicyMergeApproved === true,
      'approved record must set stablePolicyMergeApproved true',
      errors
    );
    assert(soak.status === 'completed', 'approved stable release requires completed RC soak', errors);
    assert(openP0.length === 0, 'approved stable release cannot have open P0 risks', errors);
    assert(openP1.length === 0, 'approved stable release cannot have open P1 risks', errors);

    for (const [role, value] of Object.entries(approval.signOffs || {})) {
      assert(isApprovedSignOff(value), `approved record requires signOff ${role} approved`, errors);
    }

    for (const [setting, value] of Object.entries(approval.humanSettings || {})) {
      assert(
        value === 'confirmed' || value === 'not_applicable',
        `approved record requires ${setting} confirmed`,
        errors
      );
    }

    assert(
      approval.riskAcceptance.rcKnownIssuesDisposition,
      'approved record must document rc known-issues disposition',
      errors
    );
  }

  if (approval.status === 'blocked') {
    assert(approval.decision === 'NO_GO', 'blocked status requires NO_GO decision', errors);
    assert(approval.epic20Unblocked === false, 'blocked status must keep epic20Unblocked false', errors);
  }

  assert(
    releaseDoc.includes('stable-release-approval.v1.json'),
    'beta-to-rc-release.md must reference approval JSON',
    errors
  );
  assert(releaseDoc.includes('TASK-082'), 'beta-to-rc-release.md must include TASK-082 guidance', errors);
  assert(
    approvalDoc.includes('stable-release-approval.v1.json'),
    'stable-release-approval.md must link JSON record',
    errors
  );

  return { ok: errors.length === 0, errors, status: approval.status, epic20Unblocked: approval.epic20Unblocked };
}

async function main() {
  const result = await verifyStableReleaseApproval();
  if (!result.ok) {
    console.error('Stable release approval verification failed:\n');
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(
    `Stable release approval verification passed (status=${result.status}, epic20Unblocked=${result.epic20Unblocked}).`
  );
}

if (isMain(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
