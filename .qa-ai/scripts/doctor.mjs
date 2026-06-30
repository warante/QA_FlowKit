#!/usr/bin/env node
import path from 'node:path';
import { loadQaAiConfig, parseArgs, pathExists, logHeader } from './lib/utils.mjs';
import { buildFrameworkChecks, runWorkflowContractCheck } from './lib/doctor/framework-checks.mjs';
import {
  addArtifactChecks,
  addConfigArtifactChecks,
  checkLegacyArtifactAliases
} from './lib/doctor/artifact-checks.mjs';
import { addAutomationChecks } from './lib/doctor/automation-checks.mjs';
import { runConfigChecks } from './lib/doctor/config-checks.mjs';
import { runHooksChecks } from './lib/doctor/hooks-checks.mjs';
import { printFinalResult, printNextSteps, runPathChecks } from './lib/doctor/report.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);
const strict = Boolean(args.strict);

async function main() {
  logHeader(`QA FlowKit doctor${strict ? ' --strict' : ''}`);
  const configInfo = await loadQaAiConfig(cwd);
  const isFrameworkSourceRepo = await pathExists(path.join(cwd, 'docs/qa-ai/architecture.md'));
  const checks = buildFrameworkChecks({ isFrameworkSourceRepo, strict });

  if (configInfo.exists) {
    addArtifactChecks(checks, configInfo.data, strict);
    addAutomationChecks(checks, configInfo.data, strict);
  }
  addConfigArtifactChecks(checks, configInfo.exists);

  const pathResults = await runPathChecks(cwd, checks);
  let failed = pathResults.failed;
  let warned = pathResults.warned;

  const legacyResults = await checkLegacyArtifactAliases(cwd);
  warned += legacyResults.warned;

  const hooksResults = await runHooksChecks(cwd);
  warned += hooksResults.warned;

  const contractResults = await runWorkflowContractCheck(cwd);
  failed += contractResults.failed;

  if (configInfo.exists) {
    const configResults = await runConfigChecks(cwd, configInfo);
    failed += configResults.failed;
    warned += configResults.warned;
  }

  const finalResult = printFinalResult(failed, warned);
  await printNextSteps(cwd, configInfo.exists);
  if (!finalResult.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
