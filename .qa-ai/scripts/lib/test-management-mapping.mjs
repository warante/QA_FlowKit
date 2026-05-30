const validMappingKeyPattern = /^(?:(?:RF|TC|TEST|QA)[-_ ]?[A-Z0-9]+|.*\.feature)$/i;
const allowedFields = new Set(['externalId', 'section', 'suite', 'status', 'lastReviewedAt', 'notes']);
const secretKeyPattern = /(?:token|secret|password|passwd|api[_-]?key|authorization|auth)/i;
const secretValuePattern =
  /\b(?:ghp|github_pat|sk|xox[baprs]|glpat|AKIA)[A-Za-z0-9_-]{12,}\b|(?:bearer|basic)\s+[A-Za-z0-9._~+/-]+=*/i;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function scanForSecrets(value, path, errors) {
  if (typeof value === 'string') {
    if (secretKeyPattern.test(path) || secretValuePattern.test(value)) {
      errors.push(`${path} appears to contain a secret or credential; mapping files must not store secrets.`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForSecrets(item, `${path}[${index}]`, errors));
    return;
  }
  if (isPlainObject(value)) {
    for (const [key, nestedValue] of Object.entries(value)) {
      scanForSecrets(nestedValue, `${path}.${key}`, errors);
    }
  }
}

export function validateTestManagementMapping(data, { source = 'test management mapping' } = {}) {
  const errors = [];
  if (!isPlainObject(data)) {
    return [`${source} must contain a JSON object.`];
  }

  const externalIds = new Map();
  for (const [key, value] of Object.entries(data)) {
    if (!validMappingKeyPattern.test(key)) {
      errors.push(`${source} entry "${key}" must be keyed by an RF/test identifier or .feature path.`);
    }
    if (!isPlainObject(value)) {
      errors.push(`${source} entry "${key}" must be an object.`);
      continue;
    }

    for (const field of Object.keys(value)) {
      if (!allowedFields.has(field)) {
        errors.push(`${source} entry "${key}" has unsupported field "${field}".`);
      }
    }

    const externalId = String(value.externalId || '').trim();
    if (externalId) {
      const previous = externalIds.get(externalId);
      if (previous) {
        errors.push(`${source} externalId "${externalId}" is used by both "${previous}" and "${key}".`);
      } else {
        externalIds.set(externalId, key);
      }
    }

    scanForSecrets(value, `${source}.${key}`, errors);
  }

  return errors;
}
