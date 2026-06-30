import path from 'node:path';
import { validateMaestroFlowContent } from './maestro-validate.mjs';
import { maestroFlowsPath, usesMaestro } from './mobile-automation.mjs';
import { loadQaAiConfig, pathExists, relativeTo, resolveRepoPath } from './utils.mjs';
import { listCollectionFiles, validateCollection } from './collection-validator.mjs';

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

  const listed = await listCollectionFiles(cwd, {
    fileArg: options.file,
    rootPaths: [flowsRootPath],
    notUnderRootError: `file "${options.file}" is not under Maestro flows root "${flowsRoot}".`,
    fileLabel: 'single Maestro flow file',
    fileFilter: (filePath) => /\.ya?ml$/i.test(filePath)
  });
  if (!listed.ok) return { ok: false, errors: listed.errors, warnings: [] };

  return validateCollection({
    files: listed.files,
    allowEmpty: Boolean(options.allowEmpty),
    emptyErrors: [`No Maestro YAML flows found under ${flowsRoot}.`],
    validateFile: async (file, content) => {
      const relativePath = relativeTo(cwd, file);
      const result = validateMaestroFlowContent(content, relativePath);
      const errors = result.errors.map((error) => `${relativePath}: ${error}`);
      const warnings = result.warnings.map((warning) => `${relativePath}: ${warning}`);

      for (const referencedFlow of result.referencedFlows) {
        const target = resolveRepoPath(path.dirname(file), referencedFlow, { label: 'Maestro runFlow target' });
        if (!(await pathExists(target))) {
          errors.push(`${relativePath}: runFlow target does not exist: ${referencedFlow}`);
        }
      }

      return { errors, warnings };
    }
  });
}
