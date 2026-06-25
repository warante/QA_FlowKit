export function parsePureJsonStdout(stdout, label = 'command') {
  const text = String(stdout || '').trim();
  if (!text) {
    throw new Error(`${label} produced empty stdout; expected pure JSON.`);
  }
  if (!text.startsWith('{') && !text.startsWith('[')) {
    throw new Error(`${label} stdout is not pure JSON:\n${text}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} stdout is not valid JSON (${error.message}):\n${text}`, { cause: error });
  }
}

export function assertRequiredKeys(value, keys, label = 'payload') {
  const missing = keys.filter((key) => !(key in value));
  if (missing.length > 0) {
    throw new Error(`${label} is missing required keys: ${missing.join(', ')}`);
  }
}

export function assertSortedBy(value, key, compareFn = (a, b) => String(a).localeCompare(String(b))) {
  if (!Array.isArray(value)) {
    throw new Error(`Expected array at ${key}`);
  }
  const extracted = value.map((item) => (typeof item === 'object' && item ? item[key] : item));
  const sorted = [...extracted].sort(compareFn);
  const actual = extracted.join('\0');
  const expected = sorted.join('\0');
  if (actual !== expected) {
    throw new Error(`Array at ${key} is not deterministically ordered.`);
  }
}

export function assertStderrEmpty(stderr, label = 'command') {
  if (String(stderr || '').trim()) {
    throw new Error(`${label} wrote to stderr on success:\n${stderr}`);
  }
}
