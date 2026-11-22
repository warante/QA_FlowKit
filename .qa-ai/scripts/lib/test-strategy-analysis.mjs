import { parseMarkdownTable } from './markdown-table.mjs';
import { parse as parseGherkin } from './gherkin-parser.mjs';

const missing = (value) =>
  !String(value || '').trim() ||
  /^(?:unknown|pending|tbd|n\/a|not-applicable|desconocido|pendiente|no aplica|-)$/i.test(String(value).trim());

// Ignore examples in fenced blocks. Optional tables never become additional release gates.
export function strategyTables(content = '') {
  const tables = [];
  let section = '';
  let block = [];
  let fence = null;
  const flush = () => {
    if (block.length) tables.push({ section, ...parseMarkdownTable(block.join('\n')) });
    block = [];
  };
  for (const line of String(content).replace(/\r/g, '').split('\n')) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      flush();
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
      continue;
    }
    if (fence) continue;
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      flush();
      section = heading[1].toLowerCase();
    } else if (line.trim().startsWith('|')) {
      block.push(line);
    } else flush();
  }
  flush();
  return tables;
}

export function reviewStrategySections({ normalized = '', proposal = '', system = '', feasibility = '' } = {}) {
  const findings = [];
  const add = (code, section, row, fields) => {
    findings.push({ code, severity: 'advisory', section, row, fields });
  };
  const review = (text, section, required, inspect) => {
    for (const table of strategyTables(text).filter((item) => item.section === section)) {
      if (table.errors.length) add('STRATEGY_TABLE_SHAPE', section, null, []);
      for (const [index, row] of table.rows.entries()) {
        const absent = required.filter((field) => missing(row.values[field]));
        if (absent.length) add('STRATEGY_DETAILS_MISSING', section, index + 1, absent);
        inspect?.(row.values, index + 1);
      }
    }
  };
  review(
    normalized,
    'contrast cases',
    ['criterion id', 'example', 'counter-example', 'question', 'decision owner'],
    (r, n) => {
      if (missing(r.decision) || r.status !== 'resolved') {
        add('STRATEGY_DECISION_OPEN', 'contrast cases', n, ['decision', 'status']);
        const criterion = r['criterion id'];
        if (
          criterion &&
          strategyTables(normalized).some(
            (t) =>
              t.section !== 'contrast cases' &&
              t.rows.some((row) => row.values['criterion id'] === criterion && row.values.status === 'ready')
          )
        ) {
          add('STRATEGY_READY_WITH_OPEN_QUESTION', 'contrast cases', n, ['status']);
        }
      }
    }
  );
  review(
    proposal,
    'outcome checks',
    [
      'test id',
      'criterion ids',
      'observable outcome',
      'observation source',
      'oracle',
      'input partition',
      'output partition',
      'counter-example',
      'asynchronous',
      'prohibited effect'
    ],
    (r, n) => {
      if (!['yes', 'no'].includes(r.asynchronous) || !['yes', 'no'].includes(r['prohibited effect'])) {
        add('STRATEGY_ASYNC_CLASSIFICATION_MISSING', 'outcome checks', n, ['asynchronous', 'prohibited effect']);
      }
      if (r.asynchronous === 'yes' && r['prohibited effect'] === 'yes') {
        const absent = ['alternative behavior', 'correlation', 'observation window', 'terminal state'].filter((field) =>
          missing(r[field])
        );
        if (absent.length) add('STRATEGY_ASYNC_ABSENCE_UNSUPPORTED', 'outcome checks', n, absent);
      }
    }
  );
  review(
    system,
    'benefit evaluation',
    ['rf', 'user segment', 'behavior change', 'baseline', 'target', 'observation method', 'control'],
    (r, n) => {
      if (r.approval !== 'approved') add('STRATEGY_TARGET_UNAPPROVED', 'benefit evaluation', n, ['approval']);
      if (r.status === 'measured' && (missing(r.baseline) || missing(r.target) || r.approval !== 'approved')) {
        add('STRATEGY_BENEFIT_UNSUPPORTED', 'benefit evaluation', n, ['status']);
      }
    }
  );
  review(system, 'capability coverage', [
    'capability',
    'component',
    'attribute',
    'rfs',
    'risk reference',
    'evidence reference'
  ]);
  review(feasibility, 'automation redesign', [
    'test id',
    'criterion ids',
    'purpose',
    'redesign',
    'execution layer',
    'oracle',
    'data isolation',
    'synchronization'
  ]);
  return { mode: 'advisory', semanticCorrectnessVerified: false, findings };
}

export function buildCapabilityIndex(files, language = 'en') {
  const groups = new Map();
  const warnings = [];
  const seen = new Map();
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    const feature = parseGherkin(file.content, language).feature;
    if (!feature) {
      warnings.push({ code: 'STRATEGY_FEATURE_UNPARSED', path: file.path });
      continue;
    }
    const key = feature.name.normalize('NFC').trim().toLowerCase();
    if (!groups.has(key)) groups.set(key, { capability: feature.name, tests: [] });
    const visit = (children, inherited) => {
      for (const child of children) {
        const tags = [...inherited, ...(child.tags || []).map((tag) => tag.name)];
        if (child.type === 'Rule') visit(child.children, tags);
        if (child.type !== 'Scenario') continue;
        const ids = tags.filter((tag) => tag.startsWith('@id:')).map((tag) => tag.slice(4));
        const rfs = tags.filter((tag) => tag.startsWith('@rf:')).map((tag) => tag.slice(4));
        const entry = {
          path: file.path,
          line: child.line,
          title: child.name,
          testIds: [...new Set(ids)],
          rfs: [...new Set(rfs)]
        };
        groups.get(key).tests.push(entry);
        if (!ids.length) warnings.push({ code: 'STRATEGY_TEST_ID_MISSING', path: file.path, line: child.line });
        for (const id of entry.testIds) {
          if (seen.has(id))
            warnings.push({ code: 'STRATEGY_DUPLICATE_ID', testId: id, paths: [seen.get(id), file.path] });
          else seen.set(id, file.path);
        }
      }
    };
    visit(
      feature.children,
      feature.tags.map((tag) => tag.name)
    );
  }
  return {
    grouping: 'exact-normalized-feature-title',
    semanticEquivalenceVerified: false,
    capabilities: [...groups.values()].sort((a, b) => a.capability.localeCompare(b.capability)),
    warnings
  };
}

export function summarizeTestObservations(records = []) {
  if (!Array.isArray(records) || records.length > 10000) throw new Error('Expected at most 10000 execution records.');
  const groups = new Map();
  const seen = new Set();
  for (const record of records) {
    if (
      !record ||
      typeof record !== 'object' ||
      typeof record.testId !== 'string' ||
      typeof record.runId !== 'string' ||
      !/^[A-Za-z0-9_.:-]{1,120}$/.test(record.testId || '') ||
      !/^[A-Za-z0-9_.:-]{1,120}$/.test(record.runId || '') ||
      !['passed', 'failed', 'skipped'].includes(record.status) ||
      (record.durationMs !== undefined && (!Number.isFinite(record.durationMs) || record.durationMs < 0)) ||
      (record.sourceRevision !== undefined &&
        (typeof record.sourceRevision !== 'string' || !/^[a-f0-9]{7,64}$/i.test(record.sourceRevision)))
    ) {
      throw new Error(
        'Invalid execution record; expected testId, runId, status and optional durationMs/sourceRevision.'
      );
    }
    const key = `${record.testId}\0${record.runId}`;
    if (seen.has(key)) throw new Error('Duplicate testId/runId execution record.');
    seen.add(key);
    if (!groups.has(record.testId)) groups.set(record.testId, []);
    groups.get(record.testId).push(record);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([testId, runs]) => {
      const revisions = new Map();
      for (const run of runs) {
        if (!run.sourceRevision || run.status === 'skipped') continue;
        if (!revisions.has(run.sourceRevision)) revisions.set(run.sourceRevision, new Set());
        revisions.get(run.sourceRevision).add(run.status);
      }
      const durations = runs
        .map((r) => r.durationMs)
        .filter((v) => v !== undefined)
        .sort((a, b) => a - b);
      const middle = Math.floor(durations.length / 2);
      return {
        testId,
        observations: runs.length,
        passed: runs.filter((r) => r.status === 'passed').length,
        failed: runs.filter((r) => r.status === 'failed').length,
        skipped: runs.filter((r) => r.status === 'skipped').length,
        medianDurationMs: !durations.length
          ? null
          : durations.length % 2
            ? durations[middle]
            : (durations[middle - 1] + durations[middle]) / 2,
        mixedOutcomesAtSameRevision: [...revisions.values()].some((values) => values.size > 1),
        classification: 'requires-review'
      };
    });
}

/** Join exact IDs for investigation only; file-level counts are not scenario effort or causal evidence. */
export function buildMaintenanceInvestigation(navigation, maintenance, observations, { resultsSupplied = false } = {}) {
  const locations = new Map();
  const missingTestIds = [];
  const history = new Map((maintenance?.files || []).map((file) => [file.path, file]));
  const runs = new Map(observations.map((record) => [record.testId, record]));
  const capabilities = navigation.capabilities.map((group) => {
    const testIds = new Set();
    const paths = new Set();
    for (const test of group.tests) {
      paths.add(test.path);
      const location = { capability: group.capability, path: test.path, line: test.line };
      if (!test.testIds.length) missingTestIds.push(location);
      for (const testId of test.testIds) {
        testIds.add(testId);
        if (!locations.has(testId)) locations.set(testId, []);
        locations.get(testId).push(location);
      }
    }
    return {
      capability: group.capability,
      testIds: [...testIds].sort(),
      paths: [...paths].sort()
    };
  });
  const tests = [...locations.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([testId, entries]) => {
      const ambiguous = entries.length !== 1;
      const signals = [];
      if (ambiguous) signals.push('TEST_ID_AMBIGUOUS');
      const files = [...new Set(entries.map((entry) => entry.path))].sort().map((filePath) => {
        const file = history.get(filePath);
        let state = 'observed';
        if (!maintenance) state = 'not-requested';
        else if (!maintenance.available) state = 'unavailable';
        else if (!file) state = 'not-collected';
        else if (file.changeCommits === null) state = 'unavailable';
        if (state !== 'observed') signals.push(`MAINTENANCE_${state.toUpperCase().replaceAll('-', '_')}`);
        if (maintenance?.shallow) signals.push('MAINTENANCE_SHALLOW_HISTORY');
        if (file?.limited) signals.push('MAINTENANCE_TRUNCATED_HISTORY');
        return {
          path: filePath,
          state,
          changeCommits: state === 'observed' ? file.changeCommits : null,
          limited: file?.limited ?? null,
          shallow: maintenance?.shallow ?? null
        };
      });
      // An ambiguous ID must not silently attach execution evidence to either scenario.
      const observation = ambiguous ? null : runs.get(testId) || null;
      if (!resultsSupplied) signals.push('EXECUTION_OBSERVATIONS_NOT_SUPPLIED');
      else if (!runs.has(testId)) signals.push('EXECUTION_OBSERVATIONS_MISSING');
      if (observation?.mixedOutcomesAtSameRevision) signals.push('MIXED_OUTCOMES_SAME_SUPPLIED_REVISION');
      return {
        testId,
        identity: ambiguous ? 'ambiguous' : 'unique',
        locations: entries,
        fileHistory: files,
        observation,
        signals: [...new Set(signals)].sort(),
        classification: 'requires-review'
      };
    });
  return {
    kind: 'maintenance-investigation',
    join: 'exact-test-id',
    changeCountScope: 'file-including-creation-not-scenario-effort',
    causesInferred: false,
    automaticActions: false,
    capabilities,
    tests,
    missingTestIds,
    unmatchedObservationIds: observations
      .filter((record) => !locations.has(record.testId))
      .map((record) => record.testId),
    ambiguousObservationIds: observations
      .filter((record) => (locations.get(record.testId)?.length || 0) > 1)
      .map((record) => record.testId),
    limitations: [
      'Shared file history is repeated as context, never summed into test or capability maintenance totals.',
      'Mixed outcomes at a supplied revision are not confirmed flakiness or proof of a maintenance cause.',
      'Product evolution, test fragility, environment and data causes require separate evidence and human review.',
      'No test deletion, deduplication, quarantine, people ranking or statistical half-life is inferred.'
    ]
  };
}
