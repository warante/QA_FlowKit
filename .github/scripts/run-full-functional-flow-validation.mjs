#!/usr/bin/env node
/**
 * Full functional flow validation runner.
 * Validates artifacts in the full-functional-flow example
 * using QA FlowKit validators (in-process, no external services).
 * Cross-artifact validators (traceability, execution plan/summary, release gate)
 * are excluded because they require the full .qa-ai framework at a target repo root.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const exampleDir = path.join(repoRoot, 'examples', 'full-functional-flow');

const validators = [
  {
    label: 'risk analysis',
    script: 'validate-risk-analysis.mjs',
    args: [
      '--json',
      '--allow-missing',
      '--path',
      'examples/full-functional-flow/.qa-ai/output/risk-analysis.md',
      '--requirements',
      'examples/full-functional-flow/.qa-ai/output/normalized-requirements.md'
    ]
  },
  {
    label: 'test data plan',
    script: 'validate-test-data-plan.mjs',
    args: [
      '--json',
      '--allow-missing',
      '--path',
      'examples/full-functional-flow/.qa-ai/output/test-data-plan.md',
      '--matrix',
      'examples/full-functional-flow/.qa-ai/output/traceability-matrix.md'
    ]
  },
  {
    label: 'environment readiness',
    script: 'validate-environment-readiness.mjs',
    args: [
      '--json',
      '--allow-missing',
      '--path',
      'examples/full-functional-flow/.qa-ai/output/environment-readiness.md'
    ]
  },
  {
    label: 'test design',
    script: 'validate-test-design.mjs',
    args: [
      '--json',
      '--allow-missing',
      '--system',
      'examples/full-functional-flow/.qa-ai/output/test-design-system.md',
      '--proposal',
      'examples/full-functional-flow/.qa-ai/output/test-design-proposal.md'
    ]
  },
  {
    label: 'result analysis',
    script: 'validate-result-analysis.mjs',
    args: ['--json', '--allow-missing', '--path', 'examples/full-functional-flow/.qa-ai/output/result-analysis.md']
  },
  {
    label: 'defect triage',
    script: 'validate-defect-triage.mjs',
    args: ['--json', '--allow-missing', '--path', 'examples/full-functional-flow/.qa-ai/output/defect-triage.md']
  },
  {
    label: 'learning log',
    script: 'validate-learning-log.mjs',
    args: ['--json', '--allow-missing', '--path', 'examples/full-functional-flow/.qa-ai/output/learning-log.md']
  }
];

function runValidator(label, script, args) {
  const scriptPath = path.join(repoRoot, '.qa-ai', 'scripts', script);
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
    timeout: 30000
  });

  const stdout = result.stdout?.toString('utf-8')?.trim() || '';
  const stderr = result.stderr?.toString('utf-8')?.trim() || '';

  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    parsed = { ok: false, errors: [`Failed to parse JSON output from ${script}`], raw: stdout.slice(0, 200) };
  }

  return {
    label,
    script,
    ok: parsed.ok === true,
    status: result.status ?? 1,
    errors: parsed.errors || [],
    warnings: parsed.warnings || [],
    stderr
  };
}

function main() {
  console.log('=== Full Functional Flow Validation ===\n');
  console.log(`Example directory: ${exampleDir}`);
  console.log('Note: cross-artifact validators (traceability, execution summary, release gate)');
  console.log('      require a full target repository and are validated separately.\n');

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const { label, script, args } of validators) {
    process.stdout.write(`[....] ${label}... `);
    const result = runValidator(label, script, args);

    if (result.ok) {
      console.log('PASS');
      passed++;
    } else {
      console.log('FAIL');
      failed++;
      if (result.errors.length > 0) {
        for (const err of result.errors.slice(0, 5)) {
          console.log(`       ${err}`);
        }
        if (result.errors.length > 5) {
          console.log(`       ... and ${result.errors.length - 5} more errors`);
        }
      }
      if (result.stderr) {
        console.log(`       stderr: ${result.stderr.slice(0, 200)}`);
      }
    }
    results.push(result);
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed, ${results.length} total ===`);

  if (failed > 0) {
    console.log('\nFailed validators:');
    for (const r of results.filter((r) => !r.ok)) {
      console.log(`  - ${r.label} (${r.script})`);
    }
    process.exit(1);
  }

  console.log('\nFull functional flow validation complete. All artifacts valid.');
}

main();
