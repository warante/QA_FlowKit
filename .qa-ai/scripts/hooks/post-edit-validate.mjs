#!/usr/bin/env node
import path from 'node:path';
import { runHookMain } from './hook-main.mjs';
import { karateFeatureRoots, usesKarate } from '../lib/automation-framework.mjs';
import { usesMaestro, maestroFlowsPath } from '../lib/mobile-automation.mjs';
import { runSubprocessScript } from '../lib/subprocess-script.mjs';
import { ARTIFACT_PATHS, getConfigValue, loadQaAiConfig, resolveRepoPath, resolveTestManagementSyncPlanPath } from '../lib/utils.mjs';

const cwd = process.cwd();

if (process.argv.includes('--self-test')) {
  console.log('post-edit-validate.mjs self-test passed. Version: 1.0.0');
  process.exit(0);
}

if (process.env.QA_FLOWKIT_DISABLE_HOOKS === '1') {
  process.exit(0);
}

function extractPaths(obj) {
  const paths = new Set();
  function recurse(value) {
    if (!value) return;
    if (typeof value === 'object') {
      for (const key of Object.keys(value)) {
        const val = value[key];
        if (typeof val === 'string') {
          if (['file_path', 'filePath', 'path', 'TargetFile', 'absolutePath', 'AbsolutePath'].includes(key)) {
            paths.add(val);
          }
        } else {
          recurse(val);
        }
      }
    }
  }
  recurse(obj);
  return Array.from(paths);
}

async function main() {
  let inputData = '';
  try {
    // Read stdin with a timeout to avoid hanging if there is no input
    const stdinRead = new Promise((resolve) => {
      let data = '';
      process.stdin.on('data', (chunk) => {
        data += chunk;
      });
      process.stdin.on('end', () => {
        resolve(data);
      });
      // Fallback timeout for safety
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
  } else {
    process.exit(0);
  }

  const paths = extractPaths(event);
  if (paths.length === 0) {
    process.exit(0);
  }

  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};

  const featureRoot = getConfigValue(config, 'gherkin.featurePath', 'features');
  const featureRootPath = resolveRepoPath(cwd, featureRoot, { label: 'feature root' });

  const karateRoots = usesKarate(config) ? karateFeatureRoots(config) : [];
  const karateRootsPaths = karateRoots.map((root) => resolveRepoPath(cwd, root, { label: 'Karate root' }));

  const maestroRoot = usesMaestro(config) ? maestroFlowsPath(config) : '';
  const maestroRootPath = maestroRoot ? resolveRepoPath(cwd, maestroRoot, { label: 'Maestro flows root' }) : '';

  const matrixPath = resolveRepoPath(
    cwd,
    getConfigValue(config, 'traceability.matrixPath', ARTIFACT_PATHS.traceabilityMatrix),
    { label: 'matrix' }
  );
  const resolvedSyncPlan = await resolveTestManagementSyncPlanPath(cwd, config, { preferExisting: false });
  const syncPlanPath = resolvedSyncPlan.absPath;
  const legacySyncPlanPath = resolvedSyncPlan.legacyAbsPath;
  const systemPath = resolveRepoPath(
    cwd,
    getConfigValue(config, 'testDesign.systemPath', ARTIFACT_PATHS.testDesignSystem),
    { label: 'system path' }
  );
  const proposalPath = resolveRepoPath(
    cwd,
    getConfigValue(config, 'testDesign.proposalPath', ARTIFACT_PATHS.testDesignProposal),
    { label: 'proposal path' }
  );
  const gatePath = resolveRepoPath(cwd, getConfigValue(config, 'release.gatePath', ARTIFACT_PATHS.releaseGate), {
    label: 'gate path'
  });

  for (const rawPath of paths) {
    let resolved;
    try {
      resolved = resolveRepoPath(cwd, rawPath, { label: 'hook file' });
    } catch {
      // Non-repo or invalid path, skip
      continue;
    }

    const relPath = path.relative(cwd, resolved);
    let script = '';
    let args = [];

    if (resolved.startsWith(featureRootPath) && resolved.endsWith('.feature')) {
      script = '.qa-ai/scripts/validate-features.mjs';
      args = ['--file', relPath];
    } else if (karateRootsPaths.some((kr) => resolved.startsWith(kr)) && resolved.endsWith('.feature')) {
      script = '.qa-ai/scripts/validate-karate-features.mjs';
      args = ['--file', relPath];
    } else if (maestroRootPath && resolved.startsWith(maestroRootPath) && /\.ya?ml$/i.test(resolved)) {
      script = '.qa-ai/scripts/validate-maestro-flows.mjs';
      args = ['--file', relPath];
    } else if (resolved === matrixPath) {
      script = '.qa-ai/scripts/validate-traceability.mjs';
      args = ['--allow-missing'];
    } else if (resolved === syncPlanPath || (legacySyncPlanPath && resolved === legacySyncPlanPath)) {
      script = '.qa-ai/scripts/validate-sync-plan.mjs';
      args = ['--allow-missing'];
    } else if (resolved === systemPath || resolved === proposalPath) {
      script = '.qa-ai/scripts/validate-test-design.mjs';
      args = ['--allow-missing'];
    } else if (resolved === gatePath) {
      script = '.qa-ai/scripts/validate-release-gate.mjs';
      args = ['--allow-missing'];
    }

    if (script) {
      const result = runSubprocessScript(script, args, { cwd, timeout: 10000 });

      if (!result.ok) {
        if (result.stdout) process.stderr.write(result.stdout);
        if (result.stderr) process.stderr.write(result.stderr);
        process.exit(2);
      }
    }
  }

  process.exit(0);
}

runHookMain(main, 'post-edit-validate.mjs');
