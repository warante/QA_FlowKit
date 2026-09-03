/**
 * Datadog APM connector
 * Fetches incidents and signals from Datadog API
 */

import { validateCredentials, normalizeSignal, RateLimiter, withRetry } from './base.mjs';

const DATADOG_API_BASE = 'https://api.datadoghq.com/api/v2';

export class DatadogConnector {
  constructor(credentials, options = {}) {
    this.credentials = credentials;
    this.options = {
      lookbackDays: options.lookbackDays || 7,
      rateLimiter: new RateLimiter(100, 3600000)
    };
  }

  validateCredentials() {
    return validateCredentials(this.credentials, ['apiKey', 'appKey']);
  }

  async fetchSignals() {
    const { valid, errors } = this.validateCredentials();
    if (!valid) {
      throw new Error(`Invalid Datadog credentials: ${errors.join(', ')}`);
    }

    await this.options.rateLimiter.acquire();

    const since = new Date();
    since.setDate(since.getDate() - this.options.lookbackDays);

    return withRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(`${DATADOG_API_BASE}/incidents`, {
          method: 'GET',
          headers: {
            'DD-API-KEY': this.credentials.apiKey,
            'DD-APPLICATION-KEY': this.credentials.appKey,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Datadog API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return (data.data || []).map((incident) => this.normalizeSignal(incident));
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    });
  }

  normalizeSignal(incident) {
    return normalizeSignal(incident, 'datadog', (raw) => {
      const attrs = raw.attributes || {};
      return {
        id: raw.id,
        date: attrs.created || attrs.modified || new Date().toISOString(),
        area: attrs.fields?.severity || 'unknown',
        severity: attrs.fields?.severity || 'warning',
        description: attrs.title || attrs.fields?.summary || ''
      };
    });
  }
}

export function createDatadogConnector(credentials, options) {
  return new DatadogConnector(credentials, options);
}
