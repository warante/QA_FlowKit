import { spawnSync } from 'node:child_process';
import { normalizeId } from './gherkin-validate.mjs';

const RF_PATTERN = /RF[-_]?\d+/gi;

export function extractRFIdsFromText(text) {
  if (!text) return [];
  const matches = text.match(RF_PATTERN) || [];
  return [...new Set(matches.map((m) => normalizeId(m)))];
}

export function extractRFIdsFromCommit(commitMessage) {
  return extractRFIdsFromText(commitMessage);
}

export function extractRFIdsFromPR(prData) {
  const rfIds = new Set();

  if (prData.title) {
    for (const rf of extractRFIdsFromText(prData.title)) {
      rfIds.add(rf);
    }
  }

  if (prData.body) {
    for (const rf of extractRFIdsFromText(prData.body)) {
      rfIds.add(rf);
    }
  }

  if (prData.commits) {
    for (const commit of prData.commits) {
      for (const rf of extractRFIdsFromCommit(commit.message || '')) {
        rfIds.add(rf);
      }
    }
  }

  return Array.from(rfIds);
}

export function getRecentCommits(cwd, options = {}) {
  const { since = '7 days ago', branch = 'HEAD' } = options;

  const result = spawnSync('git', ['log', '--format=%H|%s|%ai', `--since=${since}`, branch], {
    cwd,
    encoding: 'utf8',
    shell: false,
    timeout: 30000
  });

  if (result.error || result.status !== 0) {
    return { commits: [], errors: [`Git log failed: ${result.error?.message || result.stderr}`] };
  }

  const commits = result.stdout
    .trim()
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const [hash, message, date] = line.split('|');
      return { hash, message, date };
    });

  return { commits, errors: [] };
}

export function getPRData(cwd, prNumber) {
  const result = spawnSync(
    'gh',
    ['pr', 'view', String(prNumber), '--json', 'title,body,mergeCommit,mergedAt,commits'],
    {
      cwd,
      encoding: 'utf8',
      shell: false,
      timeout: 30000
    }
  );

  if (result.error) {
    return { prData: null, errors: [`GitHub CLI failed: ${result.error.message}`] };
  }

  if (result.status !== 0) {
    return { prData: null, errors: [`GitHub CLI failed with status ${result.status}: ${result.stderr}`] };
  }

  try {
    const prData = JSON.parse(result.stdout);
    return { prData, errors: [] };
  } catch (error) {
    return { prData: null, errors: [`Failed to parse PR data: ${error.message}`] };
  }
}

export function buildCIMetadata(rfIds, prData, commitData) {
  return {
    rfIds,
    lastValidated: prData?.mergedAt || commitData?.date || new Date().toISOString(),
    validatedBy: prData?.mergeCommit?.oid || commitData?.hash || 'unknown',
    validationType: prData ? 'pull-request' : 'commit',
    prNumber: prData?.number || null,
    prTitle: prData?.title || null,
    commitMessage: commitData?.message || null
  };
}
