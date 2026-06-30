import path from 'node:path';
import { getActiveRunId, readRunSnapshot } from './harness-run-store.mjs';
import {
  buildWorkflowContext,
  getPhaseMap,
  getPhaseSkipReason,
  getTrackPhaseOrder,
  loadLegacyWorkflowDefinitions,
  loadWorkflowContract,
  normalizeQaTrack,
  QA_TRACK_IDS,
  QA_TRACKS
} from './harness-contract.mjs';
import { getConfigValue, listFilesRecursive, loadQaAiConfig, parseSimpleYaml, pathExists, readText } from './utils.mjs';
import { ARTIFACT_PATHS, DEFAULT_FEATURE_PATH } from './artifact-paths.mjs';
import { normalizeGateDecision } from './release-gate.mjs';
export { normalizeQaTrack, QA_TRACK_IDS, QA_TRACKS };

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
  const featureRoot = resolveConfigPath(config, 'gherkin.featurePath') || DEFAULT_FEATURE_PATH;
  const files = await listFilesRecursive(path.join(cwd, featureRoot), (file) => file.endsWith('.feature'));
  return files.length > 0;
}

async function isPhaseComplete(cwd, config, phaseId, def) {
  if (def.releaseGate) {
    const gatePath = resolveConfigPath(config, getConfigValue(config, 'release.gatePath', ARTIFACT_PATHS.releaseGate));
    const absolute = path.join(cwd, gatePath);
    if (!(await pathExists(absolute))) return false;
    try {
      const data = parseSimpleYaml(await readText(absolute));
      const decision = normalizeGateDecision(data?.decision);
      return Boolean(decision) && decision !== 'PENDING';
    } catch {
      return false;
    }
  }
  if (phaseId === 'context') {
    const summary = resolveConfigPath(config, 'knowledge.summaryPath') || ARTIFACT_PATHS.qaKnowledgeSummary;
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

function buildActiveRunRecommendations(snapshot, contract, config) {
  const phaseMap = getPhaseMap(contract);
  const order = getTrackPhaseOrder(contract, snapshot.track);
  const items = [];

  const activePhaseId = snapshot.activePhaseId;
  const pendingFromRun = order.filter((phaseId) => {
    const state = snapshot.phases?.[phaseId];
    return state && (state.status === 'pending' || state.status === 'active' || state.status === 'blocked');
  });

  const nextId = activePhaseId || pendingFromRun[0];
  if (nextId) {
    const def = phaseMap.get(nextId);
    items.push({
      priority: 'required',
      title: `Active run — next phase: ${def.name}`,
      command: 'npx qa-flowkit run next',
      detail: `Run ${snapshot.runId}. After producing artifacts, run: npx qa-flowkit run check`
    });
    if (def.entryApprovals?.length) {
      items.push({
        priority: 'required',
        title: 'Approval may be required before advancing',
        command: `npx qa-flowkit run approve ${def.entryApprovals[0]}`,
        detail: 'Record explicit approval for the active phase gate when prompted.'
      });
    }
    if (!snapshot.rfId && def.requiresRfId) {
      items.push({
        priority: 'required',
        title: 'Record official RF ID',
        command: 'npx qa-flowkit run set-rf <RF-ID>',
        detail: 'Required before Gherkin generation when requireOfficialRfId is enabled.'
      });
    }
  } else if (snapshot.status === 'completed') {
    items.push({
      priority: 'required',
      title: 'Active run complete',
      command: 'npx qa-flowkit run status',
      detail: `Run ${snapshot.runId} has no remaining actionable phases.`
    });
  }

  items.push({
    priority: 'recommended',
    title: 'Inspect active run status',
    command: 'npx qa-flowkit run status',
    detail: 'Shows phase progress, blockers and approvals for the current run.'
  });

  const ctx = buildWorkflowContext(config);
  if (ctx.track === 'enterprise' || ctx.track === 'standard') {
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

  return items;
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
      skippedPhaseIds: [],
      activeRun: null
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
          command: 'npx qa-flowkit init',
          detail: 'Creates qa-ai.config.yaml and the configured folder layout (or: node .qa-ai/scripts/init.mjs).'
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
      skippedPhaseIds: [],
      activeRun: null
    };
  }

  const { trackPhaseOrder, phaseDefinitions } = await loadLegacyWorkflowDefinitions(cwd);
  const contract = await loadWorkflowContract(cwd);
  const phaseMap = getPhaseMap(contract);
  const ctx = buildWorkflowContext(configInfo.data);
  const order = trackPhaseOrder[ctx.track] || trackPhaseOrder.standard;
  const phases = [];
  const completedPhaseIds = [];
  const pendingPhaseIds = [];
  const skippedPhaseIds = [];

  for (const phaseId of order) {
    const def = phaseDefinitions[phaseId];
    const contractPhase = phaseMap.get(phaseId);
    const skip = getPhaseSkipReason(configInfo.data, contractPhase);
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

  const activeRunId = await getActiveRunId(cwd);
  let activeRun = null;
  let recommendations;

  if (activeRunId) {
    const snapshot = await readRunSnapshot(cwd, activeRunId);
    activeRun = {
      runId: snapshot.runId,
      status: snapshot.status,
      activePhaseId: snapshot.activePhaseId,
      rfId: snapshot.rfId || null
    };
    recommendations = buildActiveRunRecommendations(snapshot, contract, configInfo.data);
  } else {
    recommendations = buildRecommendations({
      ctx,
      pendingPhaseIds,
      completedPhaseIds,
      config: configInfo.data,
      phaseDefinitions
    });
    recommendations.unshift({
      priority: 'recommended',
      title: 'Start a resumable harness run',
      command: 'npx qa-flowkit run start',
      detail: 'Optional: persist workflow state across agent sessions with phase packets and validation gates.'
    });
  }

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
    recommendations,
    activeRun
  };
}

function buildRecommendations({ ctx, pendingPhaseIds, completedPhaseIds, config, phaseDefinitions }) {
  const items = [];
  const nextId = pendingPhaseIds[0];

  if (nextId) {
    const def = phaseDefinitions[nextId];
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
    if (nextId === 'gherkin-quality') {
      items.push({
        priority: 'recommended',
        title: 'Validate Gherkin quality report',
        command: 'node .qa-ai/scripts/validate-quality-report.mjs',
        detail: 'Checks rubric version, current feature hashes, evidence rows and gate thresholds.'
      });
    }
    if (nextId === 'healing') {
      items.push({
        priority: 'recommended',
        title: 'Validate governed healing log',
        command: 'node .qa-ai/scripts/validate-healing-log.mjs',
        detail: 'Checks healed tests, paths safety, types, and justification constraints.'
      });
    }
  } else if (completedPhaseIds.length > 0) {
    if (ctx.track === 'enterprise' && !completedPhaseIds.includes('release-gate')) {
      items.push({
        priority: 'required',
        title: 'Record release quality gate',
        command: '/qa-gate',
        detail: `Produce ${ARTIFACT_PATHS.releaseGate} with PASS, CONCERNS, FAIL or WAIVED.`
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
    if (
      pendingPhaseIds.length === 0 ||
      ['traceability', 'pr', 'jira', 'api-impl', 'ui-impl', 'mobile-impl', 'healing'].includes(nextId)
    ) {
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

  const resultsPaths = getConfigValue(config, 'execution.resultsPaths', []);
  const evalResultsPaths = getConfigValue(config, 'execution.evalResultsPaths', []);
  if (resultsPaths.length > 0 || evalResultsPaths.length > 0) {
    items.push({
      priority: 'recommended',
      title: 'Validate execution and eval evidence results',
      command: 'node .qa-ai/scripts/validate-execution-evidence.mjs',
      detail: 'Validates JUnit XML, Cucumber JSON and AI eval evidence results against traceability.'
    });
  }

  if (pendingPhaseIds.length === 0) {
    items.push({
      priority: 'optional',
      title: 'Inspect repository status',
      command: '/qa-status',
      detail: 'Human-readable summary of config, artifacts and gaps.'
    });
  }

  const featurePath = resolveConfigPath(config, 'gherkin.featurePath') || DEFAULT_FEATURE_PATH;
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
    if (!report.configExists && report.initialized) {
      lines.push('qa-ai.config.yaml is missing — run init first:');
      lines.push('  npx qa-flowkit init');
      lines.push('');
    } else if (!report.initialized) {
      lines.push('QA FlowKit is not installed in this repository — run init first:');
      lines.push('  npx qa-flowkit init');
      lines.push('');
    }
    for (const item of report.recommendations) {
      lines.push(`[${item.priority.toUpperCase()}] ${item.title}`);
      lines.push(`  ${item.command}`);
      if (item.detail) lines.push(`  ${item.detail}`);
      lines.push('');
    }
    return lines.join('\n').trimEnd();
  }

  if (report.activeRun) {
    lines.push(`Active run: ${report.activeRun.runId} (${report.activeRun.status})`);
    if (report.activeRun.activePhaseId) {
      lines.push(`Active phase: ${report.activeRun.activePhaseId}`);
    }
    if (report.activeRun.rfId) {
      lines.push(`RF ID: ${report.activeRun.rfId}`);
    }
    lines.push('');
  }

  lines.push(`Track: ${report.track} (${report.trackInfo.label})`);
  lines.push(report.trackInfo.description);
  lines.push('');
  lines.push(
    `Completed phases (${report.completedPhaseIds.length}): ${
      report.completedPhaseIds.length ? report.completedPhaseIds.join(', ') : 'none'
    }`
  );
  lines.push(
    `Skipped phases (${report.skippedPhaseIds.length}): ${
      report.skippedPhaseIds.length ? report.skippedPhaseIds.join(', ') : 'none'
    }`
  );
  lines.push(
    `Pending phases (${report.pendingPhaseIds.length}): ${
      report.pendingPhaseIds.length ? report.pendingPhaseIds.join(', ') : 'none'
    }`
  );
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
