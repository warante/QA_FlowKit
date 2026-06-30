import path from 'node:path';
import { ARTIFACT_PATHS, getConfigValue, LEGACY_ARTIFACT_ALIASES, pathExists } from '../utils.mjs';
import { FEATURE_SUBFOLDERS } from '../feature-layout.mjs';
import { normalizeQaTrack } from '../qa-next-steps.mjs';
import { getTestManagementMappingFile } from '../test-management-config.mjs';
import { checkLevel, isConfiguredFramework, isConfiguredTool, isEnabled, pathCheck } from './report.mjs';

function addWorkflowArtifactChecks(checks, config, strict) {
  const testManagementTool = getConfigValue(config, 'tools.testManagement', '');
  const issueTracker = getConfigValue(config, 'tools.issueTracker', '');
  const uiFramework = getConfigValue(config, 'automation.ui.framework', 'none');
  const apiFramework = getConfigValue(config, 'automation.api.framework', 'none');
  const hasAutomation = isConfiguredFramework(uiFramework) || isConfiguredFramework(apiFramework);
  const track = normalizeQaTrack(getConfigValue(config, 'project.qaTrack', 'standard'));
  const proposalPath = getConfigValue(config, 'testDesign.proposalPath', 'qa-ai-output/test-design-proposal.md');
  const isQuickTrack = track === 'quick';

  checks.push(
    pathCheck(checkLevel(strict, 'optional'), 'requirement analysis artifact', 'qa-ai-output/requirement-analysis.md')
  );
  if (!isQuickTrack) {
    const systemPath = getConfigValue(config, 'testDesign.systemPath', 'qa-ai-output/test-design-system.md');
    checks.push(pathCheck(checkLevel(strict, 'optional'), 'system test design artifact', systemPath));
  }
  checks.push(
    pathCheck(isQuickTrack ? 'optional' : checkLevel(strict, 'optional'), 'test design proposal artifact', proposalPath)
  );
  checks.push(pathCheck(checkLevel(strict, 'optional'), 'PR summary artifact', 'qa-ai-output/pr-summary.md'));

  if (!isQuickTrack && isConfiguredTool(testManagementTool)) {
    checks.push(
      pathCheck(
        checkLevel(strict, 'optional'),
        'test management coverage artifact',
        'qa-ai-output/test-management-coverage-analysis.md'
      )
    );
    checks.push(
      pathCheck(
        checkLevel(strict, 'optional'),
        'test management sync plan artifact',
        'qa-ai-output/test-management-sync-plan.md'
      )
    );
  }

  if (hasAutomation) {
    checks.push(
      pathCheck(
        checkLevel(strict, 'optional'),
        'automation feasibility artifact',
        'qa-ai-output/automation-feasibility-report.md'
      )
    );
    checks.push(
      pathCheck(
        checkLevel(strict, 'optional'),
        'automation implementation plan artifact',
        'qa-ai-output/automation-implementation-plan.md'
      )
    );
  }

  if (isConfiguredTool(issueTracker)) {
    checks.push(
      pathCheck(
        checkLevel(strict, 'optional'),
        'issue tracker task draft artifact',
        'qa-ai-output/jira-automation-task.md'
      )
    );
  }
}

export function addArtifactChecks(checks, config, strict) {
  const featurePath = getConfigValue(config, 'gherkin.featurePath', 'features');
  const matrixPath = getConfigValue(config, 'traceability.matrixPath', 'qa-ai-output/traceability-matrix.md');
  const mappingFile = getTestManagementMappingFile(config);
  const knowledgeEnabled = isEnabled(getConfigValue(config, 'knowledge.enabled', false));
  const knowledgeSourcePath = getConfigValue(config, 'knowledge.sourcePath', '');
  const knowledgeSummaryPath = getConfigValue(config, 'knowledge.summaryPath', ARTIFACT_PATHS.qaKnowledgeSummary);
  const knowledgeDecisionsPath = getConfigValue(config, 'knowledge.decisionsPath', ARTIFACT_PATHS.qaInitDecisions);
  const track = normalizeQaTrack(getConfigValue(config, 'project.qaTrack', 'standard'));

  checks.push(pathCheck('required', 'configured feature root', featurePath));
  for (const subfolder of FEATURE_SUBFOLDERS) {
    checks.push(
      pathCheck('optional', `feature category folder ${subfolder}`, `${featurePath.replace(/\/$/, '')}/${subfolder}`)
    );
  }
  checks.push(pathCheck('required', 'configured QA output path', path.dirname(matrixPath)));
  checks.push(pathCheck(checkLevel(strict, 'optional'), 'configured traceability matrix', matrixPath));
  if (mappingFile && track !== 'quick')
    checks.push(pathCheck(checkLevel(strict, 'optional'), 'configured test management mapping file', mappingFile));
  addWorkflowArtifactChecks(checks, config, strict);

  if (knowledgeEnabled) {
    checks.push(pathCheck('required', 'configured QA context folder', knowledgeSourcePath));
    if (knowledgeSummaryPath)
      checks.push(pathCheck(checkLevel(strict, 'optional'), 'QA context summary artifact', knowledgeSummaryPath));
    if (knowledgeDecisionsPath)
      checks.push(pathCheck(checkLevel(strict, 'optional'), 'QA init decisions artifact', knowledgeDecisionsPath));
  }
}

export async function checkLegacyArtifactAliases(cwd) {
  let warned = 0;
  for (const [legacyPath, newPath] of LEGACY_ARTIFACT_ALIASES) {
    const absLegacy = path.join(cwd, legacyPath);
    if (await pathExists(absLegacy)) {
      warned += 1;
      console.log(
        `[WARN] legacy artifact path: '${legacyPath}' found. Rename it to '${newPath}' to follow current conventions.`
      );
    }
  }
  return { warned };
}

export function addConfigArtifactChecks(checks, configExists) {
  if (configExists) checks.push(pathCheck('optional', 'init manifest', '.qa-ai/state/init-manifest.json'));
  if (configExists)
    checks.push(pathCheck('required', 'active specialists index', '.qa-ai/agents/specialists/active.md'));
}
