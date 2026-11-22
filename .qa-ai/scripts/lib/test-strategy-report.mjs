import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getConfigValue, loadQaAiConfig, resolveRepoPath } from './utils.mjs';
import { buildCapabilityIndex, reviewStrategySections, summarizeTestObservations } from './test-strategy-analysis.mjs';

const exec = promisify(execFile);
const MAX_FILE_BYTES = 2 * 1024 * 1024;

async function readLocal(cwd, relative, { optional = false } = {}) {
  const target = resolveRepoPath(cwd, relative, { label: 'strategy input' });
  try {
    const stat = await fs.stat(target);
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES)
      throw new Error('Strategy input must be a regular file below 2 MiB.');
    return await fs.readFile(target, 'utf8');
  } catch (error) {
    if (optional && error.code === 'ENOENT') return null;
    throw error;
  }
}

async function featureFiles(cwd, relative) {
  const root = resolveRepoPath(cwd, relative, { label: 'feature root' });
  const files = [];
  let directories = 0;
  const walk = async (dir, depth = 0) => {
    if (++directories > 5000 || depth > 50) throw new Error('Strategy feature traversal limit exceeded.');
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT' && dir === root) return;
      throw error;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      resolveRepoPath(cwd, full, { label: 'feature input' });
      if (entry.isSymbolicLink()) throw new Error('Strategy analysis refuses linked feature entries.');
      if (entry.isDirectory()) await walk(full, depth + 1);
      else if (entry.isFile() && entry.name.endsWith('.feature')) {
        if (files.length >= 1000) throw new Error('Strategy analysis is limited to 1000 feature files.');
        const rel = path.relative(cwd, full).split(path.sep).join('/');
        files.push({ path: rel, content: await readLocal(cwd, rel) });
      }
    }
  };
  await walk(root);
  return files;
}

async function git(cwd, args) {
  // Do not let inherited Git overrides redirect reads to another worktree or run external helpers.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_')));
  const result = await exec('git', ['--no-pager', '--literal-pathspecs', '-c', 'core.fsmonitor=false', ...args], {
    cwd,
    env: { ...env, GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_NOSYSTEM: '1' },
    timeout: 5000,
    maxBuffer: 1024 * 1024,
    windowsHide: true
  });
  return result.stdout.trim();
}

export async function collectMaintenance(cwd, files) {
  const warnings = [];
  let shallow;
  try {
    const top = await git(cwd, ['rev-parse', '--show-toplevel']);
    if ((await fs.realpath(top)) !== (await fs.realpath(cwd))) throw new Error('not root');
    shallow = (await git(cwd, ['rev-parse', '--is-shallow-repository'])) === 'true';
    await git(cwd, ['rev-parse', '--verify', 'HEAD']);
  } catch {
    return { available: false, shallow: null, files: [], warnings: ['MAINTENANCE_HISTORY_UNAVAILABLE'] };
  }
  if (shallow) warnings.push('MAINTENANCE_SHALLOW_HISTORY');
  if (files.length > 100) warnings.push('MAINTENANCE_FILE_LIMIT');
  const rows = [];
  for (const file of files.slice(0, 100)) {
    resolveRepoPath(cwd, file.path, { label: 'maintenance input' });
    try {
      const tracked = await git(cwd, ['ls-files', '--error-unmatch', '--', file.path]);
      if (!tracked) throw new Error('untracked');
      const output = await git(cwd, ['log', '--follow', '--max-count=101', '--format=%H', '--', file.path]);
      const commits = output ? output.split(/\r?\n/).filter((line) => /^[a-f0-9]{40,64}$/i.test(line)) : [];
      rows.push({
        path: file.path,
        changeCommits: commits.length ? Math.min(commits.length, 100) : null,
        limited: commits.length > 100,
        classification: 'requires-review'
      });
      if (!commits.length) warnings.push('MAINTENANCE_FILE_HISTORY_UNAVAILABLE');
    } catch {
      rows.push({ path: file.path, changeCommits: null, limited: false, classification: 'requires-review' });
      warnings.push('MAINTENANCE_FILE_HISTORY_UNAVAILABLE');
    }
  }
  return { available: true, shallow, files: rows, warnings: [...new Set(warnings)] };
}

export async function collectTestStrategy(cwd, { maintenance = false, results = null } = {}) {
  cwd = path.resolve(cwd);
  const loaded = await loadQaAiConfig(cwd, { useCache: false });
  if (!loaded.exists || loaded.legacyConfigPresent)
    throw new Error('Strategy analysis requires modern .qa-ai/qa-ai.config.yaml; migrate legacy configuration first.');
  const config = loaded.data;
  const locations = {
    normalized: '.qa-ai/output/normalized-requirements.md',
    proposal: getConfigValue(config, 'testDesign.proposalPath', '.qa-ai/output/test-design-proposal.md'),
    system: getConfigValue(config, 'testDesign.systemPath', '.qa-ai/output/test-design-system.md'),
    feasibility: '.qa-ai/output/automation-feasibility-report.md'
  };
  const artifacts = {};
  const missingArtifacts = [];
  for (const [key, relative] of Object.entries(locations)) {
    const text = await readLocal(cwd, relative, { optional: true });
    artifacts[key] = text || '';
    if (text === null) missingArtifacts.push(key);
  }
  const files = await featureFiles(cwd, getConfigValue(config, 'gherkin.featurePath', '.qa-ai/features'));
  const navigation = buildCapabilityIndex(files, getConfigValue(config, 'gherkin.language', 'en'));
  const observations = results ? summarizeTestObservations(JSON.parse(await readLocal(cwd, results))) : [];
  const knownIds = new Set(navigation.capabilities.flatMap((c) => c.tests.flatMap((t) => t.testIds)));
  return {
    schemaVersion: 1,
    kind: 'advisory-test-strategy',
    readOnly: true,
    traceabilitySource: getConfigValue(config, 'traceability.matrixPath', '.qa-ai/output/traceability-matrix.md'),
    review: reviewStrategySections(artifacts),
    navigation,
    missingArtifacts,
    maintenance: maintenance ? await collectMaintenance(cwd, files) : null,
    observations,
    unmatchedObservationIds: observations.filter((r) => !knownIds.has(r.testId)).map((r) => r.testId),
    limitations: [
      'Structural presence is not semantic correctness or approved requirements.',
      'Exact Feature titles are navigation hints, not proof of equivalent behavior.',
      'Change counts and mixed outcomes require investigation; no automatic quarantine or productivity claim.',
      ...(!results ? ['Execution observations were not supplied.'] : [])
    ]
  };
}
