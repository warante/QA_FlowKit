#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  jsonOutput,
  node,
  run,
  runNpm
} from './lib/ci-helpers.mjs';
import {
  exampleRootFromRepo,
  runPackedExampleValidation,
  runPackedInit,
  runPackedValidateTarget,
  wantsPackedExampleRuntime
} from './lib/packed-example-validation.mjs';

const exampleRoot = exampleRootFromRepo('examples', 'playwright-full');

function verifyResumableStandardRun(cli, targetRoot) {
  const started = jsonOutput(
    run(node, [cli, 'run', 'start', '--rf', 'RF-301', '--json'], { cwd: targetRoot }),
    'run start'
  );
  assert.equal(started.track, 'standard');

  const firstPacket = jsonOutput(run(node, [cli, 'run', 'next', '--json'], { cwd: targetRoot }), 'first run next');
  assert.equal(firstPacket.phase?.id, 'intake');

  const resumed = jsonOutput(
    run(node, [cli, 'run', 'resume', started.runId, '--json'], { cwd: targetRoot }),
    'run resume'
  );
  assert.equal(resumed.runId, started.runId);

  let packet = jsonOutput(run(node, [cli, 'run', 'next', '--json'], { cwd: targetRoot }), 'resumed run next');
  assert.equal(packet.phase?.id, firstPacket.phase?.id);

  for (let guard = 0; guard < 20; guard += 1) {
    const approvalBlocker = packet.blockers?.find((blocker) => blocker.type === 'approval');
    if (approvalBlocker) {
      assert.equal(approvalBlocker.gate, 'test-design');
      run(
        node,
        [cli, 'run', 'approve', approvalBlocker.gate, '--note', 'RF-301 public example design approved', '--json'],
        { cwd: targetRoot }
      );
      packet = jsonOutput(run(node, [cli, 'run', 'next', '--json'], { cwd: targetRoot }), 'approved run next');
    }

    assert.equal(packet.blockers?.length || 0, 0, `Unexpected blockers in ${packet.phase?.id}`);
    const checked = jsonOutput(run(node, [cli, 'run', 'check', '--json'], { cwd: targetRoot }), 'run check');
    assert.equal(checked.ok, true);
    if (checked.status === 'completed') {
      const status = jsonOutput(run(node, [cli, 'run', 'status', '--json'], { cwd: targetRoot }), 'run status');
      assert.equal(status.status, 'completed');
      return;
    }
    packet = jsonOutput(run(node, [cli, 'run', 'next', '--json'], { cwd: targetRoot }), 'run next');
  }

  throw new Error('Standard harness run did not complete within 20 phases.');
}

async function main() {
  await runPackedExampleValidation({
    tempPrefix: 'qa-flowkit-playwright-example-',
    exampleRoot,
    cliInstall: 'separate',
    structuralMessage:
      'Playwright public example passed packed install, resumable standard run and strict validation.',
    runtimeMessage:
      'Playwright public example passed packed install, resumable standard run, strict validation and UI/API execution.',
    validate: async ({ cli, targetRoot, npmCache }) => {
      runPackedInit(cli, targetRoot, 'playwright-full');
      runPackedValidateTarget(cli, targetRoot);
      verifyResumableStandardRun(cli, targetRoot);

      if (wantsPackedExampleRuntime()) {
        runNpm(['ci', '--ignore-scripts'], {
          cwd: targetRoot,
          env: { npm_config_cache: npmCache }
        });
        runNpm(['exec', '--', 'playwright', 'install', '--with-deps', 'chromium'], {
          cwd: targetRoot,
          env: { npm_config_cache: npmCache }
        });
        runNpm(['test'], { cwd: targetRoot, env: { npm_config_cache: npmCache } });
      }
    }
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
