import { setTimeout } from 'node:timers/promises';
import { redactSecretsInText } from '../../../.qa-ai/scripts/lib/secret-patterns.mjs';

// npm can accept a publish before the version and its dist-tag reach read endpoints.
export async function waitForRegistryVisibility(
  version,
  distTag,
  { query, sleep = setTimeout, log = console.error, attempts = 20, intervalMs = 30000 } = {}
) {
  let diagnostic = '';
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = await query();
    let metadata;
    try {
      metadata = JSON.parse(result.stdout);
    } catch {
      // Keep failed/invalid responses visible rather than reporting only last="".
    }
    if (result.status === 0 && metadata?.version === version && metadata?.['dist-tags']?.[distTag] === version) {
      return metadata;
    }
    diagnostic = redactSecretsInText(
      [
        `status=${result.status}; version=${metadata?.version || '(missing)'}; ${distTag}=${metadata?.['dist-tags']?.[distTag] || '(missing)'}`,
        result.error?.message,
        result.stderr,
        !metadata ? result.stdout : ''
      ]
        .filter(Boolean)
        .join('\n')
    ).slice(0, 2000);
    log(`Registry visibility attempt ${attempt}/${attempts}: ${diagnostic}`);
    if (attempt < attempts) await sleep(intervalMs);
  }
  throw new Error(
    `npm registry did not expose ${version} with dist-tag ${distTag} after ${attempts} attempts. ${diagnostic}`
  );
}
