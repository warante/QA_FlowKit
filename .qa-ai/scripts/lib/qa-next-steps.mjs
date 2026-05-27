import path from 'node:path';
import {
  getConfigValue,
  listFilesRecursive,
  loadQaAiConfig,
  parseSimpleYaml,
  pathExists,
  readText
} from './utils.mjs';
import { normalizeGateDecision } from './release-gate.mjs';
import { isConfiguredFramework } from './project-config.mjs';

export const QA_TRACK_IDS = ['quick', 'standard', 'enterprise'];

export const QA_TRACKS = {
  quick: {
    label: 'Quick',
    description:
      'Requirements to Gherkin, traceability and PR summary without test-management sync or automation implementation.'
  },
  standard: {
    label: 'Standard',
    description:
      'Full QA workflow: test-management planning, feasibility, automation phases when configured, and PR summary.'
  },
  enterprise: {
    label: 'Enterprise',
    description:
      'Standard workflow plus strict target validation and release-readiness checks for compliance-oriented teams.'
  }
};

const TRACK_PHASE_ORDER = {
  quick: ['context', 'intake', 'normalize', 'gherkin', 'traceability', 'pr'],
  standard: [
    'context',
    'intake',
    'normalize',
    'test-design-system',
    'test-design-rf',
    'gherkin',
    'tm-coverage',
    'tm-sync',
    'traceability',
    'feasibility',
    'ui-impl',
    'api-impl',
    'jira',
    'pr'
  ],
  enterprise: [
    'context',
    'intake',
    'normalize',
    'test-design-system',
    'test-design-rf',
    'gherkin',
    'tm-coverage',
    'tm-sync',
    'traceability',
    'feasibility',
    'ui-impl',
    'api-impl',
    'jira',
    'pr',
    'release-gate'
  ]
};

const PHASE_DEFINITIONS = {
  context: {
    name: 'QA context intake',
    agent: 'qa-context-intake-agent.md',
    slashCommand: '/qa-init',
    workflow: '.qa-ai/workflows/context-intake.md'
  },
  intake: {
    name: 'Requirements intake',
    agent: 'requirements-intake-agent.md',
    slashCommand: '/qa-full-flow',
    workflow: '.qa-ai/workflows/intake.md',
    artifacts: ['qa-ai-output/requirement-analysis.md']
  },
  normalize: {
    name: 'Requirements normalization',
    agent: 'requirements-normalization-agent.md',
    slashCommand: '/qa-full-flow',
    artifacts: ['qa-ai-output/normalized-requirements.md']
  },
  'test-design-system': {
    name: 'System test design',
    agent: 'test-design-system-agent.md',
    slashCommand: '/qa-full-flow',
    workflow: '.qa-ai/workflows/test-design-system.md',
    artifacts: ['qa-ai-output/test-design-system.md'],
    validateScript: 'node .qa-ai/scripts/validate-test-design.mjs --allow-missing'
  },
  'test-design-rf': {
    name: 'Per-RF test design',
    agent: 'gherkin-test-design-agent.md',
    slashCommand: '/qa-full-flow',
    workflow: '.qa-ai/workflows/test-design.md',
    artifacts: ['qa-ai-output/test-design-proposal.md'],
    validateScript: 'node .qa-ai/scripts/validate-test-design.mjs --allow-missing'
  },
  gherkin: {
    name: 'Gherkin feature generation',
    agent: 'gherkin-test-design-agent.md',
    slashCommand: '/qa-full-flow',
    workflow: '.qa-ai/workflows/test-design.md',
    featureFiles: true
  },
  'tm-coverage': {
    name: 'Test management coverage',
    agent: 'testrail-coverage-agent.md',
    slashCommand: '/qa-coverage',
    artifacts: ['qa-ai-output/testrail-coverage-analysis.md']
  },
  'tm-sync': {
    name: 'Test management sync plan',
    agent: 'testrail-sync-agent.md',
    slashCommand: '/qa-full-flow',
    workflow: '.qa-ai/workflows/testrail-sync.md',
    artifacts: ['qa-ai-output/testrail-sync-plan.md']
  },
  traceability: {
    name: 'Traceability matrix',
    agent: 'gherkin-test-design-agent.md',
    slashCommand: '/qa-full-flow',
    configArtifact: 'traceability.matrixPath',
    validateScript: 'node .qa-ai/scripts/validate-traceability.mjs'
  },
  feasibility: {
    name: 'Automation feasibility',
    agent: 'automation-feasibility-agent.md',
    slashCommand: '/qa-automation-plan',
    workflow: '.qa-ai/workflows/automation-analysis.md',
    artifacts: ['qa-ai-output/automation-feasibility-report.md']
  },
  'ui-impl': {
    name: 'UI/E2E automation implementation',
    agent: 'webdriverio-implementation-agent.md',
    slashCommand: '/qa-full-flow',
    workflow: '.qa-ai/workflows/implementation.md',
    artifacts: ['qa-ai-output/automation-implementation-plan.md']
  },
  'api-impl': {
    name: 'API automation implementation',
    agent: 'api-testing-agent.md',
    slashCommand: '/qa-full-flow',
    workflow: '.qa-ai/workflows/implementation.md',
    artifacts: ['qa-ai-output/automation-implementation-plan.md']
  },
  jira: {
    name: 'Issue tracker task drafts',
    agent: 'jira-task-agent.md',
    slashCommand: '/qa-full-flow',
    artifacts: ['qa-ai-output/jira-automation-task.md']
  },
  pr: {
    name: 'PR summary',
    agent: 'pr-agent.md',
    slashCommand: '/qa-full-flow',
    workflow: '.qa-ai/workflows/pr.md',
    artifacts: ['qa-ai-output/pr-summary.md']
  },
  'release-gate': {
    name: 'Release quality gate',
    agent: 'release-gate-agent.md',
    slashCommand: '/qa-gate',
    workflow: '.qa-ai/workflows/release-gate.md',
    releaseGate: true,
    validateScript: 'node .qa-ai/scripts/validate-release-gate.mjs'
  }
};

export function normalizeQaTrack(value) {
  const normalized = String(value || 'standard').trim().toLowerCase();
  if (['quick', 'fast', 'minimal', 'light'].includes(normalized)) return 'quick';
  if (['enterprise', 'compliance', 'regulated'].includes(normalized)) return 'enterprise';
  if (['standard', 'method', 'full', 'default'].includes(normalized)) return 'standard';
  return QA_TRACK_IDS.includes(normalized) ? normalized : 'standard';
}

function isEnabled(value) {
  return value === true || String(value || '').trim().toLowerCase() === 'true';
}

function isConfiguredTool(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return Boolean(normalized) && !['none', 'undecided', 'n/a', 'na'].includes(normalized);
}

function resolveConfigPath(config, keyOrPath) {
  if (!keyOrPath) return '';
  const text = String(keyOrPath).trim();
  if (text.includes('/') || text.endsWith('.md') || text.endsWith('.json') || text.endsWith('.feature')) {
    return text;
  }
  if (text.includes('.')) {
    return String(getConfigValue(config, text, '') || '').trim();
  }
  return text;
}

async function artifactExists(cwd, config, relPath) {
  const target = resolveConfigPath(config, relPath);
  if (!target) return false;
  return pathExists(path.join(cwd, target));
}

async function hasFeatureFiles(cwd, config) {
  const featureRoot = resolveConfigPath(config, 'gherkin.featurePath') || 'features';
  const files = await listFilesRecursive(path.join(cwd, featureRoot), (file) => file.endsWith('.feature'));
  return files.length > 0;
}

function buildContext(config) {
  const knowledgeEnabled = isEnabled(getConfigValue(config, 'knowledge.enabled', false));
  const testManagement = getConfigValue(config, 'tools.testManagement', '');
  const issueTracker = getConfigValue(config, 'tools.issueTracker', '');
  const uiFramework = String(getConfigValue(config, 'automation.ui.framework', 'none')).toLowerCase();
  const apiFramework = String(getConfigValue(config, 'automation.api.framework', 'none')).toLowerCase();
  const track = normalizeQaTrack(getConfigValue(config, 'project.qaTrack', 'standard'));

  return {
    track,
    knowledgeEnabled,
    testManagementConfigured: isConfiguredTool(testManagement),
    issueTrackerConfigured: isConfiguredTool(issueTracker),
    uiAutomationConfigured: isConfiguredFramework(uiFramework),
    apiAutomationConfigured: isConfiguredFramework(apiFramework)
  };
}

function skipReason(phaseId, ctx) {
  if (phaseId === 'context' && !ctx.knowledgeEnabled) {
    return 'knowledge.enabled is false';
  }
  if (['tm-coverage', 'tm-sync'].includes(phaseId)) {
    if (ctx.track === 'quick') return `not included in ${ctx.track} track`;
    if (!ctx.testManagementConfigured) return 'tools.testManagement is none or missing';
  }
  if (['test-design-system', 'test-design-rf'].includes(phaseId) && ctx.track === 'quick') {
    return `not included in ${ctx.track} track (use gherkin phase for proposal + features)`;
  }
  if (phaseId === 'feasibility' && ctx.track === 'quick') {
    return `not included in ${ctx.track} track`;
  }
  if (phaseId === 'ui-impl') {
    if (ctx.track === 'quick') return `not included in ${ctx.track} track`;
    if (!ctx.uiAutomationConfigured) return 'automation.ui.framework is none or undecided';
  }
  if (phaseId === 'api-impl') {
    if (ctx.track === 'quick') return `not included in ${ctx.track} track`;
    if (!ctx.apiAutomationConfigured) return 'automation.api.framework is none or undecided';
  }
  if (phaseId === 'jira') {
    if (ctx.track === 'quick') return `not included in ${ctx.track} track`;
    if (!ctx.issueTrackerConfigured) return 'tools.issueTracker is none or missing';
  }
  return null;
}

async function isPhaseComplete(cwd, config, phaseId, def) {
  if (def.releaseGate) {
    const gatePath = resolveConfigPath(
      config,
      getConfigValue(config, 'release.gatePath', 'qa-ai-output/release-gate.yaml')
    );
    const absolute = path.join(cwd, gatePath);
    if (!await pathExists(absolute)) return false;
    try {
      const data = parseSimpleYaml(await readText(absolute));
      const decision = normalizeGateDecision(data?.decision);
      return Boolean(decision) && decision !== 'PENDING';
    } catch {
      return false;
    }
  }
  if (phaseId === 'context') {
    const summary = resolveConfigPath(config, 'knowledge.summaryPath') || 'qa-ai-output/qa-knowledge-summary.md';
    return artifactExists(cwd, config, summary);
  }
  if (def.featureFiles) {
    return hasFeatureFiles(cwd, config);
  }
  if (def.configArtifact) {
    return artifactExists(cwd, config, def.configArtifact);
  }
  if (def.artifacts) {
    const checks = await Promise.all(def.artifacts.map((item) => artifactExists(cwd, config, item)));
    return checks.every(Boolean);
  }
  return false;
}

function phaseCommand(def) {
  const parts = [];
  if (def.slashCommand) parts.push(def.slashCommand);
  if (def.agent) parts.push(`load .qa-ai/agents/${def.agent}`);
  if (def.validateScript) parts.push(def.validateScript);
  return parts.join(' · ');
}

export async function inspectQaWorkflow(cwd) {
  const frameworkPath = path.join(cwd, '.qa-ai');
  const hasFramework = await pathExists(frameworkPath);
  const configInfo = await loadQaAiConfig(cwd);

  if (!hasFramework) {
    return {
      initialized: false,
      configExists: false,
      track: 'standard',
      context: null,
      phases: [],
      recommendations: [
        {
          priority: 'required',
          title: 'Install the portable framework',
          command: 'cp -R /path/to/QA_FlowKit/.qa-ai .qa-ai',
          detail: 'Copy the .qa-ai folder into the target repository root.'
        },
        {
          priority: 'required',
          title: 'Initialize the target repository',
          command: 'node .qa-ai/scripts/init.mjs',
          detail: 'Generates qa-ai.config.yaml, folders and default adapters.'
        },
        {
          priority: 'recommended',
          title: 'Bootstrap agent-first commands',
          command: 'node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode',
          detail: 'Optional: enables /qa-init in Claude Code and OpenCode.'
        }
      ],
      completedPhaseIds: [],
      pendingPhaseIds: [],
      skippedPhaseIds: []
    };
  }

  if (!configInfo.exists) {
    return {
      initialized: true,
      configExists: false,
      track: 'standard',
      context: null,
      phases: [],
      recommendations: [
        {
          priority: 'required',
          title: 'Generate project configuration',
          command: 'node .qa-ai/scripts/init.mjs',
          detail: 'Creates qa-ai.config.yaml and the configured folder layout.'
        },
        {
          priority: 'recommended',
          title: 'Verify setup',
          command: 'node .qa-ai/scripts/doctor.mjs',
          detail: 'Validates framework assets and configured paths.'
        }
      ],
      completedPhaseIds: [],
      pendingPhaseIds: [],
      skippedPhaseIds: []
    };
  }

  const ctx = buildContext(configInfo.data);
  const order = TRACK_PHASE_ORDER[ctx.track] || TRACK_PHASE_ORDER.standard;
  const phases = [];
  const completedPhaseIds = [];
  const pendingPhaseIds = [];
  const skippedPhaseIds = [];

  for (const phaseId of order) {
    const def = PHASE_DEFINITIONS[phaseId];
    const skip = skipReason(phaseId, ctx);
    if (skip) {
      skippedPhaseIds.push(phaseId);
      phases.push({
        id: phaseId,
        name: def.name,
        status: 'skipped',
        skipReason: skip,
        command: phaseCommand(def)
      });
      continue;
    }

    const complete = await isPhaseComplete(cwd, configInfo.data, phaseId, def);
    if (complete) {
      completedPhaseIds.push(phaseId);
      phases.push({
        id: phaseId,
        name: def.name,
        status: 'complete',
        command: phaseCommand(def)
      });
    } else {
      pendingPhaseIds.push(phaseId);
      phases.push({
        id: phaseId,
        name: def.name,
        status: 'pending',
        command: phaseCommand(def),
        agent: def.agent,
        workflow: def.workflow || null,
        validateScript: def.validateScript || null
      });
    }
  }

  const recommendations = buildRecommendations({
    ctx,
    pendingPhaseIds,
    completedPhaseIds,
    config: configInfo.data
  });

  return {
    initialized: true,
    configExists: true,
    track: ctx.track,
    trackInfo: QA_TRACKS[ctx.track],
    context: ctx,
    phases,
    completedPhaseIds,
    pendingPhaseIds,
    skippedPhaseIds,
    recommendations
  };
}

function buildRecommendations({ ctx, pendingPhaseIds, completedPhaseIds, config }) {
  const items = [];
  const nextId = pendingPhaseIds[0];

  if (nextId) {
    const def = PHASE_DEFINITIONS[nextId];
    items.push({
      priority: 'required',
      title: `Next phase: ${def.name}`,
      command: def.slashCommand || '/qa-full-flow',
      detail: `Load ${def.agent}${def.workflow ? ` and ${def.workflow}` : ''}.`
    });

    if (nextId === 'gherkin') {
      items.push({
        priority: 'recommended',
        title: 'Validate features after generation',
        command: 'node .qa-ai/scripts/validate-features.mjs',
        detail: 'Checks Gherkin structure, tags, RF IDs and acceptance criteria.'
      });
    }
    if (nextId === 'traceability') {
      items.push({
        priority: 'recommended',
        title: 'Validate traceability coverage',
        command: 'node .qa-ai/scripts/validate-traceability.mjs',
        detail: 'Ensures feature identifiers appear in the traceability matrix.'
      });
    }
  } else if (completedPhaseIds.length > 0) {
    if (ctx.track === 'enterprise' && !completedPhaseIds.includes('release-gate')) {
      items.push({
        priority: 'required',
        title: 'Record release quality gate',
        command: '/qa-gate',
        detail: 'Produce qa-ai-output/release-gate.yaml with PASS, CONCERNS, FAIL or WAIVED.'
      });
    } else {
      items.push({
        priority: 'required',
        title: 'QA track workflow complete',
        command: '/qa-status',
        detail: 'Summarize artifacts, run validators and confirm release readiness.'
      });
    }
  }

  if (ctx.track === 'enterprise' || ctx.track === 'standard') {
    if (pendingPhaseIds.length === 0 || ['traceability', 'pr', 'jira', 'api-impl', 'ui-impl'].includes(nextId)) {
      items.push({
        priority: ctx.track === 'enterprise' ? 'required' : 'recommended',
        title: 'Run aggregated target validation',
        command: 'node .qa-ai/scripts/validate-target.mjs',
        detail:
          ctx.track === 'enterprise'
            ? 'Runs strict doctor, validators and release gate for CI-style hardening.'
            : 'Runs doctor --strict and validators in sequence for initialized repositories.'
      });
    }
    if (ctx.track === 'enterprise' && nextId === 'release-gate') {
      items.push({
        priority: 'recommended',
        title: 'Validate release gate file',
        command: 'node .qa-ai/scripts/validate-release-gate.mjs',
        detail: 'Checks decision, risks, evidence paths and approver rules.'
      });
    }
  }

  if (pendingPhaseIds.length === 0) {
    items.push({
      priority: 'optional',
      title: 'Inspect repository status',
      command: '/qa-status',
      detail: 'Human-readable summary of config, artifacts and gaps.'
    });
  }

  const featurePath = resolveConfigPath(config, 'gherkin.featurePath') || 'features';
  if (!pendingPhaseIds.includes('gherkin') && completedPhaseIds.includes('gherkin')) {
    items.push({
      priority: 'optional',
      title: 'Add or update tests for a scope',
      command: '/qa-add-tests',
      detail: `Extend coverage under ${featurePath} for a new RF or change request.`
    });
  }

  return items;
}

export function formatHelpReport(report, { query = '' } = {}) {
  const lines = [];
  lines.push('QA FlowKit — guided next steps');
  if (query) lines.push(`Query: ${query}`);
  lines.push('');

  if (!report.initialized || !report.configExists) {
    for (const item of report.recommendations) {
      lines.push(`[${item.priority.toUpperCase()}] ${item.title}`);
      lines.push(`  ${item.command}`);
      if (item.detail) lines.push(`  ${item.detail}`);
      lines.push('');
    }
    return lines.join('\n').trimEnd();
  }

  lines.push(`Track: ${report.track} (${report.trackInfo.label})`);
  lines.push(report.trackInfo.description);
  lines.push('');
  lines.push(`Completed phases (${report.completedPhaseIds.length}): ${
    report.completedPhaseIds.length ? report.completedPhaseIds.join(', ') : 'none'
  }`);
  lines.push(`Skipped phases (${report.skippedPhaseIds.length}): ${
    report.skippedPhaseIds.length ? report.skippedPhaseIds.join(', ') : 'none'
  }`);
  lines.push(`Pending phases (${report.pendingPhaseIds.length}): ${
    report.pendingPhaseIds.length ? report.pendingPhaseIds.join(', ') : 'none'
  }`);
  lines.push('');

  if (report.pendingPhaseIds.length > 0 || report.completedPhaseIds.length > 0) {
    lines.push('Phase status:');
    for (const phase of report.phases) {
      const marker = phase.status === 'complete' ? '[done]' : phase.status === 'skipped' ? '[skip]' : '[    ]';
      const suffix = phase.skipReason ? ` — ${phase.skipReason}` : '';
      lines.push(`  ${marker} ${phase.name}${suffix}`);
    }
    lines.push('');
  }

  lines.push('Recommendations:');
  for (const item of report.recommendations) {
    lines.push(`[${item.priority.toUpperCase()}] ${item.title}`);
    lines.push(`  ${item.command}`);
    if (item.detail) lines.push(`  ${item.detail}`);
    lines.push('');
  }

  lines.push('Tip: run `/qa-help` in your agent or `node .qa-ai/scripts/qa-help.mjs` after each workflow step.');
  return lines.join('\n').trimEnd();
}
