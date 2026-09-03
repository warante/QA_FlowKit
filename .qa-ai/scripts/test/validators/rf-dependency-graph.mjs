#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRFDependencyGraph,
  computeGraphMetrics,
  formatGraphReport,
  formatGraphDot
} from '../../lib/rf-dependency-graph.mjs';

test('rf-dependency-graph: builds graph from explicit dependencies', () => {
  const requirements = [
    { rfId: 'RF-001', title: 'Login', text: 'Depends on RF-002 for authentication' },
    { rfId: 'RF-002', title: 'Auth', text: 'Blocks RF-003' },
    { rfId: 'RF-003', title: 'Dashboard', text: 'Related to RF-001' }
  ];
  const matrixRows = [
    { rfId: 'RF-001', featureFile: 'login.feature', caseId: 'TC-001' },
    { rfId: 'RF-002', featureFile: 'auth.feature', caseId: 'TC-002' },
    { rfId: 'RF-003', featureFile: 'dashboard.feature', caseId: 'TC-003' }
  ];

  const { graph, cycles } = buildRFDependencyGraph(requirements, matrixRows, { includeImplicit: false });

  assert.equal(graph.nodes.length, 3);
  assert.ok(graph.edges.some((e) => e.from === 'RF-001' && e.to === 'RF-002' && e.type === 'depends-on'));
  assert.ok(graph.edges.some((e) => e.from === 'RF-002' && e.to === 'RF-003' && e.type === 'blocks'));
  assert.ok(graph.edges.some((e) => e.from === 'RF-003' && e.to === 'RF-001' && e.type === 'related-to'));
  assert.equal(cycles.length, 1);
});

test('rf-dependency-graph: infers implicit dependencies from shared features', () => {
  const requirements = [];
  const matrixRows = [
    { rfId: 'RF-001', featureFile: 'shared.feature', caseId: 'TC-001' },
    { rfId: 'RF-002', featureFile: 'shared.feature', caseId: 'TC-002' },
    { rfId: 'RF-003', featureFile: 'other.feature', caseId: 'TC-003' }
  ];

  const { graph } = buildRFDependencyGraph(requirements, matrixRows, { includeImplicit: true });

  assert.ok(graph.edges.some((e) => e.from === 'RF-001' && e.to === 'RF-002' && e.source === 'implicit'));
  assert.ok(!graph.edges.some((e) => e.from === 'RF-001' && e.to === 'RF-003'));
});

test('rf-dependency-graph: computes metrics correctly', () => {
  const graph = {
    nodes: [
      { id: 'RF-001', title: 'Login', type: 'rf' },
      { id: 'RF-002', title: 'Auth', type: 'rf' },
      { id: 'RF-003', title: 'Isolated', type: 'rf' }
    ],
    edges: [
      { from: 'RF-001', to: 'RF-002', type: 'depends-on', source: 'explicit' },
      { from: 'RF-001', to: 'RF-002', type: 'related-to', source: 'implicit' }
    ]
  };
  const cycles = [];

  const metrics = computeGraphMetrics(graph, cycles);

  assert.equal(metrics.nodeCount, 3);
  assert.equal(metrics.edgeCount, 2);
  assert.equal(metrics.dependsOnEdges, 1);
  assert.equal(metrics.relatedEdges, 1);
  assert.equal(metrics.explicitEdges, 1);
  assert.equal(metrics.implicitEdges, 1);
  assert.equal(metrics.isolatedNodes, 1);
  assert.equal(metrics.cycleCount, 0);
  assert.equal(metrics.hasCycles, false);
});

test('rf-dependency-graph: detects cycles', () => {
  const requirements = [
    { rfId: 'RF-001', title: 'A', text: 'Depends on RF-002' },
    { rfId: 'RF-002', title: 'B', text: 'Depends on RF-003' },
    { rfId: 'RF-003', title: 'C', text: 'Depends on RF-001' }
  ];
  const matrixRows = [];

  const { cycles } = buildRFDependencyGraph(requirements, matrixRows, { includeImplicit: false });

  assert.ok(cycles.length > 0);
  assert.ok(cycles[0].includes('RF-001'));
  assert.ok(cycles[0].includes('RF-002'));
  assert.ok(cycles[0].includes('RF-003'));
});

test('rf-dependency-graph: formats report as markdown', () => {
  const graph = {
    nodes: [
      { id: 'RF-001', title: 'Login', type: 'rf' },
      { id: 'RF-002', title: 'Auth', type: 'rf' }
    ],
    edges: [{ from: 'RF-001', to: 'RF-002', type: 'depends-on', source: 'explicit' }]
  };
  const cycles = [];
  const metrics = computeGraphMetrics(graph, cycles);

  const report = formatGraphReport(graph, cycles, metrics);

  assert.ok(report.includes('# RF Dependency Graph'));
  assert.ok(report.includes('## Summary'));
  assert.ok(report.includes('Total RFs | 2'));
  assert.ok(report.includes('Total Dependencies | 1'));
  assert.ok(report.includes('## Dependencies'));
  assert.ok(report.includes('RF-001'));
  assert.ok(report.includes('RF-002'));
});

test('rf-dependency-graph: formats graph as DOT', () => {
  const graph = {
    nodes: [
      { id: 'RF-001', title: 'Login', type: 'rf' },
      { id: 'RF-002', title: 'Auth', type: 'rf' }
    ],
    edges: [
      { from: 'RF-001', to: 'RF-002', type: 'depends-on', source: 'explicit' },
      { from: 'RF-001', to: 'RF-002', type: 'blocks', source: 'explicit' }
    ]
  };

  const dot = formatGraphDot(graph);

  assert.ok(dot.includes('digraph rf_dependencies'));
  assert.ok(dot.includes('"RF-001"'));
  assert.ok(dot.includes('"RF-002"'));
  assert.ok(dot.includes('"RF-001" -> "RF-002"'));
});

test('rf-dependency-graph: handles empty input', () => {
  const { graph, cycles } = buildRFDependencyGraph([], [], { includeImplicit: false });

  assert.equal(graph.nodes.length, 0);
  assert.equal(graph.edges.length, 0);
  assert.equal(cycles.length, 0);
});

test('rf-dependency-graph: parses multiple dependency patterns', () => {
  const requirements = [
    {
      rfId: 'RF-001',
      title: 'Test',
      text: 'This depends on RF-002 and requires RF-003. It also blocks RF-004 and is related to RF-005.'
    }
  ];
  const matrixRows = [];

  const { graph } = buildRFDependencyGraph(requirements, matrixRows, { includeImplicit: false });

  assert.ok(graph.edges.some((e) => e.to === 'RF-002' && e.type === 'depends-on'));
  assert.ok(graph.edges.some((e) => e.to === 'RF-003' && e.type === 'depends-on'));
  assert.ok(graph.edges.some((e) => e.to === 'RF-004' && e.type === 'blocks'));
  assert.ok(graph.edges.some((e) => e.to === 'RF-005' && e.type === 'related-to'));
});
