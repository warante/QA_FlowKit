function sanitizeRunIdPart(value) {
  return (
    String(value || 'anon')
      .trim()
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'anon'
  );
}

function formatRunIdTimestamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace('.', '');
}

export function buildRunId(rfId, { now = new Date(), disambiguator = 0 } = {}) {
  const stamp = formatRunIdTimestamp(now);
  const suffix = disambiguator > 0 ? `-${disambiguator}` : '';
  return `${sanitizeRunIdPart(rfId)}-${stamp}${suffix}`;
}
