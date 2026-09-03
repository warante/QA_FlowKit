#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractRFIdsFromText,
  extractRFIdsFromCommit,
  extractRFIdsFromPR,
  buildCIMetadata
} from '../../lib/ci-traceability.mjs';

test('ci-traceability: extractRFIdsFromText extracts RF IDs', () => {
  const text = 'Fixed RF-042 and RF-050 in this commit';
  const rfIds = extractRFIdsFromText(text);

  assert.deepEqual(rfIds.sort(), ['RF-042', 'RF-050']);
});

test('ci-traceability: extractRFIdsFromText handles various formats', () => {
  const text = 'RF-001, RF_002, RF003 are all related';
  const rfIds = extractRFIdsFromText(text);

  assert.equal(rfIds.length, 3);
  assert.ok(rfIds.includes('RF-001'));
  assert.ok(rfIds.includes('RF_002'));
  assert.ok(rfIds.includes('RF003'));
});

test('ci-traceability: extractRFIdsFromText deduplicates', () => {
  const text = 'RF-042 appears twice: RF-042';
  const rfIds = extractRFIdsFromText(text);

  assert.equal(rfIds.length, 1);
  assert.equal(rfIds[0], 'RF-042');
});

test('ci-traceability: extractRFIdsFromText handles empty input', () => {
  assert.deepEqual(extractRFIdsFromText(''), []);
  assert.deepEqual(extractRFIdsFromText(null), []);
  assert.deepEqual(extractRFIdsFromText(undefined), []);
});

test('ci-traceability: extractRFIdsFromCommit extracts from commit message', () => {
  const message = 'feat: implement login flow for RF-042 and RF-043';
  const rfIds = extractRFIdsFromCommit(message);

  assert.deepEqual(rfIds.sort(), ['RF-042', 'RF-043']);
});

test('ci-traceability: extractRFIdsFromPR extracts from title, body, and commits', () => {
  const prData = {
    title: 'feat: RF-042 login flow',
    body: 'Implements RF-050 and fixes RF-051',
    commits: [{ message: 'Initial work on RF-042' }, { message: 'Add RF-052 tests' }]
  };

  const rfIds = extractRFIdsFromPR(prData);

  assert.ok(rfIds.includes('RF-042'));
  assert.ok(rfIds.includes('RF-050'));
  assert.ok(rfIds.includes('RF-051'));
  assert.ok(rfIds.includes('RF-052'));
});

test('ci-traceability: extractRFIdsFromPR handles missing fields', () => {
  const prData = { title: 'RF-042 fix' };
  const rfIds = extractRFIdsFromPR(prData);

  assert.deepEqual(rfIds, ['RF-042']);
});

test('ci-traceability: buildCIMetadata builds correct metadata from PR', () => {
  const rfIds = ['RF-042', 'RF-050'];
  const prData = {
    mergedAt: '2026-01-20T10:00:00Z',
    mergeCommit: { oid: 'abc123def456' },
    number: 123,
    title: 'feat: RF-042 and RF-050'
  };

  const metadata = buildCIMetadata(rfIds, prData, null);

  assert.deepEqual(metadata.rfIds, rfIds);
  assert.equal(metadata.lastValidated, '2026-01-20T10:00:00Z');
  assert.equal(metadata.validatedBy, 'abc123def456');
  assert.equal(metadata.validationType, 'pull-request');
  assert.equal(metadata.prNumber, 123);
});

test('ci-traceability: buildCIMetadata builds correct metadata from commit', () => {
  const rfIds = ['RF-042'];
  const commitData = {
    hash: 'def456abc123',
    message: 'feat: RF-042',
    date: '2026-01-20T10:00:00Z'
  };

  const metadata = buildCIMetadata(rfIds, null, commitData);

  assert.deepEqual(metadata.rfIds, rfIds);
  assert.equal(metadata.lastValidated, '2026-01-20T10:00:00Z');
  assert.equal(metadata.validatedBy, 'def456abc123');
  assert.equal(metadata.validationType, 'commit');
  assert.equal(metadata.prNumber, null);
});

test('ci-traceability: buildCIMetadata handles missing data', () => {
  const metadata = buildCIMetadata(['RF-042'], null, null);

  assert.deepEqual(metadata.rfIds, ['RF-042']);
  assert.equal(metadata.validationType, 'commit');
  assert.equal(metadata.validatedBy, 'unknown');
});
