import crypto from 'node:crypto';
import path from 'node:path';
import { resolveRepoPath } from './utils.mjs';
import { redactValidatorDiagnostics } from './secret-patterns.mjs';

function digest(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function artifactUri(cwd, file) {
  if (typeof file !== 'string' || !file || [...file].some((char) => char.charCodeAt(0) < 32)) return null;
  if (redactValidatorDiagnostics(file) !== file) return null;
  // Accept only repository-relative paths, on either platform. Never publish external paths/URLs.
  const relative = file.replaceAll('\\', '/');
  if (path.posix.isAbsolute(relative) || path.win32.isAbsolute(file) || relative.includes(':')) return null;
  try {
    const resolved = resolveRepoPath(cwd, relative, { label: 'SARIF location' });
    const normalized = path.relative(cwd, resolved).replaceAll('\\', '/');
    if (!normalized) return null;
    return normalized.split('/').map(encodeURIComponent).join('/');
  } catch {
    return null;
  }
}

/** Serialize the same aggregate findings as validate-target --json, without rerunning validators. */
export function buildSarifReport(cwd, { ok, validators }, { executionSuccessful = true } = {}) {
  const rules = new Map();
  const results = [];
  for (const validator of validators) {
    const name = String(validator.name);
    const ruleId = `qa-flowkit/${encodeURIComponent(redactValidatorDiagnostics(name))}`;
    const findings = [...(validator.findings || [])];
    if (validator.status === 'failed' && !findings.some((finding) => finding.severity === 'error')) {
      findings.push({ severity: 'error', message: `${name} failed without an error diagnostic.` });
    }
    for (const finding of findings) {
      if (!rules.has(ruleId)) {
        rules.set(ruleId, { id: ruleId, shortDescription: { text: redactValidatorDiagnostics(name) } });
      }
      const message = redactValidatorDiagnostics(String(finding.message || 'Validation finding.'));
      const level =
        validator.blocking === false
          ? 'warning'
          : finding.severity === 'warning'
            ? 'warning'
            : finding.severity === 'error'
              ? 'error'
              : 'note';
      const uri = artifactUri(cwd, finding.file);
      const line = finding.line;
      results.push({
        ruleId,
        level,
        message: { text: message },
        ...(uri
          ? {
              locations: [
                {
                  physicalLocation: {
                    artifactLocation: { uri, uriBaseId: '%SRCROOT%' },
                    ...(Number.isSafeInteger(line) && line > 0 ? { region: { startLine: line } } : {})
                  }
                }
              ]
            }
          : {}),
        partialFingerprints: { 'qaFlowkit/v1': digest(JSON.stringify([ruleId, uri, level, message])) }
      });
    }
  }
  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'QA FlowKit',
            informationUri: 'https://github.com/warante/QA_FlowKit',
            rules: [...rules.values()]
          }
        },
        invocations: [{ executionSuccessful }],
        results,
        properties: { validationPassed: Boolean(ok) }
      }
    ]
  };
}
