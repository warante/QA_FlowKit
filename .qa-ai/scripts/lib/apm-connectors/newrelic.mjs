/**
 * New Relic APM connector
 * Fetches incidents and signals from New Relic API
 */

import { validateCredentials, normalizeSignal, RateLimiter, withRetry } from './base.mjs';

const NEWRELIC_API_BASE = 'https://api.newrelic.com/graphql';

export class NewRelicConnector {
  constructor(credentials, options = {}) {
    this.credentials = credentials;
    this.options = {
      lookbackDays: options.lookbackDays || 7,
      rateLimiter: new RateLimiter(100, 3600000)
    };
  }

  validateCredentials() {
    return validateCredentials(this.credentials, ['apiKey', 'accountId']);
  }

  async fetchSignals() {
    const { valid, errors } = this.validateCredentials();
    if (!valid) {
      throw new Error(`Invalid New Relic credentials: ${errors.join(', ')}`);
    }

    await this.options.rateLimiter.acquire();

    const since = new Date();
    since.setDate(since.getDate() - this.options.lookbackDays);

    const query = `
      query {
        actor {
          account(id: ${this.credentials.accountId}) {
            aiIssues {
              issues(since: "${since.toISOString()}") {
                issues {
                  id
                  title
                  activatedAt
                  priority
                  url
                }
              }
            }
          }
        }
      }
    `;

    return withRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(NEWRELIC_API_BASE, {
          method: 'POST',
          headers: {
            'Api-Key': this.credentials.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`New Relic API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const issues = data?.data?.actor?.account?.aiIssues?.issues?.issues || [];
        return issues.map((issue) => this.normalizeSignal(issue));
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    });
  }

  normalizeSignal(issue) {
    return normalizeSignal(issue, 'newrelic', (raw) => {
      return {
        id: raw.id,
        date: raw.activatedAt || new Date().toISOString(),
        area: 'ai-issue',
        severity: raw.priority || 'warning',
        description: raw.title || ''
      };
    });
  }
}

export function createNewRelicConnector(credentials, options) {
  return new NewRelicConnector(credentials, options);
}
