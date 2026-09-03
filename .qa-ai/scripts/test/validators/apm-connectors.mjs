#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCredentials,
  normalizeSignal,
  normalizeSeverity,
  RateLimiter
} from '../../lib/apm-connectors/base.mjs';
import { DatadogConnector } from '../../lib/apm-connectors/datadog.mjs';
import { NewRelicConnector } from '../../lib/apm-connectors/newrelic.mjs';

test('apm-base: validateCredentials validates required fields', () => {
  const creds = { apiKey: 'key123', appKey: 'app456' };
  const result = validateCredentials(creds, ['apiKey', 'appKey']);

  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test('apm-base: validateCredentials detects missing fields', () => {
  const creds = { apiKey: 'key123' };
  const result = validateCredentials(creds, ['apiKey', 'appKey']);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('appKey')));
});

test('apm-base: validateCredentials handles null credentials', () => {
  const result = validateCredentials(null, ['apiKey']);

  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

test('apm-base: normalizeSeverity normalizes numeric severity', () => {
  assert.equal(normalizeSeverity(5), 'critical');
  assert.equal(normalizeSeverity(3), 'warning');
  assert.equal(normalizeSeverity(1), 'info');
});

test('apm-base: normalizeSeverity normalizes string severity', () => {
  assert.equal(normalizeSeverity('critical'), 'critical');
  assert.equal(normalizeSeverity('error'), 'critical');
  assert.equal(normalizeSeverity('warning'), 'warning');
  assert.equal(normalizeSeverity('info'), 'info');
});

test('apm-base: normalizeSignal creates standard format', () => {
  const raw = { id: '123', title: 'Test incident', severity: 'high', created: '2026-01-20T10:00:00Z' };
  const normalized = normalizeSignal(raw, 'test', (r) => ({
    id: r.id,
    date: r.created,
    area: 'test-area',
    severity: r.severity,
    description: r.title
  }));

  assert.equal(normalized.id, '123');
  assert.equal(normalized.source, 'test');
  assert.equal(normalized.area, 'test-area');
  assert.equal(normalized.severity, 'critical');
  assert.deepEqual(normalized.raw, raw);
});

test('apm-base: RateLimiter tracks requests', async () => {
  const limiter = new RateLimiter(2, 1000);

  await limiter.acquire();
  await limiter.acquire();
  assert.equal(limiter.getRemaining(), 0);

  await assert.rejects(limiter.acquire(), /Rate limit exceeded/);
});

test('apm-datadog: connector validates credentials', () => {
  const connector = new DatadogConnector({ apiKey: 'key', appKey: 'app' });
  const result = connector.validateCredentials();

  assert.equal(result.valid, true);
});

test('apm-datadog: connector rejects invalid credentials', () => {
  const connector = new DatadogConnector({ apiKey: 'key' });
  const result = connector.validateCredentials();

  assert.equal(result.valid, false);
});

test('apm-datadog: connector normalizes incident', () => {
  const connector = new DatadogConnector({ apiKey: 'key', appKey: 'app' });
  const incident = {
    id: 'inc-123',
    attributes: {
      title: 'Test incident',
      created: '2026-01-20T10:00:00Z',
      fields: { severity: 'P1' }
    }
  };

  const normalized = connector.normalizeSignal(incident);

  assert.equal(normalized.id, 'inc-123');
  assert.equal(normalized.source, 'datadog');
  assert.equal(normalized.severity, 'critical');
  assert.equal(normalized.description, 'Test incident');
});

test('apm-newrelic: connector validates credentials', () => {
  const connector = new NewRelicConnector({ apiKey: 'key', accountId: '123' });
  const result = connector.validateCredentials();

  assert.equal(result.valid, true);
});

test('apm-newrelic: connector rejects invalid credentials', () => {
  const connector = new NewRelicConnector({ apiKey: 'key' });
  const result = connector.validateCredentials();

  assert.equal(result.valid, false);
});

test('apm-newrelic: connector normalizes issue', () => {
  const connector = new NewRelicConnector({ apiKey: 'key', accountId: '123' });
  const issue = {
    id: 'issue-456',
    title: 'Test issue',
    activatedAt: '2026-01-20T10:00:00Z',
    priority: 'critical'
  };

  const normalized = connector.normalizeSignal(issue);

  assert.equal(normalized.id, 'issue-456');
  assert.equal(normalized.source, 'newrelic');
  assert.equal(normalized.severity, 'critical');
  assert.equal(normalized.description, 'Test issue');
});
