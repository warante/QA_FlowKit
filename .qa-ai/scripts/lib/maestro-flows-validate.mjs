import fs from 'node:fs/promises';
import path from 'node:path';
import { validateMaestroFlowContent } from './maestro-validate.mjs';
import { maestroFlowsPath, usesMaestro } from './mobile-automation.mjs';
import { listFilesRecursive, loadQaAiConfig, pathExists, relativeTo, resolveRepoPath } from './utils.mjs';
import { resolveSingleCollectionFile } from './collection-validator.mjs';

/**
 * @returns {Promise<{ ok: boolean, errors: string[], warnings: string[], skipped?: boolean }>}
 */
export async function validateMaestroFlowsCollection(cwd, options = {}) {
  const configInfo = await loadQaAiConfig(cwd);
  if (!usesMaestro(configInfo.data)) {
    return { ok: true, errors: [], warnings: [], skipped: true };
  }

  const flowsRoot = options.path || maestroFlowsPath(configInfo.data);
  const flowsRootPath = resolveRepoPath(cwd, flowsRoot, { label: 'Maestro flows root' });
  if (!(await pathExists(flowsRootPath))) {
    if (options.allowEmpty) return { ok: true, errors: [], warnings: [] };
    return {
      ok: false,
      errors: [`Maestro flows root not found at ${flowsRoot}.`],
      warnings: []
    };
  }

  let files;
  if (options.file) {
    const single = await resolveSingleCollectionFile({
      cwd,
      fileArg: options.file,
      isUnderRoot: (resolved) => resolved.startsWith(flowsRootPath),
      notUnderRootError: `file "${options.file}" is not under Maestro flows root "${flowsRoot}".`,
      fileLabel: 'single Maestro flow file'
    });
    if (!single.ok) return { ok: false, errors: [single.error], warnings: [] };
    files = [single.file];
  } else {
    files = await listFilesRecursive(flowsRootPath, (filePath) => /\.ya?ml$/i.test(filePath));
  }

  if (files.length === 0) {
    if (options.allowEmpty) return { ok: true, errors: [], warnings: [] };
    return {
      ok: false,
      errors: [`No Maestro YAML flows found under ${flowsRoot}.`],
      warnings: []
    };
  }

  const errors = [];
  const warnings = [];
  for (const file of files) {
    const relativePath = relativeTo(cwd, file);
    const content = await fs.readFile(file, 'utf8');
    const result = validateMaestroFlowContent(content, relativePath);
    for (const warning of result.warnings) warnings.push(`${relativePath}: ${warning}`);
    for (const error of result.errors) errors.push(`${relativePath}: ${error}`);

    for (const referencedFlow of result.referencedFlows) {
      const target = resolveRepoPath(path.dirname(file), referencedFlow, { label: 'Maestro runFlow target' });
      if (!(await pathExists(target))) {
        errors.push(`${relativePath}: runFlow target does not exist: ${referencedFlow}`);
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
