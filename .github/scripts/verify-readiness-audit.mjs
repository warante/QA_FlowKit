#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const ALLOWED_DECISIONS = new Set(['PASS', 'PASS_WITH_ACTIONS', 'FAIL']);
const ALLOWED_EPIC_STATUS = new Set(['done', 'blocked', 'deferred', 'in_validation', 'planned', 'in_progress']);
const ALLOWED_E2E_STATUS = new Set(['automated', 'partial', 'planned', 'manual']);
const ALLOWED_SEVERITY = new Set(['P0', 'P1', 'P2', 'P3']);
const REQUIRED_EPICS = [13, 14, 15, 16, 17, 18];

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

export async function verifyReadinessAudit({ root = repoRoot } = {}) {
  const errors = [];
  const auditFile = path.join(root, 'docs', 'qa-ai', 'readiness-audit.v1.json');
  const riskFile = path.join(root, 'docs', 'qa-ai', 'open-risk-register.v1.json');
  const auditData = await readJson(auditFile);
  const riskData = await readJson(riskFile);
  const packageJson = await readJson(path.join(root, 'package.json'));

  assert(auditData.schemaVersion === 1, 'readiness audit schemaVersion must be 1', errors);
  assert(riskData.schemaVersion === 1, 'open risk register schemaVersion must be 1', errors);
  assert(auditData.qaFlowKitVersion === packageJson.version, 'readiness audit version must match package.json', errors);
  assert(
    riskData.qaFlowKitVersion === packageJson.version,
    'open risk register version must match package.json',
    errors
  );
  assert(ALLOWED_DECISIONS.has(auditData.decision), `invalid decision: ${auditData.decision}`, errors);
  assert(auditData.openRiskRegister === 'docs/qa-ai/open-risk-register.v1.json', 'openRiskRegister path drift', errors);

  const epicIds = new Set((auditData.epicGates || []).map((gate) => gate.epic));
  for (const epic of REQUIRED_EPICS) {
    assert(epicIds.has(epic), `missing epic gate review for Epic ${epic}`, errors);
  }
  for (const gate of auditData.epicGates || []) {
    assert(ALLOWED_EPIC_STATUS.has(gate.status), `Epic ${gate.epic}: invalid status ${gate.status}`, errors);
    assert(Array.isArray(gate.evidence) && gate.evidence.length > 0, `Epic ${gate.epic}: evidence required`, errors);
  }

  for (const scenario of auditData.e2eScenarios || []) {
    assert(/^E2E-/.test(scenario.id), `invalid E2E id: ${scenario.id}`, errors);
    assert(ALLOWED_E2E_STATUS.has(scenario.status), `${scenario.id}: invalid status`, errors);
    if (scenario.status === 'automated' && scenario.command?.startsWith('npm run ')) {
      const scriptName = scenario.command.replace('npm run ', '');
      assert(packageJson.scripts?.[scriptName], `${scenario.id}: missing npm script ${scriptName}`, errors);
    }
  }

  const openP0 = (riskData.risks || []).filter((risk) => risk.severity === 'P0' && risk.status === 'open');
  assert(openP0.length === 0, `open P0 risks block RC: ${openP0.map((r) => r.id).join(', ')}`, errors);

  for (const risk of riskData.risks || []) {
    assert(risk.id && risk.title && risk.owner, `risk missing fields: ${JSON.stringify(risk)}`, errors);
    assert(ALLOWED_SEVERITY.has(risk.severity), `invalid severity for ${risk.id}`, errors);
  }

  const runs = auditData.reviewChecklistRuns || [];
  assert(runs.length >= 2, 'require at least two REVIEW-CHECKLIST run slots', errors);
  const independent = runs.filter((run) =>
    String(run.reviewer || '')
      .toLowerCase()
      .includes('independent')
  );
  assert(independent.length >= 1, 'require independent reviewer slot', errors);

  const humanDoc = await fs.readFile(path.join(root, 'docs', 'qa-ai', 'readiness-audit.md'), 'utf8');
  assert(humanDoc.includes('readiness-audit.v1.json'), 'readiness-audit.md must link JSON record', errors);
  assert(humanDoc.includes('open-risk-register.v1.json'), 'readiness-audit.md must link risk register', errors);

  const openP1 = riskData.risks.filter((risk) => risk.severity === 'P1' && risk.status === 'open');
  return { ok: errors.length === 0, errors, decision: auditData.decision, openP1: openP1.length };
}

async function main() {
  const result = await verifyReadinessAudit();
  if (!result.ok) {
    console.error('Readiness audit verification failed:\n');
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`Readiness audit verification passed (decision=${result.decision}, open P1 risks=${result.openP1}).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
