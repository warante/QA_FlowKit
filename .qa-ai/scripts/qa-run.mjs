#!/usr/bin/env node
import {
  approveGate,
  checkPhase,
  getRunStatus,
  nextPhase,
  resumeRun,
  retryPhase,
  setRfId,
  startRun
} from './lib/harness-controller.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';

const args = parseArgs(process.argv);
const subcommand = args._[0];
const json = Boolean(args.json);

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/qa-run.mjs <command> [options]

Commands:
  start [--rf RF-123]     Start a resumable QA workflow run
  status [--json]         Show active run status
  next [--json]           Activate or return the current phase packet
  check [--json]          Validate the active phase and advance when it passes
  retry [--json]          Reset validation attempts for a validation-blocked phase
  set-rf <id>             Record the official RF ID
  approve <gate> [--note "..."]  Record an approval gate
  resume <run-id> [--json]       Resume an incomplete run

Options:
  --json                  Machine-readable JSON output
  --help                  Show this help
`);
}

function printStatusHuman(report) {
  if (!report.active) {
    console.log('No active run.');
    if (report.runs?.length) {
      console.log(`Available runs: ${report.runs.join(', ')}`);
    }
    return;
  }

  console.log(`Run: ${report.runId}`);
  console.log(`Status: ${report.status}`);
  console.log(`Track: ${report.track}`);
  console.log(`RF ID: ${report.rfId || 'not set'}`);
  console.log(`Active phase: ${report.activePhaseId || 'none'}`);
  if (report.blockers?.length) {
    console.log('Blockers:');
    const help = report.blockerHelp?.length ? report.blockerHelp : report.blockers.map((blocker) => blocker.message);
    for (const message of help) {
      console.log(`  - ${message}`);
    }
  }
  console.log('');
  console.log('Phases:');
  for (const phase of report.phases) {
    const suffix = phase.skipReason ? ` (${phase.skipReason})` : '';
    console.log(`  [${phase.status}] ${phase.name}${suffix}`);
  }
}

function printPacketHuman(packet) {
  if (packet.phases) {
    printStatusHuman({ active: true, ...packet });
    return;
  }

  console.log(`Run: ${packet.runId}`);
  console.log(`Phase: ${packet.phase.name} (${packet.phase.id}) — ${packet.phase.status}`);
  if (packet.blockers?.length) {
    console.log('Blockers:');
    const help = packet.blockerHelp?.length ? packet.blockerHelp : packet.blockers.map((blocker) => blocker.message);
    for (const message of help) {
      console.log(`  - ${message}`);
    }
  }
  console.log(`Recommended: ${packet.recommendedCommand}`);
}

function failJson(error) {
  console.error(JSON.stringify({ ok: false, error: error.message || String(error) }, null, 2));
  process.exit(1);
}

async function main() {
  if (args.help || !subcommand) {
    printHelp();
    return;
  }

  const cwd = process.cwd();

  try {
    if (subcommand === 'start') {
      if (!json) logHeader('QA FlowKit run start');
      const snapshot = await startRun(cwd, { rfId: args.rf || null });
      if (json) {
        console.log(JSON.stringify(snapshot, null, 2));
      } else {
        console.log(`Started run: ${snapshot.runId}`);
        console.log(`Track: ${snapshot.track}`);
        if (snapshot.rfId) console.log(`RF ID: ${snapshot.rfId}`);
        console.log('Next: npx qa-flowkit run next');
      }
      return;
    }

    if (subcommand === 'status') {
      if (!json) logHeader('QA FlowKit run status');
      const report = await getRunStatus(cwd);
      if (json) console.log(JSON.stringify(report, null, 2));
      else printStatusHuman(report);
      return;
    }

    if (subcommand === 'next') {
      if (!json) logHeader('QA FlowKit run next');
      const packet = await nextPhase(cwd);
      if (json) console.log(JSON.stringify(packet, null, 2));
      else printPacketHuman(packet);
      return;
    }

    if (subcommand === 'check') {
      if (!json) logHeader('QA FlowKit run check');
      const result = await checkPhase(cwd);
      if (json) console.log(JSON.stringify(result, null, 2));
      else if (result.ok) {
        console.log(`Phase completed: ${result.phaseId}`);
        if (result.nextPhaseId) console.log(`Next phase: ${result.nextPhaseId}`);
        else console.log('Run workflow complete for actionable phases.');
      } else {
        console.log(`Check failed for phase: ${result.phaseId || 'unknown'}`);
        if (result.message) console.log(result.message);
        if (result.blockers?.length) {
          const help = result.blockerHelp?.length
            ? result.blockerHelp
            : result.blockers.map((blocker) => blocker.message);
          for (const message of help) console.log(`  - ${message}`);
        }
        if (result.blockerHelp?.length && !result.blockers?.length) {
          for (const message of result.blockerHelp) console.log(`  - ${message}`);
        }
        if (result.missingOutputs?.length) {
          console.log(`Missing outputs: ${result.missingOutputs.join(', ')}`);
        }
        if (result.blocked) console.log('Phase is now blocked after repeated failures.');
      }
      if (!result.ok) process.exit(1);
      return;
    }

    if (subcommand === 'retry') {
      if (!json) logHeader('QA FlowKit run retry');
      const result = await retryPhase(cwd);
      if (json) console.log(JSON.stringify(result, null, 2));
      else {
        console.log(`Retry accepted for phase: ${result.phaseId}`);
        console.log(result.message);
      }
      return;
    }

    if (subcommand === 'set-rf') {
      const rfId = args._[1] || args.rf;
      if (!json) logHeader('QA FlowKit run set-rf');
      const snapshot = await setRfId(cwd, rfId);
      if (json) console.log(JSON.stringify({ runId: snapshot.runId, rfId: snapshot.rfId }, null, 2));
      else console.log(`Recorded RF ID: ${snapshot.rfId}`);
      return;
    }

    if (subcommand === 'approve') {
      const gate = args._[1];
      if (!json) logHeader('QA FlowKit run approve');
      const snapshot = await approveGate(cwd, gate, { note: args.note || '' });
      if (json) console.log(JSON.stringify({ runId: snapshot.runId, approvals: snapshot.approvals }, null, 2));
      else console.log(`Recorded approval for gate: ${gate}`);
      return;
    }

    if (subcommand === 'resume') {
      const runId = args._[1];
      if (!json) logHeader('QA FlowKit run resume');
      const packet = await resumeRun(cwd, runId);
      if (json) console.log(JSON.stringify(packet, null, 2));
      else printPacketHuman(packet);
      return;
    }

    console.error(`Unknown run subcommand: ${subcommand}`);
    printHelp();
    process.exit(1);
  } catch (error) {
    if (json) failJson(error);
    throw error;
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
