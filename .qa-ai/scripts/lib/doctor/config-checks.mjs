import { validateConfigContent } from '../config-schema.mjs';
import { loadWorkflowContract } from '../harness-contract.mjs';
import { customValidatorsFromConfig, validateCustomValidatorConfig } from '../custom-validators.mjs';
import { findChangeMeKeys, inferredAcceptanceCriteriaConflicts, parseSimpleYaml } from '../utils.mjs';
import { collectLegacyConfigSignals, LEGACY_CONFIG_MIGRATION_DOC } from '../config-legacy.mjs';

export async function runConfigChecks(cwd, configInfo) {
  let failed = 0;
  let warned = 0;

  const schemaResult = await validateConfigContent(configInfo.content, cwd);
  if (schemaResult.ok) {
    console.log('[PASS] config schema: qa-ai.config.yaml');
  } else {
    failed += 1;
    for (const error of schemaResult.errors) {
      console.log(`[FAIL] config schema: ${error}`);
    }
  }

  const inferredConflicts = inferredAcceptanceCriteriaConflicts(configInfo.data);
  if (inferredConflicts.length === 0) {
    console.log('[PASS] inferred acceptance criteria policy: compatible');
  } else {
    failed += 1;
    for (const conflict of inferredConflicts) {
      console.log(`[FAIL] inferred acceptance criteria policy: conflicting values at ${conflict}`);
    }
  }

  const rawConfig = parseSimpleYaml(configInfo.content, configInfo.path);
  const legacyConfigKeys = collectLegacyConfigSignals(rawConfig);
  if (legacyConfigKeys.length === 0) {
    console.log('[PASS] config legacy keys: none detected');
  } else {
    warned += 1;
    console.log(
      `[WARN] config legacy keys: ${legacyConfigKeys.join(', ')}. Migrate to requirements.inferredAcceptanceCriteria; see ${LEGACY_CONFIG_MIGRATION_DOC}.`
    );
  }

  const changeMeKeys = findChangeMeKeys(configInfo.content);
  if (changeMeKeys.length === 0) {
    console.log('[PASS] config placeholders: no CHANGE_ME values');
  } else {
    failed += 1;
    console.log(`[FAIL] config placeholders: CHANGE_ME remains at ${changeMeKeys.join(', ')}`);
  }

  const customValidators = customValidatorsFromConfig(configInfo.data);
  if (customValidators.length === 0) {
    console.log('[PASS] custom validators: none configured');
  } else {
    const workflowContract = await loadWorkflowContract(cwd);
    const customResult = await validateCustomValidatorConfig(cwd, configInfo.data, {
      contract: workflowContract,
      checkSelfTest: true
    });
    if (customResult.ok) {
      console.log(`[PASS] custom validators: ${customValidators.length} configured and self-tested`);
    } else {
      failed += 1;
      for (const error of customResult.errors) {
        console.log(`[FAIL] custom validators: ${error}`);
      }
    }
  }

  return { failed, warned };
}
