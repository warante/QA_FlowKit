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
  { name: 'jwt', regex: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/ },
  { name: 'email-address', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/ }
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

function globalize(regex) {
  const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
  return new RegExp(regex.source, flags);
}

function redactedExcerpt(line, regex) {
  return line.trim().replace(globalize(regex), '[REDACTED]').slice(0, 120);
}

export function redactSecretsInText(text) {
  let redacted = String(text || '');
  for (const { regex } of patterns) {
    redacted = redacted.replace(globalize(regex), '[REDACTED]');
  }
  return redacted;
}

export function redactValidatorDiagnostics(text, { maxLength = 4000 } = {}) {
  const raw = String(text || '');
  if (scanTextForSecrets(raw).length === 0) return raw.slice(0, maxLength);
  return redactSecretsInText(raw).slice(0, maxLength);
}

function matchIsAllowlisted(matchedText) {
  return allowlistSubstrings.some((sample) => matchedText.includes(sample));
}

export function scanTextForSecrets(text, label = 'content') {
  const findings = [];
  const lines = String(text || '').split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    for (const { name, regex } of patterns) {
      const globalRegex = globalize(regex);
      let match;
      while ((match = globalRegex.exec(line)) !== null) {
        if (matchIsAllowlisted(match[0])) continue;
        findings.push({
          label,
          line: index + 1,
          pattern: name,
          excerpt: redactedExcerpt(line, regex)
        });
        break;
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
