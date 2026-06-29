#!/usr/bin/env node
import { runHookMain } from './hook-main.mjs';
import { loadWorkflowContract, getPhaseMap } from '../lib/harness-contract.mjs';
import { getActiveRunId, readRunSnapshot } from '../lib/harness-run-store.mjs';
import { interfaceLanguage } from '../lib/harness-messages.mjs';
import { collectOutputHashes, verifyPhaseOutputs } from '../lib/harness-validation.mjs';
import { loadQaAiConfig } from '../lib/utils.mjs';

const cwd = process.cwd();

if (process.argv.includes('--self-test')) {
  console.log('stop-gate.mjs self-test passed. Version: 1.0.0');
  process.exit(0);
}

if (process.env.QA_FLOWKIT_DISABLE_HOOKS === '1') {
  process.exit(0);
}

async function main() {
  let inputData = '';
  try {
    const stdinRead = new Promise((resolve) => {
      let data = '';
      process.stdin.on('data', (chunk) => {
        data += chunk;
      });
      process.stdin.on('end', () => {
        resolve(data);
      });
      setTimeout(() => resolve(data), 2000);
    });
    inputData = await stdinRead;
  } catch {
    process.exit(0);
  }

  let event = {};
  if (inputData.trim()) {
    try {
      event = JSON.parse(inputData);
    } catch {
      // Ignore parse errors, exit 0 to not block
      process.exit(0);
    }
  }

  // Loop guard: if the stop hook already fired for this turn
  if (event.stop_hook_active) {
    process.exit(0);
  }

  const runId = await getActiveRunId(cwd);
  if (!runId) {
    process.exit(0);
  }

  let snapshot;
  try {
    snapshot = await readRunSnapshot(cwd, runId);
  } catch {
    process.exit(0);
  }

  if (snapshot.status === 'completed' || !snapshot.activePhaseId) {
    process.exit(0);
  }

  const contract = await loadWorkflowContract(cwd);
  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};
  const phaseDef = getPhaseMap(contract).get(snapshot.activePhaseId);
  if (!phaseDef) {
    process.exit(0);
  }

  const phaseState = snapshot.phases[snapshot.activePhaseId];
  if (!phaseState) {
    process.exit(0);
  }

  // Check if the current phase has produced all expected outputs
  const outputCheck = await verifyPhaseOutputs(cwd, config, phaseDef);
  if (outputCheck.ok) {
    // Collect current output hashes
    const currentOutputs = await collectOutputHashes(cwd, config, phaseDef.outputs || []);

    // Check if check has been recorded for the current hashes
    const isMatching =
      phaseState.status === 'completed' &&
      phaseState.outputs &&
      currentOutputs.length === phaseState.outputs.length &&
      currentOutputs.every((current) =>
        phaseState.outputs.some((saved) => saved.path === current.path && saved.sha256 === current.sha256)
      );

    if (!isMatching) {
      const lang = interfaceLanguage(config);
      if (lang === 'es') {
        process.stderr.write(
          `La fase activa "${phaseDef.name}" tiene todas sus salidas listas, pero no se ha registrado la validación para los archivos actuales. Por favor, ejecuta "npx qa-flowkit run check" antes de continuar.\n`
        );
      } else {
        process.stderr.write(
          `The active phase "${phaseDef.name}" has all its outputs ready, but validation has not been recorded for the current file hashes. Please run "npx qa-flowkit run check" before finishing.\n`
        );
      }
      process.exit(2);
    }
  }

  process.exit(0);
}

runHookMain(main, 'stop-gate.mjs');
