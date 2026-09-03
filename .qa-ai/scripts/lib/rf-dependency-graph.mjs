import { parseMarkdownTable, normalizeColumn } from './markdown-table.mjs';
import { functionalMatrixContent } from './markdown-section.mjs';
import { getConfigValue, loadQaAiConfig, pathExists, readText, resolveRepoPath } from './utils.mjs';
import { ARTIFACT_PATHS } from './artifact-paths.mjs';
import { normalizeId } from './gherkin-validate.mjs';

const REQUIRED_COLUMNS = ['RF', 'Feature File', 'Test Management Case ID'];

const DEPENDENCY_PATTERNS = {
  dependsOn: [
    /depends?\s+on\s+(RF[-_]?\d+)/gi,
    /requires?\s+(RF[-_]?\d+)/gi,
    /needs?\s+(RF[-_]?\d+)/gi,
    /after\s+(RF[-_]?\d+)/gi
  ],
  blocks: [/blocks?\s+(RF[-_]?\d+)/gi, /prevents?\s+(RF[-_]?\d+)/gi, /prerequisite\s+(?:for\s+)?(RF[-_]?\d+)/gi],
  relatedTo: [
    /related\s+to\s+(RF[-_]?\d+)/gi,
    /see\s+(RF[-_]?\d+)/gi,
    /linked\s+(?:to|with)\s+(RF[-_]?\d+)/gi,
    /associated\s+(?:to|with)\s+(RF[-_]?\d+)/gi
  ]
};

function parseTraceabilityMatrix(content) {
  const table = parseMarkdownTable(functionalMatrixContent(content), {
    label: 'Traceability matrix',
    requiredColumns: REQUIRED_COLUMNS
  });

  if (table.errors.length > 0) {
    return { rows: [], errors: table.errors };
  }

  const rows = [];
  for (const row of table.rows) {
    const rf = String(row.values[normalizeColumn('RF')] || '').trim();
    const featureFile = String(row.values[normalizeColumn('Feature File')] || '').trim();
    const caseId = String(row.values[normalizeColumn('Test Management Case ID')] || '').trim();

    if (!rf) continue;

    rows.push({
      rfId: normalizeId(rf),
      featureFile,
      caseId: normalizeId(caseId),
      line: row.line
    });
  }

  return { rows, errors: [] };
}

function parseNormalizedRequirements(content) {
  const requirements = [];
  const lines = content.split('\n');
  let currentRf = null;
  let currentText = [];

  for (const line of lines) {
    const rfMatch = /^##\s+(RF[-_]?\d+)\s*(.*)/i.exec(line);
    if (rfMatch) {
      if (currentRf) {
        requirements.push({ rfId: currentRf, title: currentText[0] || '', text: currentText.join('\n') });
      }
      currentRf = normalizeId(rfMatch[1]);
      currentText = [rfMatch[2] || ''];
    } else if (currentRf) {
      currentText.push(line);
    }
  }

  if (currentRf) {
    requirements.push({ rfId: currentRf, title: currentText[0] || '', text: currentText.join('\n') });
  }

  return requirements;
}

function extractDependencies(text) {
  const dependsOn = new Set();
  const blocks = new Set();
  const relatedTo = new Set();

  for (const pattern of DEPENDENCY_PATTERNS.dependsOn) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      dependsOn.add(normalizeId(match[1]));
    }
  }

  for (const pattern of DEPENDENCY_PATTERNS.blocks) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      blocks.add(normalizeId(match[1]));
    }
  }

  for (const pattern of DEPENDENCY_PATTERNS.relatedTo) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      relatedTo.add(normalizeId(match[1]));
    }
  }

  return {
    dependsOn: Array.from(dependsOn),
    blocks: Array.from(blocks),
    relatedTo: Array.from(relatedTo)
  };
}

function inferImplicitDependencies(matrixRows) {
  const rfToFeatures = new Map();
  const rfToTests = new Map();

  for (const row of matrixRows) {
    if (!rfToFeatures.has(row.rfId)) rfToFeatures.set(row.rfId, new Set());
    if (!rfToTests.has(row.rfId)) rfToTests.set(row.rfId, new Set());

    if (row.featureFile) rfToFeatures.get(row.rfId).add(row.featureFile.toLowerCase());
    if (row.caseId) rfToTests.get(row.rfId).add(row.caseId);
  }

  const implicit = new Map();

  const rfIds = Array.from(rfToFeatures.keys());
  for (let i = 0; i < rfIds.length; i++) {
    for (let j = i + 1; j < rfIds.length; j++) {
      const rfA = rfIds[i];
      const rfB = rfIds[j];

      const featuresA = rfToFeatures.get(rfA);
      const featuresB = rfToFeatures.get(rfB);
      const sharedFeatures = [...featuresA].filter((f) => featuresB.has(f));

      if (sharedFeatures.length > 0) {
        if (!implicit.has(rfA)) implicit.set(rfA, new Set());
        if (!implicit.has(rfB)) implicit.set(rfB, new Set());
        implicit.get(rfA).add(rfB);
        implicit.get(rfB).add(rfA);
      }
    }
  }

  return implicit;
}

function detectCycles(graph) {
  const visited = new Set();
  const recursionStack = new Set();
  const cycles = [];

  function dfs(node, pathSoFar) {
    visited.add(node);
    recursionStack.add(node);
    pathSoFar.push(node);

    for (const edge of graph.edges) {
      if (edge.from !== node) continue;
      const next = edge.to;

      if (!visited.has(next)) {
        dfs(next, [...pathSoFar]);
      } else if (recursionStack.has(next)) {
        const cycleStart = pathSoFar.indexOf(next);
        if (cycleStart >= 0) {
          cycles.push(pathSoFar.slice(cycleStart).concat(next));
        }
      }
    }

    recursionStack.delete(node);
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id, []);
    }
  }

  return cycles;
}

export function buildRFDependencyGraph(requirements, matrixRows, options = {}) {
  const { includeImplicit = true } = options;

  const nodes = new Map();
  const edges = [];

  for (const req of requirements) {
    if (!nodes.has(req.rfId)) {
      nodes.set(req.rfId, { id: req.rfId, title: req.title || '', type: 'rf' });
    }
  }

  for (const row of matrixRows) {
    if (!nodes.has(row.rfId)) {
      nodes.set(row.rfId, { id: row.rfId, title: '', type: 'rf' });
    }
  }

  for (const req of requirements) {
    const deps = extractDependencies(req.text);

    for (const dep of deps.dependsOn) {
      if (!nodes.has(dep)) nodes.set(dep, { id: dep, title: '', type: 'rf' });
      edges.push({ from: req.rfId, to: dep, type: 'depends-on', source: 'explicit' });
    }

    for (const dep of deps.blocks) {
      if (!nodes.has(dep)) nodes.set(dep, { id: dep, title: '', type: 'rf' });
      edges.push({ from: req.rfId, to: dep, type: 'blocks', source: 'explicit' });
    }

    for (const dep of deps.relatedTo) {
      if (!nodes.has(dep)) nodes.set(dep, { id: dep, title: '', type: 'rf' });
      edges.push({ from: req.rfId, to: dep, type: 'related-to', source: 'explicit' });
    }
  }

  if (includeImplicit) {
    const implicit = inferImplicitDependencies(matrixRows);
    for (const [rfA, related] of implicit.entries()) {
      for (const rfB of related) {
        const exists = edges.some((e) => (e.from === rfA && e.to === rfB) || (e.from === rfB && e.to === rfA));
        if (!exists) {
          edges.push({ from: rfA, to: rfB, type: 'related-to', source: 'implicit' });
        }
      }
    }
  }

  const graph = {
    nodes: Array.from(nodes.values()),
    edges
  };

  const cycles = detectCycles(graph);

  return { graph, cycles };
}

export function computeGraphMetrics(graph, cycles) {
  const nodeCount = graph.nodes.length;
  const edgeCount = graph.edges.length;
  const dependsOnEdges = graph.edges.filter((e) => e.type === 'depends-on').length;
  const blocksEdges = graph.edges.filter((e) => e.type === 'blocks').length;
  const relatedEdges = graph.edges.filter((e) => e.type === 'related-to').length;
  const explicitEdges = graph.edges.filter((e) => e.source === 'explicit').length;
  const implicitEdges = graph.edges.filter((e) => e.source === 'implicit').length;

  const isolatedNodes = graph.nodes.filter((node) => {
    return !graph.edges.some((e) => e.from === node.id || e.to === node.id);
  }).length;

  return {
    nodeCount,
    edgeCount,
    dependsOnEdges,
    blocksEdges,
    relatedEdges,
    explicitEdges,
    implicitEdges,
    isolatedNodes,
    cycleCount: cycles.length,
    hasCycles: cycles.length > 0
  };
}

export function formatGraphReport(graph, cycles, metrics) {
  const lines = [];

  lines.push('# RF Dependency Graph');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| ------ | ----- |');
  lines.push(`| Total RFs | ${metrics.nodeCount} |`);
  lines.push(`| Total Dependencies | ${metrics.edgeCount} |`);
  lines.push(`| Depends-On | ${metrics.dependsOnEdges} |`);
  lines.push(`| Blocks | ${metrics.blocksEdges} |`);
  lines.push(`| Related-To | ${metrics.relatedEdges} |`);
  lines.push(`| Explicit | ${metrics.explicitEdges} |`);
  lines.push(`| Implicit | ${metrics.implicitEdges} |`);
  lines.push(`| Isolated RFs | ${metrics.isolatedNodes} |`);
  lines.push(`| Cycles Detected | ${metrics.cycleCount} |`);

  if (cycles.length > 0) {
    lines.push('');
    lines.push('## Cycles Detected');
    lines.push('');
    lines.push('> Cycles indicate circular dependencies that may cause issues in test ordering.');
    lines.push('');
    for (let i = 0; i < cycles.length; i++) {
      lines.push(`${i + 1}. ${cycles[i].join(' -> ')}`);
    }
  }

  if (graph.edges.length > 0) {
    lines.push('');
    lines.push('## Dependencies');
    lines.push('');
    lines.push('| From | To | Type | Source |');
    lines.push('| ---- | -- | ---- | ------ |');
    for (const edge of graph.edges) {
      lines.push(`| ${edge.from} | ${edge.to} | ${edge.type} | ${edge.source} |`);
    }
  }

  if (metrics.isolatedNodes > 0) {
    const isolated = graph.nodes.filter((node) => !graph.edges.some((e) => e.from === node.id || e.to === node.id));
    lines.push('');
    lines.push('## Isolated RFs');
    lines.push('');
    lines.push('> RFs with no declared or implicit dependencies.');
    lines.push('');
    for (const node of isolated) {
      lines.push(`- ${node.id}${node.title ? `: ${node.title}` : ''}`);
    }
  }

  return lines.join('\n');
}

export function formatGraphDot(graph) {
  const lines = [];
  lines.push('digraph rf_dependencies {');
  lines.push('  rankdir=LR;');
  lines.push('  node [shape=box, style=filled, fillcolor=lightblue];');
  lines.push('');

  for (const node of graph.nodes) {
    const label = node.title ? `${node.id}\\n${node.title}` : node.id;
    lines.push(`  "${node.id}" [label="${label}"];`);
  }

  lines.push('');

  for (const edge of graph.edges) {
    const style =
      edge.type === 'depends-on' ? '' : edge.type === 'blocks' ? ' [style=dashed, color=red]' : ' [style=dotted]';
    lines.push(`  "${edge.from}" -> "${edge.to}"${style};`);
  }

  lines.push('}');
  return lines.join('\n');
}

export async function computeRFDependencyGraph(cwd, options = {}) {
  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};

  const matrixPath =
    options.matrixPath || getConfigValue(config, 'traceability.matrixPath', ARTIFACT_PATHS.traceabilityMatrix);
  const normalizedPath = options.normalizedPath || '.qa-ai/output/normalized-requirements.md';

  const matrixAbsPath = resolveRepoPath(cwd, matrixPath, { label: 'traceability matrix' });
  const normalizedAbsPath = resolveRepoPath(cwd, normalizedPath, { label: 'normalized requirements' });

  if (!(await pathExists(matrixAbsPath))) {
    return {
      ok: false,
      errors: [`Traceability matrix not found at ${matrixPath}`],
      warnings: [],
      graph: null,
      cycles: [],
      metrics: null
    };
  }

  const matrixContent = await readText(matrixAbsPath);
  const { rows: matrixRows, errors: matrixErrors } = parseTraceabilityMatrix(matrixContent);

  if (matrixErrors.length > 0) {
    return { ok: false, errors: matrixErrors, warnings: [], graph: null, cycles: [], metrics: null };
  }

  let requirements = [];
  if (await pathExists(normalizedAbsPath)) {
    const normalizedContent = await readText(normalizedAbsPath);
    requirements = parseNormalizedRequirements(normalizedContent);
  }

  const { graph, cycles } = buildRFDependencyGraph(requirements, matrixRows, options);
  const metrics = computeGraphMetrics(graph, cycles);

  return {
    ok: true,
    errors: [],
    warnings:
      requirements.length === 0
        ? ['No normalized requirements found; only implicit dependencies from traceability matrix']
        : [],
    graph,
    cycles,
    metrics
  };
}
