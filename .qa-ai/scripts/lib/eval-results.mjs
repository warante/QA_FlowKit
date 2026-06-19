/**
 * Normalized eval result parsers for AI-component evidence.
 *
 * Supported inputs:
 * - Generic QA FlowKit schema:
 *   { tool, createdAt, cases: [{ id, rfId?, name, pass, score?, threshold? }] }
 * - promptfoo-style JSON with a top-level `results` array.
 */

function asText(value) {
  return String(value ?? '').trim();
}

function asNumber(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function nestedValue(obj, paths) {
  for (const path of paths) {
    let current = obj;
    let found = true;
    for (const key of path) {
      if (!current || typeof current !== 'object' || !(key in current)) {
        found = false;
        break;
      }
      current = current[key];
    }
    if (found && current !== undefined && current !== null && current !== '') {
      return current;
    }
  }
  return undefined;
}

function normalizePass(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['pass', 'passed', 'success', 'ok', 'true'].includes(normalized)) return true;
    if (['fail', 'failed', 'failure', 'error', 'false'].includes(normalized)) return false;
  }
  return undefined;
}

function normalizeCase({ id, rfId, name, pass, score, threshold, message, tool, source }) {
  const normalizedPass = normalizePass(pass);
  return {
    id: asText(id),
    rfId: asText(rfId),
    name: asText(name),
    status: normalizedPass === false ? 'failed' : 'passed',
    pass: normalizedPass !== false,
    score: asNumber(score),
    threshold: asNumber(threshold),
    message: asText(message),
    tool: asText(tool),
    source: asText(source)
  };
}

function parseJson(text, filepath) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Malformed eval JSON in file ${filepath}: ${error.message}`, { cause: error });
  }
}

/**
 * Parses the generic QA FlowKit eval schema.
 * @param {string} text
 * @param {string} filepath
 * @returns {{ tool: string, createdAt: string, cases: object[] }}
 */
export function parseGenericEvalJson(text, filepath = 'unknown') {
  const data = parseJson(text, filepath);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`Malformed generic eval JSON in file ${filepath}: top-level element must be an object.`);
  }
  if (!Array.isArray(data.cases)) {
    throw new Error(`Malformed generic eval JSON in file ${filepath}: cases must be an array.`);
  }

  const cases = [];
  for (const [index, item] of data.cases.entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`Malformed generic eval JSON in file ${filepath}: cases[${index}] must be an object.`);
    }
    if (normalizePass(item.pass) === undefined) {
      throw new Error(`Malformed generic eval JSON in file ${filepath}: cases[${index}].pass must be boolean-like.`);
    }
    const normalized = normalizeCase({
      id: item.id,
      rfId: item.rfId,
      name: item.name,
      pass: item.pass,
      score: item.score,
      threshold: item.threshold,
      message: item.message || item.reason,
      tool: data.tool || item.tool || 'generic',
      source: filepath
    });
    if (!normalized.id && !normalized.name) {
      throw new Error(`Malformed generic eval JSON in file ${filepath}: cases[${index}] needs id or name.`);
    }
    cases.push(normalized);
  }

  return {
    tool: asText(data.tool || 'generic'),
    createdAt: asText(data.createdAt),
    cases
  };
}

/**
 * Parses promptfoo JSON output into QA FlowKit's normalized eval case model.
 * @param {string} text
 * @param {string} filepath
 * @returns {{ tool: string, createdAt: string, cases: object[] }}
 */
export function parsePromptfooJson(text, filepath = 'unknown') {
  const data = parseJson(text, filepath);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`Malformed promptfoo JSON in file ${filepath}: top-level element must be an object.`);
  }
  if (!Array.isArray(data.results)) {
    throw new Error(`Malformed promptfoo JSON in file ${filepath}: results must be an array.`);
  }

  const cases = [];
  for (const [index, item] of data.results.entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`Malformed promptfoo JSON in file ${filepath}: results[${index}] must be an object.`);
    }

    const pass = nestedValue(item, [
      ['pass'],
      ['success'],
      ['gradingResult', 'pass'],
      ['result', 'pass'],
      ['assertion', 'pass']
    ]);
    const normalizedPass = normalizePass(pass);
    if (normalizedPass === undefined) {
      throw new Error(`Malformed promptfoo JSON in file ${filepath}: results[${index}] must include pass status.`);
    }

    const name =
      nestedValue(item, [
        ['name'],
        ['description'],
        ['testCase', 'description'],
        ['testCase', 'name'],
        ['vars', 'name'],
        ['prompt', 'raw'],
        ['prompt', 'label']
      ]) || `promptfoo result ${index + 1}`;

    cases.push(
      normalizeCase({
        id: nestedValue(item, [['id'], ['testCase', 'id'], ['vars', 'id'], ['metadata', 'id']]),
        rfId: nestedValue(item, [['rfId'], ['vars', 'rfId'], ['metadata', 'rfId'], ['testCase', 'metadata', 'rfId']]),
        name,
        pass: normalizedPass,
        score: nestedValue(item, [['score'], ['gradingResult', 'score'], ['result', 'score'], ['assertion', 'score']]),
        threshold: nestedValue(item, [
          ['threshold'],
          ['gradingResult', 'threshold'],
          ['result', 'threshold'],
          ['assertion', 'threshold']
        ]),
        message: nestedValue(item, [
          ['message'],
          ['reason'],
          ['error'],
          ['gradingResult', 'reason'],
          ['result', 'reason']
        ]),
        tool: 'promptfoo',
        source: filepath
      })
    );
  }

  return {
    tool: 'promptfoo',
    createdAt: asText(data.createdAt || data.created_at || data.timestamp),
    cases
  };
}

/**
 * Auto-detects supported eval JSON formats.
 * @param {string} text
 * @param {string} filepath
 * @returns {{ tool: string, createdAt: string, cases: object[] }}
 */
export function parseEvalJson(text, filepath = 'unknown') {
  const data = parseJson(text, filepath);
  const serialized = JSON.stringify(data);
  if (Array.isArray(data?.cases)) {
    return parseGenericEvalJson(serialized, filepath);
  }
  if (Array.isArray(data?.results)) {
    return parsePromptfooJson(serialized, filepath);
  }
  throw new Error(`Malformed eval JSON in file ${filepath}: expected generic cases[] or promptfoo results[].`);
}
