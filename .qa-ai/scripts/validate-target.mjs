#!/usr/bin/env node
import { normalizeQaTrack } from './lib/qa-next-steps.mjs';
import { formatSecretScanFindingsForJson, scanTargetSecrets } from './lib/target-secret-scan.mjs';
import {
  customValidatorsFromConfig,
  runCustomValidator,
  validateCustomValidatorConfig
} from './lib/custom-validators.mjs';
import { getConfigValue, loadQaAiConfig, logHeader, parseArgs } from './lib/utils.mjs';
import {
  buildTargetValidatorSteps,
  runInProcessStep,
  runSubprocessStep,
  runSubprocessStepJson
} from './lib/validate-target-runner.mjs';

const args = parseArgs(process.argv);

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-target.mjs [options]

Options:
  --allow-empty       Pass --allow-empty to feature, traceability and sync-plan validators
  --allow-missing     Pass --allow-missing to traceability, sync-plan, active-specialist and release-gate validators
  --no-strict-doctor  Run doctor without --strict
  --skip-release-gate Skip release gate validation (enterprise track only)
  --skip-test-design   Skip test design markdown validation
  --skip-test-coverage Skip configured cross-feature coverage validation
  --skip-quality-report Skip configured semantic Gherkin quality validation
  --strict-untrusted-content Fail on prompt-injection-like requirement/context content
  --allow-pending     Pass --allow-pending to release gate validator
  --scan-secrets      Scan qa-ai-output and features for secret-like values
  --no-scan-secrets   Skip secret scan (overrides default on --strict doctor)
  --help              Show this help

Runs the target-repository validation pipeline:
  doctor --strict
  validate-features
  validate-traceability
  validate-sync-plan
  validate-active-specialists
  validate-release-gate (enterprise track only)
  validate-test-design (standard and enterprise tracks)
  validate-test-coverage (when testDesign.coverage.mode is not off)
  validate-quality-report (when testDesign.quality.mode is not off)
  validate-untrusted-content (warn mode by default)
`);
}

function customValidatorCommandSpecs(config) {
  return customValidatorsFromConfig(config).map((raw) => ({
    label: `custom validator ${raw.id}`,
    validator: raw
  }));
}

function printInProcessTextResult(step, runResult) {
  const { result } = runResult;
  if (result.skipped) {
    console.log(`[SKIP] ${step.label}`);
    return;
  }
  if (runResult.ok) {
    console.log(`[PASS] ${step.label}`);
    for (const warning of result.warnings || []) {
      console.log(`  [WARN] ${warning}`);
    }
    return;
  }
  console.log(`[FAIL] ${step.label}`);
  for (const error of result.errors || []) {
    console.log(`  - ${error}`);
  }
}

async function runStepText(cwd, step) {
  console.log(`\n--- ${step.label} ---`);
  if (step.kind === 'subprocess') {
    const result = runSubprocessStep(cwd, step);
    if (!result.ok) return false;
    return true;
  }
  const runResult = await runInProcessStep(cwd, step);
  printInProcessTextResult(step, runResult);
  return runResult.ok;
}

async function runStepJson(cwd, step) {
  if (step.kind === 'subprocess') {
    return runSubprocessStepJson(cwd, step);
  }

  const runResult = await runInProcessStep(cwd, step);
  return {
    name: step.label,
    status: runResult.ok ? 'passed' : 'failed',
    findings: runResult.findings
  };
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = Boolean(args.json);
  const cwd = process.cwd();
  if (!jsonMode) logHeader('QA AI target repository validator');

  const strictDoctor = !args['no-strict-doctor'];
  const configInfo = await loadQaAiConfig(cwd);
  const track = normalizeQaTrack(getConfigValue(configInfo.data, 'project.qaTrack', 'standard'));
  const coverageMode = String(getConfigValue(configInfo.data, 'testDesign.coverage.mode', 'off')).toLowerCase();
  const qualityMode = String(getConfigValue(configInfo.data, 'testDesign.quality.mode', 'off')).toLowerCase();
  const syncMode = getConfigValue(configInfo.data, 'testManagementSync.mode', 'proposal-only');
  const externalIntakeEnabled = Boolean(getConfigValue(configInfo.data, 'sources.external.enabled', false));

  const steps = await buildTargetValidatorSteps({
    cwd,
    config: configInfo.data,
    args,
    track,
    coverageMode,
    qualityMode,
    syncMode,
    externalIntakeEnabled
  });

  const customCommands = customValidatorCommandSpecs(configInfo.data);
  const scanSecrets = args['no-scan-secrets'] ? false : Boolean(args['scan-secrets'] || strictDoctor);

  if (jsonMode) {
    const validatorsResult = [];
    let allOk = true;

    for (const step of steps) {
      const entry = await runStepJson(cwd, step);
      if (entry.status !== 'passed') allOk = false;
      validatorsResult.push(entry);
    }

    if (customCommands.length > 0) {
      const customConfigResult = await validateCustomValidatorConfig(cwd, configInfo.data);
      if (!customConfigResult.ok) {
        allOk = false;
        validatorsResult.push({
          name: 'custom validator config',
          status: 'failed',
          findings: customConfigResult.errors.map((message) => ({ message, severity: 'error' }))
        });
      } else {
        for (const commandSpec of customCommands) {
          const result = runCustomValidator(cwd, {
            ...commandSpec.validator,
            blocking: commandSpec.validator.blocking === undefined ? true : commandSpec.validator.blocking === true
          });
          if (!result.ok && result.blocking) allOk = false;
          validatorsResult.push({
            name: commandSpec.label,
            status: result.ok ? 'passed' : result.blocking ? 'failed' : 'warning',
            findings: result.findings,
            custom: true,
            blocking: result.blocking
          });
        }
      }
    }

    if (scanSecrets) {
      const findings = await scanTargetSecrets(cwd, configInfo.data);
      const secretScanPassed = findings.length === 0;
      if (!secretScanPassed) allOk = false;
      validatorsResult.push({
        name: 'secret scan',
        status: secretScanPassed ? 'passed' : 'failed',
        findings: secretScanPassed ? [] : formatSecretScanFindingsForJson(findings)
      });
    }

    console.log(JSON.stringify({ ok: allOk, validators: validatorsResult }, null, 2));
    process.exit(allOk ? 0 : 1);
  }

  for (const step of steps) {
    const passed = await runStepText(cwd, step);
    if (!passed) {
      console.log(`\nFAILED - ${step.label} failed.`);
      process.exit(1);
    }
  }

  if (customCommands.length > 0) {
    console.log('\n--- custom validators ---');
    const customConfigResult = await validateCustomValidatorConfig(cwd, configInfo.data);
    if (!customConfigResult.ok) {
      for (const error of customConfigResult.errors) console.log(`[FAIL] ${error}`);
      console.log('\nFAILED - custom validator config failed.');
      process.exit(1);
    }
    for (const commandSpec of customCommands) {
      const result = runCustomValidator(cwd, {
        ...commandSpec.validator,
        blocking: commandSpec.validator.blocking === undefined ? true : commandSpec.validator.blocking === true
      });
      if (result.ok) {
        console.log(`[PASS] ${commandSpec.label}`);
        continue;
      }
      const marker = result.blocking ? 'FAIL' : 'WARN';
      console.log(`[${marker}] ${commandSpec.label}`);
      for (const finding of result.findings) {
        const location = finding.file ? `${finding.file}${finding.line ? `:${finding.line}` : ''}: ` : '';
        console.log(`  - ${location}${finding.message}`);
      }
      if (result.blocking) {
        console.log(`\nFAILED - ${commandSpec.label} failed.`);
        process.exit(result.exitCode || 1);
      }
    }
  }

  if (scanSecrets) {
    console.log('\n--- secret scan ---');
    const findings = await scanTargetSecrets(cwd, configInfo.data);
    if (findings.length > 0) {
      for (const finding of findings) {
        console.log(`[FAIL] ${finding.label}:${finding.line} (${finding.pattern}) ${finding.excerpt}`);
      }
      console.log(`\nFAILED - ${findings.length} potential secret(s) in QA artifacts.`);
      process.exit(1);
    }
    console.log('[PASS] No secret-like values detected in qa-ai-output or features.');
  }

  console.log('\nVALID - target repository validation passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
