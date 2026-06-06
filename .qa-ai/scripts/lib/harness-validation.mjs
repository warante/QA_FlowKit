import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { usesKarate } from './automation-framework.mjs';
import { normalizeGateDecision } from './release-gate.mjs';
import { scanTextForSecrets } from './secret-patterns.mjs';
import { hashFile, parseSimpleYaml, pathExists, readText, resolveRepoPath } from './utils.mjs';
import { resolveContractPath, resolveOutputSpec } from './harness-contract.mjs';
import {
  listHarnessFeatureFiles,
  resolveConfigHarnessPath,
  resolveHarnessRelativePath,
  resolveOutputHarnessPaths
} from './harness-paths.mjs';
import { isValidatorAllowed, VALIDATOR_ALLOWLIST } from './harness-validator-allowlist.mjs';

export { VALIDATOR_ALLOWLIST, isValidatorAllowed };

export const DEFAULT_MAX_VALIDATION_ATTEMPTS = 2;

export function redactDiagnostics(text) {
  const findings = scanTextForSecrets(text);
  if (findings.length === 0) return String(text || '').slice(0, 4000);
  let redacted = String(text || '');
  for (const finding of findings) {
    if (finding.excerpt) {
      redacted = redacted.replaceAll(finding.excerpt, '[REDACTED]');
    }
  }
  return redacted.slice(0, 4000);
}

export function assertNoteHasNoSecrets(note) {
  if (!note) return;
  const findings = scanTextForSecrets(note, 'approval-note');
  if (findings.length > 0) {
    throw new Error('Approval note appears to contain secret-like values.');
  }
}

async function fileOutputExists(cwd, config, outputSpec) {
  const target = resolveOutputHarnessPaths(cwd, config, outputSpec);
  if (target.kind === 'featureFiles') {
    const files = await listHarnessFeatureFiles(cwd, config, outputSpec);
    return files.length > 0;
  }
  if (target.kind === 'releaseGate') {
    if (!target.absolute) return false;
    if (!(await pathExists(target.absolute))) return false;
    try {
      const data = parseSimpleYaml(await readText(target.absolute));
      const decision = normalizeGateDecision(data?.decision);
      return Boolean(decision) && decision !== 'PENDING';
    } catch {
      return false;
    }
  }
  if (!target.absolute) return false;
  return pathExists(target.absolute);
}

export async function outputExists(cwd, config, outputSpec) {
  const resolved = resolveOutputSpec(config, outputSpec);
  if (!resolved.path && resolved.kind !== 'featureFiles' && resolved.kind !== 'releaseGate') {
    return false;
  }
  return fileOutputExists(cwd, config, outputSpec);
}

export async function collectOutputHashes(cwd, config, outputs) {
  const hashes = [];
  for (const outputSpec of outputs) {
    const target = resolveOutputHarnessPaths(cwd, config, outputSpec);
    if (target.kind === 'featureFiles') {
      const files = await listHarnessFeatureFiles(cwd, config, outputSpec);
      for (const filePath of files) {
        hashes.push({
          path: path.relative(cwd, filePath).replaceAll('\\', '/'),
          sha256: await hashFile(filePath)
        });
      }
      continue;
    }

    if (target.absolute && (await pathExists(target.absolute))) {
      hashes.push({
        path: target.relative,
        sha256: await hashFile(target.absolute)
      });
    }
  }
  return hashes;
}

export async function ensurePhaseBaseline(cwd, config, phaseState, phaseDef) {
  if (phaseState.baselineCaptured) {
    return phaseState.baselineOutputs;
  }

  // Legacy runs activated before baselineCaptured existed already stored hashes at activation.
  if (
    (phaseState.status === 'active' || phaseState.status === 'completed') &&
    Array.isArray(phaseState.baselineOutputs)
  ) {
    phaseState.baselineCaptured = true;
    return phaseState.baselineOutputs;
  }

  phaseState.baselineOutputs = await captureOutputBaseline(cwd, config, phaseDef.outputs || []);
  phaseState.baselineCaptured = true;
  return phaseState.baselineOutputs;
}

export async function captureOutputBaseline(cwd, config, outputs) {
  const baseline = [];
  for (const outputSpec of outputs || []) {
    const target = resolveOutputHarnessPaths(cwd, config, outputSpec);
    if (target.kind === 'featureFiles') {
      const files = await listHarnessFeatureFiles(cwd, config, outputSpec);
      for (const filePath of files) {
        baseline.push({
          path: path.relative(cwd, filePath).replaceAll('\\', '/'),
          sha256: await hashFile(filePath),
          existedAtActivation: true
        });
      }
      continue;
    }

    if (target.absolute && (await pathExists(target.absolute))) {
      baseline.push({
        path: target.relative,
        sha256: await hashFile(target.absolute),
        existedAtActivation: true
      });
    }
  }
  return baseline;
}

export async function verifyPhaseOutputs(cwd, config, phaseDef) {
  const missing = [];
  for (const outputSpec of phaseDef.outputs || []) {
    const exists = await outputExists(cwd, config, outputSpec);
    if (!exists) {
      const resolved = resolveOutputSpec(config, outputSpec);
      if (resolved.path) {
        try {
          missing.push(resolveHarnessRelativePath(cwd, resolved.path, { label: 'phase output' }).relative);
        } catch {
          missing.push(resolved.path);
        }
      } else {
        missing.push(outputSpec.kind || 'output');
      }
    }
  }
  return { ok: missing.length === 0, missing };
}

export function resolveValidatorArgs(validatorId, config) {
  const entry = VALIDATOR_ALLOWLIST[validatorId];
  if (!entry) {
    throw new Error(`Validator not allowlisted: ${validatorId}`);
  }
  const args = [...entry.defaultArgs];
  if (validatorId === 'validate-karate-features' && !usesKarate(config)) {
    return null;
  }
  return args;
}

export function runValidator(cwd, validatorId, extraArgs = []) {
  const entry = VALIDATOR_ALLOWLIST[validatorId];
  if (!entry) {
    return { ok: false, exitCode: 1, diagnostics: `Validator not allowlisted: ${validatorId}` };
  }

  try {
    resolveRepoPath(cwd, entry.script, { label: 'validator script' });
  } catch (error) {
    return { ok: false, exitCode: 1, diagnostics: error.message };
  }

  const scriptPath = path.join(cwd, entry.script);
  const result = spawnSync(process.execPath, [scriptPath, ...extraArgs], {
    cwd,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 1024 * 1024
  });

  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  const exitCode = result.status ?? 1;
  const diagnostics = redactDiagnostics([stdout, stderr].filter(Boolean).join('\n').trim());

  return {
    ok: exitCode === 0,
    exitCode,
    diagnostics: diagnostics || (exitCode === 0 ? 'Validation passed.' : 'Validation failed.')
  };
}

export async function runPhaseValidators(cwd, config, phaseDef) {
  const results = [];
  let allOk = true;

  for (const validatorId of phaseDef.validators || []) {
    const extraArgs = resolveValidatorArgs(validatorId, config);
    if (extraArgs === null) continue;

    const result = runValidator(cwd, validatorId, extraArgs);
    results.push({ validatorId, ...result });
    if (!result.ok) allOk = false;
  }

  return { ok: allOk, results };
}

export async function inputExists(cwd, config, inputSpec) {
  const relative = resolveContractPath(config, inputSpec.path, inputSpec.fallback);
  if (!relative) return false;
  const target = resolveHarnessRelativePath(cwd, relative, { label: 'phase input' });
  if (!target.absolute) return false;
  return pathExists(target.absolute);
}

export async function verifyPhaseInputs(cwd, config, phaseDef) {
  const missing = [];
  for (const inputSpec of phaseDef.inputs || []) {
    if (!inputSpec.required) continue;
    const exists = await inputExists(cwd, config, inputSpec);
    if (!exists) {
      const relative = resolveContractPath(config, inputSpec.path, inputSpec.fallback) || inputSpec.path;
      try {
        const safe = resolveHarnessRelativePath(cwd, relative, { label: 'phase input' });
        missing.push(safe.relative);
      } catch {
        missing.push(relative);
      }
    }
  }
  return { ok: missing.length === 0, missing };
}

export function assertConfigPathsSafe(cwd, config, contract) {
  const errors = [];
  for (const phase of contract.phases || []) {
    for (const input of phase.inputs || []) {
      try {
        resolveConfigHarnessPath(cwd, config, input.path, input.fallback, `phase ${phase.id} input`);
      } catch (error) {
        errors.push(error.message);
      }
    }
    for (const output of phase.outputs || []) {
      try {
        resolveOutputHarnessPaths(cwd, config, output, `phase ${phase.id} output`);
      } catch (error) {
        errors.push(error.message);
      }
    }
  }
  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}
