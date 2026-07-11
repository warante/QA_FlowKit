import { validateReleaseGateData } from './release-gate.mjs';
import { validateExecutionEvidence } from './execution-evidence-validate.mjs';
import {
  getConfigValue,
  listFilesRecursive,
  loadQaAiConfig,
  parseSimpleYaml,
  pathExists,
  readText,
  resolveRepoPath
} from './utils.mjs';

export async function validateReleaseGateFile(cwd, filePath, options = {}) {
  const gatePath = resolveRepoPath(cwd, filePath, { label: 'release gate' });
  if (!(await pathExists(gatePath))) {
    if (options.allowMissing) {
      return { ok: true, skipped: true, path: filePath };
    }
    return { ok: false, errors: [`Release gate not found at ${filePath}.`] };
  }

  let data;
  try {
    data = parseSimpleYaml(await readText(gatePath), filePath);
  } catch (error) {
    return { ok: false, errors: [`${filePath} is not valid YAML: ${error.message}`] };
  }

  const result = validateReleaseGateData(data, {
    source: filePath,
    allowPending: Boolean(options.allowPending)
  });
  const errors = [...result.errors];

  for (const relPath of result.evidence || []) {
    if (!relPath || relPath.includes('..')) {
      errors.push(`${filePath}: invalid evidence_paths entry "${relPath}".`);
      continue;
    }
    if (!(await pathExists(resolveRepoPath(cwd, relPath, { label: 'evidence path' })))) {
      errors.push(`${filePath}: evidence_paths entry not found: ${relPath}`);
    }
  }

  for (const relPath of result.evidenceExecution || []) {
    if (!relPath || relPath.includes('..')) {
      errors.push(`${filePath}: invalid evidence.execution entry "${relPath}".`);
      continue;
    }
    if (!(await pathExists(resolveRepoPath(cwd, relPath, { label: 'evidence execution path' })))) {
      errors.push(`${filePath}: evidence.execution entry not found: ${relPath}`);
    }
  }

  for (const relPath of result.evidenceEvals || []) {
    if (!relPath || relPath.includes('..')) {
      errors.push(`${filePath}: invalid evidence.evals entry "${relPath}".`);
      continue;
    }
    if (!(await pathExists(resolveRepoPath(cwd, relPath, { label: 'evidence eval path' })))) {
      errors.push(`${filePath}: evidence.evals entry not found: ${relPath}`);
    }
  }

  const configInfo = await loadQaAiConfig(cwd);
  const track = getConfigValue(configInfo.data, 'project.qaTrack', 'standard');
  const resultsPaths = getConfigValue(configInfo.data, 'execution.resultsPaths', []);
  const evalResultsPaths = getConfigValue(configInfo.data, 'execution.evalResultsPaths', []);
  const aiTestingEnabled = Boolean(getConfigValue(configInfo.data, 'aiTesting.enabled', false));
  if (result.decision === 'PASS') {
    const featureRoot = resolveRepoPath(
      cwd,
      getConfigValue(configInfo.data, 'gherkin.featurePath', '.qa-ai/features'),
      { label: 'feature root' }
    );
    if (await pathExists(featureRoot)) {
      const provisional = [];
      for (const featureFile of await listFilesRecursive(featureRoot, (candidate) => candidate.endsWith('.feature'))) {
        if (/RF-PENDING/i.test(await readText(featureFile))) provisional.push(featureFile);
      }
      if (provisional.length > 0) {
        errors.push(`${filePath}: PASS is forbidden while provisional RF feature drafts exist.`);
      }
    }
  }

  if (
    track === 'enterprise' &&
    result.decision === 'PASS' &&
    (resultsPaths.length > 0 || evalResultsPaths.length > 0 || aiTestingEnabled)
  ) {
    const evidenceRes = await validateExecutionEvidence(cwd, {
      allowMissing: Boolean(options.allowMissing)
    });
    if (!evidenceRes.ok) {
      errors.push(...evidenceRes.errors.map((e) => `${filePath}: execution evidence check failed: ${e}`));
    }
  }

  return {
    ok: errors.length === 0,
    skipped: false,
    path: filePath,
    decision: result.decision,
    errors
  };
}
