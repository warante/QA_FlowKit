import path from 'node:path';
import { pathCheck } from './report.mjs';
import { validateWorkflowContract } from '../harness-contract.mjs';
import { doctorRequiredScripts } from '../inventory-manifest.mjs';
import {
  generatedAdapters,
  requiredAdapterTemplates,
  requiredAgents,
  requiredContracts,
  requiredPresets,
  requiredRules,
  requiredRulesIndex,
  requiredSpecialists,
  requiredTemplates,
  requiredWorkflows
} from './framework-manifest.mjs';

const requiredScripts = doctorRequiredScripts();

export function buildFrameworkChecks({ isFrameworkSourceRepo, strict }) {
  const configLevel = isFrameworkSourceRepo && !strict ? 'optional' : 'required';
  const genericInstructionsLevel = isFrameworkSourceRepo ? 'required' : 'optional';
  return [
    pathCheck(configLevel, 'config', 'qa-ai.config.yaml'),
    pathCheck('required', 'framework folder', '.qa-ai'),
    pathCheck('required', 'agents folder', '.qa-ai/agents'),
    pathCheck('required', 'rules folder', '.qa-ai/rules'),
    pathCheck('required', 'templates folder', '.qa-ai/templates'),
    pathCheck('required', 'contracts folder', '.qa-ai/contracts'),
    pathCheck('required', 'scripts folder', '.qa-ai/scripts'),
    pathCheck('required', 'presets folder', '.qa-ai/presets'),
    pathCheck('required', 'adapters folder', '.qa-ai/adapters'),
    pathCheck(genericInstructionsLevel, 'generic agent instructions', 'AGENTS.md'),
    ...requiredScripts.map((relPath) => pathCheck('required', `script ${path.basename(relPath)}`, relPath)),
    pathCheck('required', 'rules index', requiredRulesIndex),
    ...requiredRules.map((relPath) => pathCheck('required', `rule ${path.basename(relPath)}`, relPath)),
    ...requiredTemplates.map((relPath) => pathCheck('required', `template ${path.basename(relPath)}`, relPath)),
    ...requiredContracts.map((relPath) => pathCheck('required', `contract ${path.basename(relPath)}`, relPath)),
    ...requiredAgents.map((relPath) => pathCheck('required', `agent ${path.basename(relPath)}`, relPath)),
    ...requiredSpecialists.map((relPath) => pathCheck('required', `specialist ${path.basename(relPath)}`, relPath)),
    ...requiredPresets.map((relPath) => pathCheck('required', `preset ${path.basename(relPath)}`, relPath)),
    ...requiredWorkflows.map((relPath) => pathCheck('required', `workflow ${path.basename(relPath)}`, relPath)),
    ...requiredAdapterTemplates.map((relPath) =>
      pathCheck('required', `adapter template ${relPath.split('/').slice(2).join('/')}`, relPath)
    ),
    ...generatedAdapters.map(([label, relPath]) => pathCheck('optional', label, relPath))
  ];
}

export async function runWorkflowContractCheck(cwd) {
  let failed = 0;
  const contractResult = await validateWorkflowContract(cwd);
  if (contractResult.ok) {
    console.log('[PASS] workflow contract: .qa-ai/contracts/workflow.v1.json');
  } else {
    failed += 1;
    for (const error of contractResult.errors) {
      console.log(`[FAIL] workflow contract: ${error}`);
    }
  }
  return { failed };
}
