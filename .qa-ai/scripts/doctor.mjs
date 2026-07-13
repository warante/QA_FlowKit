#!/usr/bin/env node
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadQaAiConfig, parseArgs, pathExists, logHeader } from './lib/utils.mjs';
import { buildFrameworkChecks, runWorkflowContractCheck } from './lib/doctor/framework-checks.mjs';
import {
  addArtifactChecks,
  addConfigArtifactChecks,
  checkLegacyArtifactAliases
} from './lib/doctor/artifact-checks.mjs';
import { addAutomationChecks } from './lib/doctor/automation-checks.mjs';
import { runConfigChecks } from './lib/doctor/config-checks.mjs';
import { runHooksChecks } from './lib/doctor/hooks-checks.mjs';
import { runLayoutChecks } from './lib/doctor/layout-checks.mjs';
import { printFinalResult, printNextSteps, runPathChecks } from './lib/doctor/report.mjs';
import { detectLegacyLayout } from './lib/project-paths.mjs';
import { redactValidatorDiagnostics } from './lib/secret-patterns.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);
const strict = Boolean(args.strict);
const guidanceValidatorScript = path.join(path.dirname(fileURLToPath(import.meta.url)), 'validate-agent-guidance.mjs');

function runGuidanceValidator(root) {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [guidanceValidatorScript, '--json'],
      { cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024, timeout: 30_000 },
      (error, stdout, stderr) => {
        if (error?.killed || error?.signal || error?.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
          reject(new Error('Guidance validator exceeded its execution limits.'));
          return;
        }
        if (error && typeof error.code !== 'number') {
          reject(new Error('Guidance validator could not be executed.'));
          return;
        }
        resolve({ code: typeof error?.code === 'number' ? error.code : 0, stdout, stderr });
      }
    );
  });
}

function categorizeGuidanceFindings(findings) {
  const codes = new Set(findings.map((finding) => finding.code));
  if (codes.has('AGENT_CONTRACT_MISSING')) return 'missing-contract';
  if (codes.has('AGENT_CONTRACT_PARSE')) return 'corrupt-contract';
  if (codes.has('AGENT_SCHEMA_MISSING')) return 'missing-schema';
  if (codes.has('AGENT_SCHEMA_PARSE')) return 'corrupt-schema';
  if (codes.has('AGENT_SCHEMA_INVALID')) return 'invalid-schema';
  if (codes.has('AGENT_CONTRACT_NO_GUIDANCE')) return 'missing-guidance';
  if (codes.has('AGENT_CONTRACT_VERSION')) return 'version-mismatch';
  if ([...codes].some((code) => code?.startsWith('AGENT_CONTRACT_CANONICAL_SOURCE_'))) {
    return 'canonical-source-invalid';
  }
  if (codes.has('AGENT_UNSAFE_PATH')) return 'invalid-paths';
  if ([...codes].some((code) => code?.startsWith('AGENT_PERMISSION_EXTERNAL_READ_'))) {
    return 'external-read-authority';
  }
  if (
    [
      'AGENT_CONTRACT_SCHEMA',
      'AGENT_CONTRACT_TYPE',
      'AGENT_CONTRACT_ENTRY_TYPE',
      'AGENT_CONTRACT_UNKNOWN_PROPERTY',
      'AGENT_CONTRACT_MISSING_PROPERTY',
      'AGENT_CONTRACT_MISSING_PATH'
    ].some((code) => codes.has(code))
  ) {
    return 'invalid-contract';
  }
  if (
    [...codes].some(
      (code) =>
        code === 'AGENT_PHASE_MAPPING_MISMATCH' ||
        code === 'AGENT_UNKNOWN_PHASE_ID' ||
        code === 'AGENT_CONTRACT_PHASE_REFERENCE_MISSING' ||
        code?.startsWith('AGENT_PERMISSION_') ||
        code?.startsWith('AGENT_APPROVAL_GATE_') ||
        code === 'AGENT_EXTERNAL_WRITE_UNGOVERNED'
    )
  ) {
    return 'contract-integrity';
  }
  if ([...codes].some((code) => code?.startsWith('AGENT_CONTRACT_'))) return 'invalid-contract';
  if (codes.has('AGENT_UNREGISTERED_FILE') || codes.has('AGENT_MISSING_FILE')) return 'inventory-invalid';
  return 'guidance-invalid';
}

function formatFindingDetail(findings, state) {
  const stateFinding = findings.find((finding) => categorizeGuidanceFindings([finding]) === state);
  const ordered = stateFinding ? [stateFinding, ...findings.filter((finding) => finding !== stateFinding)] : findings;
  return ordered
    .slice(0, 3)
    .map((finding) => {
      const location = finding.file ? ` ${finding.file}` : '';
      return `[${finding.code || 'AGENT_VALIDATION'}]${location}: ${finding.message || ''}`;
    })
    .join('; ');
}

async function runGuidanceIntegrityCheck({ isFrameworkSourceRepo, configInfo = {} }) {
  let result;
  try {
    result = await runGuidanceValidator(cwd);
  } catch (error) {
    const message = redactValidatorDiagnostics(error?.message || String(error));
    console.log(`[FAIL] guidance integrity: state=validator-unavailable, ${message}`);
    return { failed: 1, warned: 0, state: 'validator-unavailable' };
  }

  let payload;
  try {
    payload = JSON.parse(result.stdout);
  } catch {
    const detail = redactValidatorDiagnostics(result.stderr || result.stdout || 'validator returned invalid JSON');
    console.log(`[FAIL] guidance integrity: state=validator-output-invalid, ${detail}`);
    return { failed: 1, warned: 0, state: 'validator-output-invalid' };
  }

  const findings = Array.isArray(payload.findings) ? payload.findings : [];
  if (result.code !== 0 || payload.ok !== true) {
    const state = categorizeGuidanceFindings(findings);
    const detail = formatFindingDetail(findings, state) || 'Agent guidance validation failed without findings.';
    console.log(`[FAIL] guidance integrity: state=${state}, ${redactValidatorDiagnostics(detail)}`);
    return { failed: 1, warned: 0, state };
  }

  const legacyResult = await detectLegacyLayout(cwd, configInfo);
  const state = isFrameworkSourceRepo ? 'source-checkout' : legacyResult.legacy ? 'legacy-config' : 'valid';
  const entryCount = payload.summary?.registered || 0;
  console.log(`[PASS] guidance integrity: state=${state}, ${entryCount} entries registered`);
  return { failed: 0, warned: 0, state };
}

async function main() {
  logHeader(`QA FlowKit doctor${strict ? ' --strict' : ''}`);
  const configInfo = await loadQaAiConfig(cwd);
  const isFrameworkSourceRepo = await pathExists(path.join(cwd, 'docs/qa-ai/architecture.md'));
  const checks = buildFrameworkChecks({ isFrameworkSourceRepo, strict });

  if (configInfo.exists) {
    addArtifactChecks(checks, configInfo.data, strict, { sourceRepository: isFrameworkSourceRepo });
    addAutomationChecks(checks, configInfo.data, strict);
  }
  addConfigArtifactChecks(checks, configInfo.exists);

  const pathResults = await runPathChecks(cwd, checks);
  let failed = pathResults.failed;
  let warned = pathResults.warned;

  const legacyResults = await checkLegacyArtifactAliases(cwd);
  warned += legacyResults.warned;

  const hooksResults = await runHooksChecks(cwd);
  warned += hooksResults.warned;

  const contractResults = await runWorkflowContractCheck(cwd);
  failed += contractResults.failed;

  const guidanceResults = await runGuidanceIntegrityCheck({ isFrameworkSourceRepo, configInfo });
  failed += guidanceResults.failed;
  warned += guidanceResults.warned;

  const layoutResults = await runLayoutChecks(cwd, configInfo, { sourceRepository: isFrameworkSourceRepo });
  warned += layoutResults.warned;
  failed += layoutResults.failed;

  if (configInfo.exists) {
    const configResults = await runConfigChecks(cwd, configInfo);
    failed += configResults.failed;
    warned += configResults.warned;
  }

  const finalResult = printFinalResult(failed, warned);
  await printNextSteps(cwd, configInfo.exists);
  if (!finalResult.ok) process.exit(1);
}

main().catch((error) => {
  const message = redactValidatorDiagnostics(error?.message || String(error));
  console.log(`[FAIL] doctor internal error: ${message}`);
  process.exitCode = 1;
});
