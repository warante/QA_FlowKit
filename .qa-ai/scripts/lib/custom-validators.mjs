import { loadWorkflowContract } from './harness-contract.mjs';
import { VALIDATOR_ALLOWLIST } from './harness-validator-allowlist.mjs';
import { redactValidatorDiagnostics } from './secret-patterns.mjs';
import { runSubprocessScript } from './subprocess-script.mjs';
import { pathExists, relativeTo, resolveRepoPath } from './utils.mjs';

export const CUSTOM_VALIDATOR_ID_PATTERN = /^[a-z][a-z0-9-]{2,40}$/;

export function customValidatorsFromConfig(config = {}) {
  const custom = config?.validators?.custom;
  return Array.isArray(custom) ? custom : [];
}

export function normalizeCustomValidator(entry) {
  return {
    id: String(entry?.id || '').trim(),
    script: String(entry?.script || '').trim(),
    phases: Array.isArray(entry?.phases) ? entry.phases.map((phase) => String(phase || '').trim()).filter(Boolean) : [],
    blocking: entry?.blocking === undefined ? true : entry.blocking === true
  };
}

export async function validateCustomValidatorConfig(cwd, config = {}, { contract = null, checkSelfTest = false } = {}) {
  const validators = customValidatorsFromConfig(config);
  const workflow = contract || (await loadWorkflowContract(cwd));
  const phaseIds = new Set((workflow.phases || []).map((phase) => phase.id));
  const seen = new Set();
  const errors = [];

  for (let index = 0; index < validators.length; index += 1) {
    const raw = validators[index];
    const prefix = `validators.custom[${index}]`;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      errors.push(`${prefix} must be an object.`);
      continue;
    }

    const validator = normalizeCustomValidator(raw);
    if (!CUSTOM_VALIDATOR_ID_PATTERN.test(validator.id)) {
      errors.push(`${prefix}.id must match ${CUSTOM_VALIDATOR_ID_PATTERN}.`);
    } else if (VALIDATOR_ALLOWLIST[validator.id]) {
      errors.push(`${prefix}.id must not shadow built-in validator '${validator.id}'.`);
    } else if (seen.has(validator.id)) {
      errors.push(`${prefix}.id duplicates '${validator.id}'.`);
    }
    if (validator.id) seen.add(validator.id);

    if (!validator.script) {
      errors.push(`${prefix}.script is required.`);
    } else {
      try {
        const scriptPath = resolveRepoPath(cwd, validator.script, { label: `${prefix}.script` });
        if (!(await pathExists(scriptPath))) errors.push(`${prefix}.script not found: ${validator.script}.`);
        if (checkSelfTest && (await pathExists(scriptPath))) {
          const selfTest = runCustomValidatorProcess(cwd, scriptPath, ['--self-test', '--json']);
          if (!selfTest.ok) {
            errors.push(`${prefix}.script self-test failed: ${selfTest.diagnostics}`);
          } else if (!selfTest.json) {
            errors.push(`${prefix}.script self-test must print JSON when called with --self-test --json.`);
          }
        }
      } catch (error) {
        errors.push(error.message);
      }
    }

    if (validator.phases.length === 0) {
      errors.push(`${prefix}.phases must list at least one workflow phase.`);
    }
    for (const phaseId of validator.phases) {
      if (!phaseIds.has(phaseId)) errors.push(`${prefix}.phases includes unknown phase '${phaseId}'.`);
    }
    if (raw.blocking !== undefined && typeof raw.blocking !== 'boolean') {
      errors.push(`${prefix}.blocking must be a boolean when present.`);
    }
  }

  return { ok: errors.length === 0, errors, validators: validators.map(normalizeCustomValidator) };
}

export function customValidatorsForPhase(config = {}, phaseId) {
  return customValidatorsFromConfig(config)
    .map(normalizeCustomValidator)
    .filter((validator) => validator.phases.includes(phaseId));
}

function runCustomValidatorProcess(cwd, scriptPath, args) {
  const result = runSubprocessScript(scriptPath, args, { cwd, env: {}, maxBuffer: 1024 * 1024 });
  const stdout = result.stdout;
  const stderr = result.stderr;
  const exitCode = result.exitCode;
  let json = null;
  if (stdout.trim()) {
    try {
      json = JSON.parse(stdout);
    } catch {
      json = null;
    }
  }
  return {
    ok: exitCode === 0,
    exitCode,
    stdout,
    stderr,
    json,
    diagnostics: redactValidatorDiagnostics([stdout, stderr].filter(Boolean).join('\n').trim())
  };
}

export function runCustomValidator(cwd, validator, extraArgs = ['--json']) {
  let scriptPath;
  try {
    scriptPath = resolveRepoPath(cwd, validator.script, { label: `custom validator ${validator.id}` });
  } catch (error) {
    return {
      validatorId: validator.id,
      custom: true,
      blocking: validator.blocking,
      ok: false,
      exitCode: 1,
      findings: [{ message: error.message, severity: 'error' }],
      diagnostics: error.message
    };
  }

  const result = runCustomValidatorProcess(cwd, scriptPath, extraArgs);
  const parsedFindings = Array.isArray(result.json?.findings) ? result.json.findings : [];
  const findings = parsedFindings.map((finding) => ({
    file: finding.file || finding.path || '',
    line: typeof finding.line === 'number' ? finding.line : undefined,
    message: finding.message || '',
    severity: validator.blocking ? finding.severity || 'error' : 'warning'
  }));
  if (!result.ok && findings.length === 0) {
    findings.push({
      message: result.diagnostics || `Custom validator ${validator.id} failed.`,
      severity: validator.blocking ? 'error' : 'warning'
    });
  }

  return {
    validatorId: validator.id,
    name: validator.id,
    custom: true,
    script: relativeTo(cwd, scriptPath),
    blocking: validator.blocking,
    ok: result.ok,
    exitCode: result.exitCode,
    findings,
    diagnostics: result.diagnostics || (result.ok ? 'Validation passed.' : 'Validation failed.')
  };
}
