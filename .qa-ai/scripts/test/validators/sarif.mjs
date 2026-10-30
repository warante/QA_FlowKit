import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildSarifReport } from '../../lib/sarif-report.mjs';
import { repoRoot, withTempWorkspace, runValidatorScript } from './_shared.mjs';

function report(validators, cwd = repoRoot) {
  return buildSarifReport(cwd, { ok: !validators.some((validator) => validator.status === 'failed'), validators });
}

test('SARIF: empty successful report has no fabricated findings', () => {
  const output = report([{ name: 'features', status: 'passed', findings: [] }]);
  assert.equal(output.version, '2.1.0');
  assert.match(output.$schema, /sarif-2\.1\.0/);
  assert.deepEqual(output.runs[0].results, []);
  assert.deepEqual(output.runs[0].tool.driver.rules, []);
  assert.equal(output.runs[0].properties.validationPassed, true);
  assert.equal(output.runs[0].invocations[0].executionSuccessful, true);
});

test('SARIF: maps severities, escaped paths and precise lines with stable fingerprints', () => {
  const validators = [
    {
      name: 'feature validation',
      status: 'failed',
      findings: [
        { file: 'features\\Español #1.feature', line: 7, severity: 'error', message: 'Missing tag' },
        { severity: 'warning', message: 'Optional check' },
        { severity: 'info', message: 'Information' }
      ]
    }
  ];
  const output = report(validators);
  const run = output.runs[0];
  assert.equal(run.properties.validationPassed, false);
  assert.equal(run.invocations[0].executionSuccessful, true); // Findings are not tool crashes.
  assert.equal(run.tool.driver.rules.length, 1);
  assert.deepEqual(
    run.results.map((result) => result.level),
    ['error', 'warning', 'note']
  );
  assert.equal(run.results[0].ruleId, run.tool.driver.rules[0].id);
  assert.deepEqual(run.results[0].locations[0].physicalLocation, {
    artifactLocation: { uri: 'features/Espa%C3%B1ol%20%231.feature', uriBaseId: '%SRCROOT%' },
    region: { startLine: 7 }
  });
  validators[0].findings[0].line = 12;
  assert.deepEqual(report(validators).runs[0].results[0].partialFingerprints, run.results[0].partialFingerprints);
  assert.deepEqual(report(validators), report(validators));
});

test('SARIF: omits unsafe locations and invalid regions, never invents line one', () => {
  const files = [
    '../escape.md',
    '/etc/passwd',
    'C:\\private\\token.md',
    '\\\\server\\file.md',
    'https://example.com/file',
    'bad\npath.md'
  ];
  const findings = files.map((file) => ({ file, line: 1, severity: 'warning', message: 'Check' }));
  findings.push(
    ...[0, -1, 1.5, '5', undefined].map((line) => ({ file: 'safe.md', line, severity: 'warning', message: 'Check' }))
  );
  const results = report([{ name: 'paths', status: 'passed', findings }]).runs[0].results;
  assert.ok(results.slice(0, files.length).every((result) => !result.locations));
  assert.ok(results.slice(files.length).every((result) => !result.locations[0].physicalLocation.region));
});

test('SARIF: keeps advisory failures non-blocking and adds a diagnostic for silent failures', () => {
  const run = report([
    {
      name: 'custom advisory',
      status: 'warning',
      blocking: false,
      findings: [{ severity: 'error', message: 'Advisory' }]
    },
    { name: 'silent failure', status: 'failed', findings: [] }
  ]).runs[0];
  assert.deepEqual(
    run.results.map((result) => result.level),
    ['warning', 'error']
  );
  assert.match(run.results[1].message.text, /without an error diagnostic/);
});

test('SARIF: redacts credentials without embedding input properties or source snippets', () => {
  const token = `ghp_${'a'.repeat(36)}`;
  const output = report([
    {
      name: 'secret scan',
      status: 'failed',
      findings: [{ severity: 'error', message: `Potential secret: ${token}`, excerpt: token, source: token }]
    }
  ]);
  assert.ok(!JSON.stringify(output).includes(token));
  assert.match(output.runs[0].results[0].message.text, /REDACTED/i);
  assert.ok(
    !JSON.stringify(
      report([
        { name: token, status: 'passed', findings: [{ file: `${token}.md`, message: 'Check', severity: 'warning' }] }
      ])
    ).includes(token)
  );
});

test('SARIF CLI: preserves exit codes, emits pure SARIF and matches JSON findings', async () => {
  await withTempWorkspace('qa-sarif-', async (cwd) => {
    await fs.cp(path.join(repoRoot, '.qa-ai'), path.join(cwd, '.qa-ai'), {
      recursive: true,
      filter: (source) =>
        !['state', 'output', 'features', 'qa-ai.config.yaml', 'agents/specialists/active.md'].includes(
          path.relative(path.join(repoRoot, '.qa-ai'), source).replaceAll('\\', '/')
        )
    });
    // A clean checkout has no ignored project config or active-specialist cache.
    // Initialize this target explicitly rather than borrowing local dogfooding state.
    await assert.rejects(fs.access(path.join(cwd, '.qa-ai/qa-ai.config.yaml')), { code: 'ENOENT' });
    await assert.rejects(fs.access(path.join(cwd, '.qa-ai/agents/specialists/active.md')), { code: 'ENOENT' });
    const initialized = runValidatorScript('init.mjs', cwd, [
      '--preset',
      'manual-only',
      '--no-adapters',
      '--no-interactive'
    ]);
    assert.equal(initialized.exitCode, 0, initialized.stdout || initialized.stderr);
    await fs.mkdir(path.join(cwd, '.qa-ai/features'), { recursive: true });
    await fs.mkdir(path.join(cwd, '.qa-ai/output'), { recursive: true });
    const flags = ['--allow-empty', '--allow-missing', '--no-strict-doctor', '--no-scan-secrets'];
    const json = runValidatorScript('validate-target.mjs', cwd, [...flags, '--json']);
    const sarif = runValidatorScript('validate-target.mjs', cwd, [...flags, '--sarif']);
    assert.equal(json.exitCode, 0, json.stdout || json.stderr);
    assert.equal(sarif.exitCode, json.exitCode);
    assert.equal(sarif.stderr, '');
    assert.deepEqual(JSON.parse(sarif.stdout), buildSarifReport(cwd, JSON.parse(json.stdout)));
    // Missing doctor script must not become an empty successful SARIF report.
    await fs.rm(path.join(cwd, '.qa-ai/scripts/doctor.mjs'));
    const failed = runValidatorScript('validate-target.mjs', cwd, [...flags, '--sarif']);
    assert.equal(failed.exitCode, 1);
    assert.equal(JSON.parse(failed.stdout).runs[0].properties.validationPassed, false);
    assert.ok(JSON.parse(failed.stdout).runs[0].results.some((result) => result.level === 'error'));
    const conflict = runValidatorScript('validate-target.mjs', cwd, ['--json', '--sarif']);
    assert.equal(conflict.exitCode, 1);
    assert.equal(conflict.stdout, '');
    assert.match(conflict.stderr, /either --json or --sarif/);
    await fs.writeFile(path.join(cwd, '.qa-ai/qa-ai.config.yaml'), 'project:\n\tname: invalid yaml\n');
    const crashed = runValidatorScript('validate-target.mjs', cwd, ['--sarif']);
    assert.equal(crashed.exitCode, 1);
    assert.equal(JSON.parse(crashed.stdout).runs[0].invocations[0].executionSuccessful, false);
  });
});
