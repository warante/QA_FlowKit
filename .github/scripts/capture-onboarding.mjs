#!/usr/bin/env node
/** Capture real, isolated packed-package output for docs and a CLI storyboard. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { packAndInstall, cliPath, repoRoot, runCli, configureFramework, jsonOutput } from './lib/ci-helpers.mjs';
import { parseArgs, writeFileSafe } from '../../.qa-ai/scripts/lib/utils.mjs';
import { redactSecretsInText } from '../../.qa-ai/scripts/lib/secret-patterns.mjs';

export const displayArgs = (args) => args.map((arg) => (/\s/.test(arg) ? JSON.stringify(arg) : arg)).join(' ');

export function transcriptFromCapture(data) {
  return `# Terminal Transcripts

Generated from ${data.commands.length} real commands using a locally packed and installed package, not the npm registry.
Source base: \`${data.sourceCommit}\`; Node \`${data.node}\`.
The working tree may include onboarding documentation changes; the SHA is the source base, not a clean-tree attestation.
The displayed \`qa-flowkit\` aliases the installed Node entrypoint. No model or live agent was executed.
Temporary paths are redacted. JSON blocks contain selected actual fields; other output is verbatim.

Reproduce with \`node .github/scripts/capture-onboarding.mjs --output <new-capture.json>\`.
Default Playwright and manual examples use separate clean targets. After manual init, the helper copies the public
RF-101 requirement and reviewed artifacts from \`test/fixtures/quick-path/\` between \`run next\` and \`run check\`.
It records the fixture's test-design approval, deliberately copies the invalid Gherkin, then the corrected fixture,
then traceability and PR artifacts. This is fixture replay, not agent generation or independent review.
The corrected historical fixture passes with an advisory folder warning; a new manual case should normally use
\`.qa-ai/features/manual/\`. The permissive incomplete check is not the final strict gate.
Init here selects \`one-per-file\`; always inspect the effective config rather than assuming a preset literal.
The doctor's legacy config label is reproduced literally; only \`.qa-ai/qa-ai.config.yaml\` is runtime input.

${data.commands.map((item) => `## ${item.id}\n\n${item.selectedFields ? 'Selected actual fields.' : 'Captured stdout.'} Exit code: ${item.exitCode}.\n\n\`\`\`text\n$ ${item.command}\n${item.stdout}\n\`\`\`${item.stderr ? `\n\nCaptured stderr:\n\n\`\`\`text\n${item.stderr}\n\`\`\`` : ''}`).join('\n\n')}
`;
}

export async function captureOnboarding(output) {
  const parent = path.dirname(path.resolve(output));
  await fs.mkdir(parent, { recursive: true });
  const workspace = await fs.mkdtemp(path.join(parent, 'qa-onboarding-'));
  const target = path.join(workspace, 'target');
  const commands = [];
  function record(id, command, result, select) {
    const text = select ? JSON.stringify(select(jsonOutput(result, id)), null, 2) : result.stdout.trim();
    const sanitize = (value) =>
      redactSecretsInText(
        value
          .replaceAll(target, '<target-repo>')
          .replaceAll(workspace, '<capture-workspace>')
          .replaceAll(repoRoot, '<source-repo>')
      );
    const item = {
      id,
      command,
      exitCode: result.status,
      selectedFields: Boolean(select),
      stdout: sanitize(text),
      stderr: sanitize(result.stderr.trim())
    };
    commands.push(item);
    return item;
  }
  const cli = (id, args, options = {}, select) =>
    record(id, `qa-flowkit ${displayArgs(args)}`, runCli(target, args, options), select);
  const outcome = ({ ok, phaseId, status, validation }) => ({
    ok,
    phaseId,
    status,
    ...(ok === false ? { validation } : {})
  });
  try {
    await packAndInstall({ packDir: path.join(workspace, 'pack'), installRoot: target, validateAllowlist: true });
    cli('install', ['init', '--no-adapters']);
    record(
      'default-init',
      'node .qa-ai/scripts/init.mjs --preset playwright-full --no-adapters --no-interactive',
      configureFramework(target, ['--preset', 'playwright-full', '--no-adapters', '--no-interactive'])
    );
    // A separate fresh target is required for the manual preset, not a forced migration of the first example.
    const manual = path.join(workspace, 'manual');
    await fs.mkdir(manual);
    const defaultCommands = [...commands];
    commands.length = 0;
    const installedCli = cliPath(target);
    const run = (args, options = {}) => {
      const result = spawnSync(process.execPath, [installedCli, ...args], {
        cwd: manual,
        encoding: 'utf8',
        timeout: 60000
      });
      assert.equal(result.status, options.expectFailure ? 1 : 0, result.stdout + result.stderr);
      return result;
    };
    const capture = (id, args, options = {}, select) =>
      record(id, `qa-flowkit ${displayArgs(args)}`, run(args, options), select);
    const fixture = async (source, destination) => {
      const file = path.join(manual, destination);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.copyFile(path.join(repoRoot, 'test/fixtures/quick-path', source), file);
    };
    capture('manual-install', ['init', '--no-adapters']);
    const initArgs = ['--preset', 'manual-only', '--qa-track', 'quick', '--adapters', 'generic', '--no-interactive'];
    const initialized = spawnSync(process.execPath, [path.join(manual, '.qa-ai/scripts/init.mjs'), ...initArgs], {
      cwd: manual,
      encoding: 'utf8',
      timeout: 60000
    });
    assert.equal(initialized.status, 0, initialized.stdout + initialized.stderr);
    record('manual-init', `node .qa-ai/scripts/init.mjs ${initArgs.join(' ')}`, initialized);
    capture('doctor', ['doctor']);
    capture(
      'incomplete',
      ['validate-target', '--allow-empty', '--allow-missing', '--no-strict-doctor', '--json'],
      {},
      ({ ok, validators }) => ({ ok, validators: validators.map(({ name, status }) => ({ name, status })) })
    );
    await fixture('requirements/RF-101-login.md', 'requirements/RF-101-login.md');
    capture('start', ['run', 'start', '--rf', 'RF-101', '--json'], {}, ({ track, status, rfId }) => ({
      track,
      status,
      rfId
    }));
    for (const [phase, source, destination] of [
      ['intake', 'expected/qa-ai-output/requirement-analysis.md', '.qa-ai/output/requirement-analysis.md'],
      ['normalize', 'expected/qa-ai-output/normalized-requirements.md', '.qa-ai/output/normalized-requirements.md']
    ]) {
      const next = jsonOutput(run(['run', 'next', '--json']), phase);
      assert.equal(next.phase.id, phase);
      await fixture(source, destination);
      capture(phase, ['run', 'check', '--json'], {}, outcome);
    }
    capture(
      'approve',
      ['run', 'approve', 'test-design', '--note', 'RF-101 quick-path design approved', '--json'],
      {},
      ({ approvals }) => {
        const approval = approvals.find(({ gate }) => gate === 'test-design');
        assert.equal(approval?.decision, 'approved');
        return { approvals: [{ gate: approval.gate, decision: approval.decision }] };
      }
    );
    assert.equal(jsonOutput(run(['run', 'next', '--json']), 'gherkin').phase.id, 'gherkin');
    await fixture('invalid/RF-101-TC-001-login.feature', '.qa-ai/features/functional/RF-101-TC-001-login.feature');
    const invalid = capture('invalid', ['run', 'check', '--json'], { expectFailure: true }, outcome);
    assert.match(invalid.stdout, /manual/);
    await fixture(
      'expected/features/functional/RF-101-TC-001-login.feature',
      '.qa-ai/features/functional/RF-101-TC-001-login.feature'
    );
    capture('corrected', ['run', 'check', '--json'], {}, outcome);
    capture('feature', ['validate-features']);
    for (const phase of ['traceability', 'pr']) {
      assert.equal(jsonOutput(run(['run', 'next', '--json']), phase).phase.id, phase);
      await fixture(
        `expected/qa-ai-output/${phase === 'pr' ? 'pr-summary' : 'traceability-matrix'}.md`,
        `.qa-ai/output/${phase === 'pr' ? 'pr-summary' : 'traceability-matrix'}.md`
      );
      capture(phase, ['run', 'check', '--json'], {}, outcome);
    }
    capture('completed', ['run', 'status', '--json'], {}, ({ rfId, status, phases }) => {
      assert.equal(status, 'completed');
      return { rfId, status, phases: phases.map(({ id, status }) => ({ id, status })) };
    });
    capture('target', ['validate-target', '--json'], {}, ({ ok, validators }) => ({
      ok,
      validators: validators.map(({ name, status }) => ({ name, status }))
    }));
    const bootstrap = spawnSync(
      process.execPath,
      [path.join(manual, '.qa-ai/scripts/bootstrap-agent-adapters.mjs'), '--agents', 'claude,opencode'],
      { cwd: manual, encoding: 'utf8', timeout: 60000 }
    );
    assert.equal(bootstrap.status, 0, bootstrap.stdout + bootstrap.stderr);
    record('bootstrap', 'node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode', bootstrap);
    const commit = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8', timeout: 10000 });
    const data = {
      schemaVersion: 1,
      sourceCommit: commit.stdout.trim(),
      node: process.version,
      packageVersion: JSON.parse(await fs.readFile(path.join(repoRoot, 'package.json'), 'utf8')).version,
      execution:
        'local packed package; qa-flowkit is an alias for the installed Node entrypoint; no registry download, agent or model session',
      redaction: 'temporary paths redacted; JSON excerpts contain selected actual fields only',
      commands: [...defaultCommands, ...commands]
    };
    const written = await writeFileSafe(output, `${JSON.stringify(data, null, 2)}\n`);
    if (!written.written) throw new Error('Capture output already exists; choose a new path.');
    return data;
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = parseArgs(process.argv);
  if (args.help) console.log('Usage: node .github/scripts/capture-onboarding.mjs --output <new-json-file>');
  else if (typeof args.output !== 'string') {
    console.error('--output is required. Existing captures are never overwritten.');
    process.exitCode = 1;
  } else
    captureOnboarding(path.resolve(args.output))
      .then((data) => console.log(`Captured ${data.commands.length} verified commands.`))
      .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
      });
}
