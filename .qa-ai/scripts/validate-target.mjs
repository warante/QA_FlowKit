#!/usr/bin/env node
import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { karateSecretScanRoots, usesKarate } from './lib/automation-framework.mjs';
import { usesMaestro } from './lib/mobile-automation.mjs';
import { normalizeQaTrack } from './lib/qa-next-steps.mjs';
import { scanPathsForSecrets } from './lib/secret-patterns.mjs';
import {
  customValidatorsFromConfig,
  runCustomValidator,
  validateCustomValidatorConfig
} from './lib/custom-validators.mjs';
import {
  getConfigValue,
  listFilesRecursive,
  loadQaAiConfig,
  logHeader,
  parseArgs,
  pathExists,
  relativeTo,
  resolveRepoPath
} from './lib/utils.mjs';
import { validatorScriptPath } from './lib/validator-registry.mjs';

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

function validatorCommand(label, id, extraArgs = []) {
  return command(label, validatorScriptPath(id), extraArgs);
}

function command(label, script, extraArgs = []) {
  return { label, args: [script, ...extraArgs] };
}

function run(commandSpec) {
  console.log(`\n--- ${commandSpec.label} ---`);
  const result = spawnSync(process.execPath, commandSpec.args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'inherit',
    shell: false
  });
  return result.status ?? 1;
}

function runQuiet(commandSpec) {
  const result = spawnSync(process.execPath, commandSpec.args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
    shell: false
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
}

function customValidatorCommandSpecs(config) {
  return customValidatorsFromConfig(config).map((raw) => ({
    label: `custom validator ${raw.id}`,
    validator: raw
  }));
}

function parseTextFindings(label, output) {
  const findings = [];
  const lines = output.split(/\r?\n/);
  let currentFile = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for feature validation failure header or general file header
    const featMatch = line.match(/^\[FAIL\]\s+(.*?\.(?:feature|spec|flow|js|ts|mjs|cjs|yaml|yml|json|md))$/);
    if (featMatch) {
      currentFile = featMatch[1];
      continue;
    }

    if (line.startsWith('  - ') && currentFile) {
      findings.push({
        file: currentFile,
        message: line.slice(4).trim(),
        severity: 'error'
      });
      continue;
    }

    if (line.startsWith('  [WARN] ') && currentFile) {
      findings.push({
        file: currentFile,
        message: line.slice(9).trim(),
        severity: 'warning'
      });
      continue;
    }

    if (line.startsWith('[FAIL]') || line.startsWith('[WARN]')) {
      const severity = line.startsWith('[FAIL]') ? 'error' : 'warning';
      const content = line.slice(6).trim();

      // Match patterns like "file.md:12: message" or "file.md:12 message"
      const fileLineMatch = content.match(/^([^:\s]+):(\d+)(?::)?\s*(.*)$/);
      if (fileLineMatch && (fileLineMatch[1].includes('/') || fileLineMatch[1].includes('.'))) {
        findings.push({
          file: fileLineMatch[1],
          line: parseInt(fileLineMatch[2], 10),
          message: fileLineMatch[3],
          severity
        });
      } else {
        findings.push({
          message: content,
          severity
        });
      }
      continue;
    }

    if (line.startsWith('FAILED -') || line.startsWith('FAILED:')) {
      findings.push({
        message: line.trim(),
        severity: 'error'
      });
    }
  }

  return findings;
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = Boolean(args.json);
  if (!jsonMode) {
    logHeader('QA AI target repository validator');
  }

  const allowEmpty = Boolean(args['allow-empty']);
  const allowMissing = Boolean(args['allow-missing']);
  const strictDoctor = !args['no-strict-doctor'];
  const configInfo = await loadQaAiConfig(process.cwd());
  const track = normalizeQaTrack(getConfigValue(configInfo.data, 'project.qaTrack', 'standard'));
  const coverageMode = String(getConfigValue(configInfo.data, 'testDesign.coverage.mode', 'off')).toLowerCase();
  const qualityMode = String(getConfigValue(configInfo.data, 'testDesign.quality.mode', 'off')).toLowerCase();
  const syncMode = getConfigValue(configInfo.data, 'testManagementSync.mode', 'proposal-only');
  const externalIntakeEnabled = Boolean(getConfigValue(configInfo.data, 'sources.external.enabled', false));
  const hasHealingLog = await pathExists(
    resolveRepoPath(process.cwd(), 'qa-ai-output/healing-log.md', {
      label: 'healing log check',
      allowRoot: true
    })
  );
  const hasImpactAnalysis = await pathExists(
    resolveRepoPath(process.cwd(), 'qa-ai-output/test-impact-analysis.md', {
      label: 'test impact analysis check',
      allowRoot: true
    })
  );

  const featureArgs = allowEmpty ? ['--allow-empty'] : [];
  const artifactArgs = [...(allowEmpty ? ['--allow-empty'] : []), ...(allowMissing ? ['--allow-missing'] : [])];
  const activeSpecialistArgs = allowMissing ? ['--allow-missing'] : [];

  const commands = [
    command('doctor', '.qa-ai/scripts/doctor.mjs', strictDoctor ? ['--strict'] : []),
    validatorCommand('feature validation', 'validate-features', featureArgs),
    ...(coverageMode !== 'off' && !args['skip-test-coverage']
      ? [
          validatorCommand('test coverage validation', 'validate-test-coverage', [
            ...featureArgs,
            ...(allowMissing ? ['--allow-missing'] : [])
          ])
        ]
      : []),
    ...(track !== 'quick' && qualityMode !== 'off' && !args['skip-quality-report']
      ? [
          validatorCommand('Gherkin quality report validation', 'validate-quality-report', [
            ...featureArgs,
            ...(allowMissing ? ['--allow-missing'] : [])
          ])
        ]
      : []),
    ...(usesKarate(configInfo.data)
      ? [validatorCommand('karate feature validation', 'validate-karate-features', featureArgs)]
      : []),
    ...(usesMaestro(configInfo.data)
      ? [validatorCommand('Maestro flow validation', 'validate-maestro-flows', featureArgs)]
      : []),
    ...(track !== 'quick' ? [validatorCommand('sync plan validation', 'validate-sync-plan', artifactArgs)] : []),
    ...(track !== 'quick' && syncMode === 'governed'
      ? [
          validatorCommand('sync diff validation', 'validate-sync-diff', artifactArgs),
          validatorCommand('sync result validation', 'validate-sync-result', artifactArgs)
        ]
      : []),
    ...(externalIntakeEnabled
      ? [validatorCommand('external intake validation', 'validate-external-intake', artifactArgs)]
      : []),
    ...(getConfigValue(configInfo.data, 'execution.resultsPaths', []).length > 0 ||
    getConfigValue(configInfo.data, 'execution.evalResultsPaths', []).length > 0
      ? [validatorCommand('execution evidence validation', 'validate-execution-evidence', artifactArgs)]
      : []),
    ...(hasHealingLog ? [validatorCommand('governed healing validation', 'validate-healing-log', artifactArgs)] : []),
    ...(hasImpactAnalysis ? [validatorCommand('test impact validation', 'validate-test-impact', artifactArgs)] : []),
    validatorCommand('traceability validation', 'validate-traceability', artifactArgs),
    validatorCommand('untrusted content scan', 'validate-untrusted-content', [
      '--allow-missing',
      ...(args['strict-untrusted-content'] ? ['--strict'] : [])
    ]),
    validatorCommand('active specialist validation', 'validate-active-specialists', activeSpecialistArgs)
  ];

  if (track === 'enterprise' && !args['skip-release-gate']) {
    const gateArgs = [
      ...(allowMissing ? ['--allow-missing'] : []),
      ...(args['allow-pending'] ? ['--allow-pending'] : [])
    ];
    commands.push(validatorCommand('release gate validation', 'validate-release-gate', gateArgs));
  }

  if (['standard', 'enterprise'].includes(track) && !args['skip-test-design']) {
    const designArgs = allowMissing ? ['--allow-missing'] : [];
    commands.push(validatorCommand('test design validation', 'validate-test-design', designArgs));
  }

  const customCommands = customValidatorCommandSpecs(configInfo.data);

  if (jsonMode) {
    for (const cmd of commands) {
      if (
        cmd.label === 'untrusted content scan' ||
        cmd.label === 'test coverage validation' ||
        cmd.label === 'Gherkin quality report validation' ||
        cmd.label === 'sync diff validation' ||
        cmd.label === 'sync result validation' ||
        cmd.label === 'external intake validation' ||
        cmd.label === 'execution evidence validation' ||
        cmd.label === 'governed healing validation' ||
        cmd.label === 'test impact validation'
      ) {
        cmd.args.push('--json');
      }
    }
  }

  const scanSecrets = args['no-scan-secrets'] ? false : Boolean(args['scan-secrets'] || strictDoctor);

  if (jsonMode) {
    const validatorsResult = [];
    let allOk = true;

    for (const commandSpec of commands) {
      const result = runQuiet(commandSpec);
      const passed = result.status === 0;
      if (!passed) allOk = false;

      let findings;
      try {
        const parsed = JSON.parse(result.stdout);
        if (parsed && Array.isArray(parsed.findings)) {
          findings = parsed.findings.map((f) => ({
            file: f.file || f.path || '',
            line: typeof f.line === 'number' ? f.line : undefined,
            message: f.message || '',
            severity: f.severity || (result.status === 0 ? 'warning' : 'error')
          }));
        } else if (parsed && Array.isArray(parsed.errors)) {
          findings = parsed.errors.map((err) => ({
            message: typeof err === 'string' ? err : JSON.stringify(err),
            severity: 'error'
          }));
        } else {
          findings = parseTextFindings(commandSpec.label, `${result.stdout}\n${result.stderr}`);
        }
      } catch {
        findings = parseTextFindings(commandSpec.label, `${result.stdout}\n${result.stderr}`);
      }

      validatorsResult.push({
        name: commandSpec.label,
        status: passed ? 'passed' : 'failed',
        findings
      });
    }

    if (customCommands.length > 0) {
      const customConfigResult = await validateCustomValidatorConfig(process.cwd(), configInfo.data);
      if (!customConfigResult.ok) {
        allOk = false;
        validatorsResult.push({
          name: 'custom validator config',
          status: 'failed',
          findings: customConfigResult.errors.map((message) => ({ message, severity: 'error' }))
        });
      } else {
        for (const commandSpec of customCommands) {
          const result = runCustomValidator(process.cwd(), {
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
      const dirs = [
        'qa-ai-output',
        getConfigValue(configInfo.data, 'gherkin.featurePath', 'features'),
        getConfigValue(configInfo.data, 'automation.mobile.flowsPath', ''),
        ...(usesKarate(configInfo.data) ? karateSecretScanRoots(configInfo.data) : [])
      ].filter(Boolean);
      const files = [];
      for (const dir of dirs) {
        try {
          const dirPath = resolveRepoPath(process.cwd(), dir, { label: dir });
          if (await pathExists(dirPath)) {
            const listed = await listFilesRecursive(dirPath, (filePath) => {
              const lower = filePath.toLowerCase();
              return !lower.endsWith('.png') && !lower.endsWith('.jpg');
            });
            files.push(...listed);
          }
        } catch {
          // optional paths
        }
      }
      const findings = await scanPathsForSecrets(fs.readFile, files, process.cwd(), relativeTo);
      let secretScanPassed = true;
      let secretScanFindings = [];
      if (findings.length > 0) {
        secretScanPassed = false;
        allOk = false;
        secretScanFindings = findings.map((f) => ({
          file: f.label || '',
          line: f.line,
          message: `Potential secret (${f.pattern}): ${f.excerpt}`,
          severity: 'error'
        }));
      }

      validatorsResult.push({
        name: 'secret scan',
        status: secretScanPassed ? 'passed' : 'failed',
        findings: secretScanFindings
      });
    }

    console.log(
      JSON.stringify(
        {
          ok: allOk,
          validators: validatorsResult
        },
        null,
        2
      )
    );
    process.exit(allOk ? 0 : 1);
  } else {
    for (const commandSpec of commands) {
      const exitCode = run(commandSpec);
      if (exitCode !== 0) {
        console.log(`\nFAILED - ${commandSpec.label} failed.`);
        process.exit(exitCode);
      }
    }

    if (customCommands.length > 0) {
      console.log('\n--- custom validators ---');
      const customConfigResult = await validateCustomValidatorConfig(process.cwd(), configInfo.data);
      if (!customConfigResult.ok) {
        for (const error of customConfigResult.errors) console.log(`[FAIL] ${error}`);
        console.log('\nFAILED - custom validator config failed.');
        process.exit(1);
      }
      for (const commandSpec of customCommands) {
        const result = runCustomValidator(process.cwd(), {
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
      const dirs = [
        'qa-ai-output',
        getConfigValue(configInfo.data, 'gherkin.featurePath', 'features'),
        getConfigValue(configInfo.data, 'automation.mobile.flowsPath', ''),
        ...(usesKarate(configInfo.data) ? karateSecretScanRoots(configInfo.data) : [])
      ].filter(Boolean);
      const files = [];
      for (const dir of dirs) {
        try {
          const dirPath = resolveRepoPath(process.cwd(), dir, { label: dir });
          if (await pathExists(dirPath)) {
            const listed = await listFilesRecursive(dirPath, (filePath) => {
              const lower = filePath.toLowerCase();
              return !lower.endsWith('.png') && !lower.endsWith('.jpg');
            });
            files.push(...listed);
          }
        } catch {
          // optional paths
        }
      }
      const findings = await scanPathsForSecrets(fs.readFile, files, process.cwd(), relativeTo);
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
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
