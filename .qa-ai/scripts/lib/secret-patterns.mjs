/**
 * Heuristic secret detection for QA artifacts (not a substitute for gitleaks).
 */
const patterns = [
  { name: 'private-key-block', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'npm-token', regex: /\bnpm_[A-Za-z0-9]{36,}\b/ },
  { name: 'github-token', regex: /\bghp_[A-Za-z0-9]{36,}\b/ },
  { name: 'aws-access-key', regex: /\bAKIA[0-9A-Z]{16}\b/ },
  {
    name: 'generic-api-key',
    regex: /\b(?:api[_-]?key|apikey|secret|password|passwd|token)\s*[:=]\s*['"]?[A-Za-z0-9+/=_-]{12,}/i
  },
  { name: 'bearer-token', regex: /\bBearer\s+[A-Za-z0-9._-]{20,}\b/i },
  { name: 'jwt', regex: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/ }
];

const allowlistSubstrings = [
  'CHANGE_ME',
  '<API-KEY>',
  '<TOKEN>',
  'your-token-here',
  'example.com',
  'password: <',
  'token: <'
];

function redactedExcerpt(line, regex) {
  return line.trim().replace(regex, '[REDACTED]').slice(0, 120);
}

export function redactSecretsInText(text) {
  let redacted = String(text || '');
  for (const { regex } of patterns) {
    redacted = redacted.replace(regex, '[REDACTED]');
  }
  return redacted;
}

export function redactValidatorDiagnostics(text, { maxLength = 4000 } = {}) {
  const raw = String(text || '');
  if (scanTextForSecrets(raw).length === 0) return raw.slice(0, maxLength);
  return redactSecretsInText(raw).slice(0, maxLength);
}

export function scanTextForSecrets(text, label = 'content') {
  const findings = [];
  const lines = String(text || '').split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (allowlistSubstrings.some((sample) => line.includes(sample))) continue;

    for (const { name, regex } of patterns) {
      if (regex.test(line)) {
        findings.push({
          label,
          line: index + 1,
          pattern: name,
          excerpt: redactedExcerpt(line, regex)
        });
      }
    }
  }

  return findings;
}

export async function scanPathsForSecrets(readFile, paths, cwd, relativeTo) {
  const findings = [];
  for (const filePath of paths) {
    let content;
    try {
      content = await readFile(filePath, 'utf8');
    } catch {
      continue;
    }
    const rel = relativeTo(cwd, filePath);
    findings.push(...scanTextForSecrets(content, rel));
  }
  return findings;
}
