import { activeSpecialists, specialistCatalog } from './project-config.mjs';
import { loadQaAiConfig, pathExists, readText, relativeTo, resolveRepoPath } from './utils.mjs';

function listedSpecialistIds(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*-\s+`([^`]+)`:/)?.[1])
    .filter(Boolean)
    .sort();
}

/**
 * @returns {Promise<{ ok: boolean, errors: string[], warnings: string[] }>}
 */
export async function validateActiveSpecialists(cwd, options = {}) {
  const allowMissing = Boolean(options.allowMissing);
  const configInfo = await loadQaAiConfig(cwd);
  const activePath = resolveRepoPath(cwd, '.qa-ai/agents/specialists/active.md', {
    label: 'active specialists index'
  });

  if (!configInfo.exists) {
    if (allowMissing) return { ok: true, errors: [], warnings: [] };
    return { ok: false, errors: ['active specialist validation requires qa-ai.config.yaml.'], warnings: [] };
  }

  if (!(await pathExists(activePath))) {
    if (allowMissing) return { ok: true, errors: [], warnings: [] };
    return { ok: false, errors: ['run init or config import to generate active specialists.'], warnings: [] };
  }

  const expected = activeSpecialists(configInfo.data)
    .map(([id]) => id)
    .sort();
  const actual = listedSpecialistIds(await readText(activePath));
  const errors = [];

  for (const id of expected.filter((item) => !actual.includes(item))) {
    errors.push(`Missing active specialist: ${id}`);
  }
  for (const id of actual.filter((item) => !expected.includes(item))) {
    errors.push(`Stale active specialist: ${id}`);
  }
  for (const id of actual) {
    if (!(id in specialistCatalog)) {
      errors.push(`Unknown active specialist: ${id}`);
      continue;
    }
    const sourcePath = resolveRepoPath(cwd, `.qa-ai/agents/specialists/available/${id}.md`, {
      label: `specialist source "${id}"`
    });
    if (!(await pathExists(sourcePath))) {
      errors.push(`Missing specialist source for ${id}: ${relativeTo(cwd, sourcePath)}`);
    }
  }

  if ([...new Set(actual)].length !== actual.length) {
    errors.push('Duplicate specialist entries found in active.md.');
  }

  return { ok: errors.length === 0, errors, warnings: [] };
}
