/**
 * Base interface for APM (Application Performance Monitoring) connectors.
 * All APM connectors must implement this interface.
 */

/**
 * @typedef {Object} APMSignal
 * @property {string} id - Unique signal identifier
 * @property {string} source - Source system (e.g., 'datadog', 'newrelic')
 * @property {string} date - ISO timestamp
 * @property {string} area - Affected area/service
 * @property {string} severity - Severity level (critical, warning, info)
 * @property {string} description - Human-readable description
 * @property {Object} [raw] - Raw data from APM system
 */

/**
 * @typedef {Object} APMConnector
 * @property {string} name - Connector name
 * @property {Function} validateCredentials - Validate credentials
 * @property {Function} fetchSignals - Fetch signals from APM
 * @property {Function} normalizeSignal - Normalize raw signal to APMSignal
 */

/**
 * Validates that credentials object has required fields
 * @param {Object} credentials - Credentials to validate
 * @param {string[]} requiredFields - Required field names
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateCredentials(credentials, requiredFields) {
  const errors = [];

  if (!credentials || typeof credentials !== 'object') {
    errors.push('Credentials must be an object');
    return { valid: false, errors };
  }

  for (const field of requiredFields) {
    if (!credentials[field]) {
      errors.push(`Missing required credential: ${field}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Normalizes a signal to the standard APMSignal format
 * @param {Object} rawSignal - Raw signal from APM
 * @param {string} source - Source system name
 * @param {Function} mapper - Function to map raw signal to APMSignal
 * @returns {APMSignal}
 */
export function normalizeSignal(rawSignal, source, mapper) {
  try {
    const normalized = mapper(rawSignal);
    return {
      id: normalized.id || `signal-${Date.now()}`,
      source,
      date: normalized.date || new Date().toISOString(),
      area: normalized.area || 'unknown',
      severity: normalizeSeverity(normalized.severity),
      description: normalized.description || '',
      raw: rawSignal
    };
  } catch (error) {
    throw new Error(`Failed to normalize signal from ${source}: ${error.message}`, { cause: error });
  }
}

/**
 * Normalizes severity to standard levels
 * @param {string|number} severity - Raw severity value
 * @returns {string} - Normalized severity (critical, warning, info)
 */
export function normalizeSeverity(severity) {
  if (typeof severity === 'number') {
    if (severity >= 4) return 'critical';
    if (severity >= 2) return 'warning';
    return 'info';
  }

  const s = String(severity || '').toLowerCase();
  if (['critical', 'error', 'fatal', 'p1', '1', 'high'].includes(s)) return 'critical';
  if (['warning', 'warn', 'p2', '2', 'medium'].includes(s)) return 'warning';
  return 'info';
}

/**
 * Rate limiter for APM API calls
 */
export class RateLimiter {
  constructor(maxRequests = 100, windowMs = 3600000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async acquire() {
    const now = Date.now();
    this.requests = this.requests.filter((t) => now - t < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      throw new Error(`Rate limit exceeded. Wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    this.requests.push(now);
  }

  getRemaining() {
    const now = Date.now();
    this.requests = this.requests.filter((t) => now - t < this.windowMs);
    return this.maxRequests - this.requests.length;
  }
}

/**
 * Retry logic for APM API calls
 */
export async function withRetry(fn, options = {}) {
  const { maxRetries = 3, delayMs = 1000, backoff = 2 } = options;

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const waitTime = delayMs * Math.pow(backoff, attempt);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError;
}
