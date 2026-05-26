#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { normalizeQaTrack } from './lib/qa-next-steps.mjs';
import { getConfigValue, loadQaAiConfig, logHeader, parseArgs } from './lib/utils.mjs';

const args = parseArgs(process.argv);

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-target.mjs [options]

Options:
  --allow-empty       Pass --allow-empty to feature, traceability and sync-plan validators
  --allow-missing     Pass --allow-missing to traceability, sync-plan, active-specialist and release-gate validators
  --no-strict-doctor  Run doctor without --strict
  --skip-release-gate Skip release gate validation (enterprise track only)
  --skip-test-design   Skip test design markdown validation
  --allow-pending     Pass --allow-pending to release gate validator
  --help              Show this help

Runs the target-repository validation pipeline:
  doctor --strict
  validate-features
  validate-traceability
  validate-sync-plan
  validate-active-specialists
  validate-release-gate (enterprise track only)
  validate-test-design (standard and enterprise tracks)
`);
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

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  logHeader('QA AI target repository validator');
  const allowEmpty = Boolean(args['allow-empty']);
  const allowMissing = Boolean(args['allow-missing']);
  const strictDoctor = !args['no-strict-doctor'];
  const configInfo = await loadQaAiConfig(process.cwd());
  const track = normalizeQaTrack(getConfigValue(configInfo.data, 'project.qaTrack', 'standard'));

  const featureArgs = allowEmpty ? ['--allow-empty'] : [];
  const artifactArgs = [
    ...(allowEmpty ? ['--allow-empty'] : []),
    ...(allowMissing ? ['--allow-missing'] : [])
  ];
  const activeSpecialistArgs = allowMissing ? ['--allow-missing'] : [];

  const commands = [
    command('doctor', '.qa-ai/scripts/doctor.mjs', strictDoctor ? ['--strict'] : []),
    command('feature validation', '.qa-ai/scripts/validate-features.mjs', featureArgs),
    command('traceability validation', '.qa-ai/scripts/validate-traceability.mjs', artifactArgs),
    command('sync plan validation', '.qa-ai/scripts/validate-sync-plan.mjs', artifactArgs),
    command('active specialist validation', '.qa-ai/scripts/validate-active-specialists.mjs', activeSpecialistArgs)
  ];

  if (track === 'enterprise' && !args['skip-release-gate']) {
    const gateArgs = [
      ...(allowMissing ? ['--allow-missing'] : []),
      ...(args['allow-pending'] ? ['--allow-pending'] : [])
    ];
    commands.push(command('release gate validation', '.qa-ai/scripts/validate-release-gate.mjs', gateArgs));
  }

  if (['standard', 'enterprise'].includes(track) && !args['skip-test-design']) {
    const designArgs = allowMissing ? ['--allow-missing'] : [];
    commands.push(command('test design validation', '.qa-ai/scripts/validate-test-design.mjs', designArgs));
  }

  for (const commandSpec of commands) {
    const exitCode = run(commandSpec);
    if (exitCode !== 0) {
      console.log(`\nFAILED - ${commandSpec.label} failed.`);
      process.exit(exitCode);
    }
  }

  console.log('\nVALID - target repository validation passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
