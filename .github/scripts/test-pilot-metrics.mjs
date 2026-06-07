#!/usr/bin/env node
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { metricComparison, percentage, summarizePilotRecord, validatePilotRecord } from './lib/pilot-metrics.mjs';

function completeRecord() {
  return {
    schemaVersion: 1,
    pilotId: 'PILOT-TEST-001',
    status: 'complete',
    measurementCompleteness: 'complete',
    track: 'quick',
    consent: { obtained: true, publication: 'aggregate-only', rawDataDeleteAfter: '2026-09-01' },
    context: {
      repositoryAlias: 'repo-a',
      teamProfile: 'manual-qa',
      automationStack: 'none',
      agentSurface: 'test-agent'
    },
    windows: {
      baseline: {
        requirementToDesignMinutes: 60,
        timeToValidGherkinMinutes: 40,
        reviewCycles: 3,
        acceptanceCriteriaCovered: 3,
        acceptanceCriteriaEligible: 4,
        reworkMinutes: 20,
        retainedArtifacts: 2,
        escapedDesignDefects: 2,
        validatorFoundDefects: 0,
        manualAdaptationMinutes: 0
      },
      assisted: {
        requirementToDesignMinutes: 45,
        timeToValidGherkinMinutes: 20,
        reviewCycles: 2,
        acceptanceCriteriaCovered: 4,
        acceptanceCriteriaEligible: 4,
        reworkMinutes: 10,
        retainedArtifacts: 5,
        escapedDesignDefects: 1,
        validatorFoundDefects: 2,
        manualAdaptationMinutes: 0
      }
    },
    qualitative: {
      baseline: { clarity: 2, trust: 3, ceremonyFit: 3, errorActionability: 2, adoptionIntent: 2 },
      assisted: { clarity: 4, trust: 4, ceremonyFit: 4, errorActionability: 4, adoptionIntent: 4 }
    },
    issues: [{ id: 'ISSUE-1', severity: 'P2', attribution: 'flowkit', summary: 'Example issue' }],
    limitations: [],
    decisions: []
  };
}

test('complete pilot record validates and calculates deltas', () => {
  const record = completeRecord();
  assert.deepEqual(validatePilotRecord(record), []);
  const summary = summarizePilotRecord(record);
  assert.equal(summary.metrics.requirementToDesignMinutes.absoluteDelta, -15);
  assert.equal(summary.metrics.acceptanceCriteriaCoverage.baseline, 75);
  assert.equal(summary.metrics.acceptanceCriteriaCoverage.assisted, 100);
});

test('missing values remain unavailable instead of becoming zero', () => {
  assert.deepEqual(metricComparison(null, 20), {
    baseline: null,
    assisted: 20,
    absoluteDelta: null,
    percentageDelta: null
  });
  assert.equal(percentage(null, 4), null);
  assert.equal(percentage(0, 0), null);
});

test('sensitive field names and invalid consent are rejected', () => {
  const record = completeRecord();
  record.consent.obtained = false;
  record.context.participantEmail = 'not-allowed@example.test';
  const errors = validatePilotRecord(record);
  assert.ok(errors.some((error) => error.includes('consent.obtained')));
  assert.ok(errors.some((error) => error.includes('forbidden sensitive-data field')));
});

test('sensitive values are rejected even under otherwise allowed fields', () => {
  const record = completeRecord();
  record.issues[0].summary = 'Contact participant@example.test or open https://private.example.test';
  const errors = validatePilotRecord(record);
  assert.ok(errors.some((error) => error.includes('email address')));
  assert.ok(errors.some((error) => error.includes('URL')));
});

test('retrospective partial record permits unavailable windows with limitations', () => {
  const record = completeRecord();
  record.measurementCompleteness = 'retrospective-partial';
  record.windows.baseline = null;
  record.qualitative.baseline = null;
  record.limitations = ['Baseline was not captured prospectively.'];
  assert.deepEqual(validatePilotRecord(record), []);
});
