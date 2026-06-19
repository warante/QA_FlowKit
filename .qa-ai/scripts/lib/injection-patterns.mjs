const patterns = [
  {
    id: 'ignore-previous-instructions',
    regex: /\bignore\s+(?:all\s+)?(?:previous|prior)\s+instructions\b/i
  },
  {
    id: 'disregard-rules',
    regex: /\bdisregard\b.*\brules\b/i
  },
  {
    id: 'role-rewrite',
    regex: /\byou\s+are\s+now\b/i
  },
  {
    id: 'system-prompt',
    regex: /\bsystem\s+prompt\b/i
  },
  {
    id: 'dangerous-rm',
    regex: /\brm\s+-rf\b/i
  },
  {
    id: 'curl-pipe-shell',
    regex: /\bcurl\b.*\|\s*(?:ba)?sh\b/i
  },
  {
    id: 'spanish-ignore-instructions',
    regex: /\bignora\s+las\s+instrucciones\b/i
  },
  {
    id: 'spanish-run-command',
    regex: /\bejecuta\s+este\s+comando\b/i
  }
];

function excerpt(line) {
  const text = line.trim().replace(/\s+/g, ' ');
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

export function injectionPatterns() {
  return patterns.map(({ id, regex }) => ({ id, source: regex.source, flags: regex.flags }));
}

export function scanText(text) {
  const findings = [];
  const lines = String(text || '')
    .replace(/\r/g, '')
    .split('\n');

  for (const [index, line] of lines.entries()) {
    for (const pattern of patterns) {
      if (pattern.regex.test(line)) {
        findings.push({
          line: index + 1,
          pattern: pattern.id,
          excerpt: excerpt(line)
        });
      }
    }
  }

  return findings;
}
