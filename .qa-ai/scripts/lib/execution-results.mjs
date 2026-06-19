import { caseIdPattern, normalizeId } from './gherkin-validate.mjs';

/**
 * Extracts CDATA or clean error message details from XML failure/error/skipped nodes.
 * @param {string} attributesStr
 * @param {string} bodyStr
 * @returns {string}
 */
function extractXmlMessage(attributesStr, bodyStr) {
  let msg = '';
  if (attributesStr) {
    const attrMatch = /message\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attributesStr);
    if (attrMatch) {
      msg = attrMatch[1] || attrMatch[2] || '';
    }
  }
  if (bodyStr) {
    const cdataMatch = /<!\[CDATA\[([\s\S]*?)\]\]>/i.exec(bodyStr);
    const bodyText = cdataMatch ? cdataMatch[1] : bodyStr;
    const cleanBodyText = bodyText.replace(/<[^>]*>/g, '').trim();
    if (cleanBodyText) {
      return msg ? `${msg}\n${cleanBodyText}` : cleanBodyText;
    }
  }
  return msg;
}

/**
 * Parses JUnit XML results into a normalized structure.
 * @param {string} text
 * @param {string} filepath
 * @returns {{ cases: Array<{ id: string, name: string, 'classname/uri': string, classname: string, status: 'passed'|'failed'|'skipped', durationMs: number, message: string }> }}
 */
export function parseJUnitXml(text, filepath = 'unknown') {
  if (typeof text !== 'string') {
    throw new Error(`Invalid XML input for file: ${filepath}`);
  }
  if (!text.trim().startsWith('<')) {
    throw new Error(`Malformed XML in file ${filepath}: does not start with '<'`);
  }

  try {
    const cases = [];
    const testcaseRegex = /<testcase\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/gi;
    let match;

    while ((match = testcaseRegex.exec(text)) !== null) {
      const attrsStr = match[1];
      const bodyStr = match[2] || '';

      const attrs = {};
      const attrRegex = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
        attrs[attrMatch[1]] = attrMatch[2] || attrMatch[3] || '';
      }

      if (!attrs.name) {
        continue;
      }

      let status = 'passed';
      let message = '';

      const failureMatch = /<failure\s*([^>]*?)(?:\/>|>([\s\S]*?)<\/failure>)/i.exec(bodyStr);
      const errorMatch = /<error\s*([^>]*?)(?:\/>|>([\s\S]*?)<\/error>)/i.exec(bodyStr);
      const skippedMatch = /<skipped\s*([^>]*?)(?:\/>|>([\s\S]*?)<\/skipped>)/i.exec(bodyStr);

      if (failureMatch) {
        status = 'failed';
        message = extractXmlMessage(failureMatch[1], failureMatch[2]);
      } else if (errorMatch) {
        status = 'failed';
        message = extractXmlMessage(errorMatch[1], errorMatch[2]);
      } else if (skippedMatch) {
        status = 'skipped';
        message = extractXmlMessage(skippedMatch[1], skippedMatch[2]);
      }

      const timeSec = parseFloat(attrs.time || '0');
      const durationMs = Number.isNaN(timeSec) ? 0 : Math.round(timeSec * 1000);

      cases.push({
        id: '',
        name: attrs.name,
        'classname/uri': attrs.classname || '',
        classname: attrs.classname || '',
        status,
        durationMs,
        message
      });
    }

    return { cases };
  } catch (err) {
    throw new Error(`Failed to parse JUnit XML file ${filepath}: ${err.message}`, { cause: err });
  }
}

/**
 * Parses Cucumber JSON results into a normalized structure.
 * @param {string} text
 * @param {string} filepath
 * @returns {{ cases: Array<{ id: string, name: string, 'classname/uri': string, uri: string, tags: string[], status: 'passed'|'failed'|'skipped', durationMs: number, message: string }> }}
 */
export function parseCucumberJson(text, filepath = 'unknown') {
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error(`Malformed Cucumber JSON in file ${filepath}: ${err.message}`, { cause: err });
  }

  if (!Array.isArray(data)) {
    throw new Error(`Malformed Cucumber JSON in file ${filepath}: top-level element is not an array`);
  }

  const cases = [];

  for (const feature of data) {
    if (!feature || typeof feature !== 'object') continue;
    const uri = feature.uri || '';
    const elements = feature.elements || [];

    for (const element of elements) {
      if (!element || typeof element !== 'object') continue;
      if (element.type !== 'scenario') continue;

      const name = element.name || '';
      const tags = Array.isArray(element.tags) ? element.tags.map((t) => t.name).filter(Boolean) : [];

      let status = 'passed';
      let message = '';
      let totalDurationNs = 0;
      let hasFailed = false;
      let hasSkipped = false;

      const steps = element.steps || [];
      for (const step of steps) {
        if (!step || typeof step !== 'object') continue;
        const result = step.result || {};
        const stepStatus = String(result.status || '').toLowerCase();

        if (typeof result.duration === 'number') {
          totalDurationNs += result.duration;
        }

        if (stepStatus === 'failed' || stepStatus === 'error') {
          hasFailed = true;
          if (!message && result.error_message) {
            message = result.error_message;
          }
        } else if (['skipped', 'pending', 'undefined', 'ambiguous'].includes(stepStatus)) {
          hasSkipped = true;
        }
      }

      if (hasFailed) {
        status = 'failed';
      } else if (hasSkipped) {
        status = 'skipped';
      }

      const durationMs = Math.round(totalDurationNs / 1000000);

      cases.push({
        id: '',
        name,
        'classname/uri': uri,
        uri,
        tags,
        status,
        durationMs,
        message
      });
    }
  }

  return { cases };
}

/**
 * Extracts unique test IDs from a normalized case structure using a configured pattern.
 * @param {object} caseObj
 * @param {RegExp|string} [idPattern]
 * @returns {string[]}
 */
export function extractTestIds(caseObj, idPattern = caseIdPattern) {
  if (!caseObj || typeof caseObj !== 'object') {
    return [];
  }
  const regex = typeof idPattern === 'string' ? new RegExp(idPattern, 'gi') : idPattern;
  const ids = new Set();

  const searchInString = (str) => {
    if (!str) return;
    const matches = str.matchAll(regex);
    for (const match of matches) {
      ids.add(normalizeId(match[0]));
    }
  };

  searchInString(caseObj.name);
  searchInString(caseObj.classname);
  searchInString(caseObj.uri);
  searchInString(caseObj['classname/uri']);

  if (Array.isArray(caseObj.tags)) {
    for (const tag of caseObj.tags) {
      searchInString(tag);
    }
  }

  return Array.from(ids);
}
