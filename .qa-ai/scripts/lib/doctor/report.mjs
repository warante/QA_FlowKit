import { resolveRepoPath, pathExists } from '../utils.mjs';
import { inspectQaWorkflow } from '../qa-next-steps.mjs';

export function pathCheck(level, label, relPath) {
  return { level, label, paths: [relPath] };
}

export function anyPathCheck(level, label, relPaths) {
  return { level, label, paths: relPaths, any: true };
}

export function isConfiguredFramework(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return Boolean(normalized) && !['none', 'undecided', 'manual', 'n/a', 'na'].includes(normalized);
}

export function isEnabled(value) {
  return (
    value === true ||
    String(value || '')
      .trim()
      .toLowerCase() === 'true'
  );
}

export function checkLevel(strict, defaultLevel) {
  return strict && defaultLevel === 'optional' ? 'required' : defaultLevel;
}

export function isConfiguredTool(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return Boolean(normalized) && !['none', 'undecided', 'n/a', 'na'].includes(normalized);
}

export async function runCheck(cwd, check) {
  const resolvedPaths = [];
  for (const relPath of check.paths) {
    try {
      resolvedPaths.push(
        resolveRepoPath(cwd, relPath, {
          label: check.label,
          allowRoot: relPath === '.'
        })
      );
    } catch (error) {
      return { ...check, ok: false, reason: error.message };
    }
  }
  const results = await Promise.all(resolvedPaths.map((filePath) => pathExists(filePath)));
  const ok = check.any ? results.some(Boolean) : results.every(Boolean);
  return { ...check, ok };
}

export function describePaths(paths, any = false) {
  if (paths.length === 1) return paths[0];
  return paths.join(any ? ' or ' : ', ');
}

export async function runPathChecks(cwd, checks) {
  let failed = 0;
  let warned = 0;
  for (const check of checks) {
    const result = await runCheck(cwd, check);
    const target = describePaths(result.paths, result.any);
    if (result.ok) {
      console.log(`[PASS] ${check.label}: ${target}`);
    } else if (check.level === 'required') {
      failed += 1;
      console.log(`[FAIL] ${check.label}: ${target}${result.reason ? ` (${result.reason})` : ''}`);
    } else {
      warned += 1;
      console.log(`[WARN] ${check.label}: ${target}${result.reason ? ` (${result.reason})` : ''}`);
    }
  }
  return { failed, warned };
}

export function printFinalResult(failed, warned) {
  console.log('\nResult:');
  if (failed > 0) {
    console.log(`FAILED - ${failed} required checks failed, ${warned} warnings.`);
    process.exit(1);
  }
  if (warned > 0) {
    console.log(`VALID WITH WARNINGS - ${warned} optional checks missing.`);
  } else {
    console.log('VALID - all checks passed.');
  }
}

export async function printNextSteps(cwd, configExists) {
  if (!configExists) return;
  const report = await inspectQaWorkflow(cwd);
  const required = report.recommendations.filter((item) => item.priority === 'required');
  if (required.length > 0) {
    console.log('\nSuggested next step:');
    console.log(`  ${required[0].command}`);
    if (required[0].detail) console.log(`  ${required[0].detail}`);
  }
}
