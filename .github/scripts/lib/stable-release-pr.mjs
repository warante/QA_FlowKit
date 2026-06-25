export const STABLE_TARGET_VERSION = '1.0.0';

const STABLE_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export function isStableReleaseVersion(version) {
  return STABLE_VERSION_PATTERN.test(String(version || '').trim());
}

export function expectedReleasePrTitle(version = STABLE_TARGET_VERSION) {
  return `chore: release ${version}`;
}

export const RELEASE_PR_REVIEW_PATHS = [
  'package.json',
  '.release-please-manifest.json',
  'CHANGELOG.md',
  'plugin/.claude-plugin/plugin.json',
  '.claude-plugin/marketplace.json'
];

export const RELEASE_NOTES_REQUIRED_LINKS = ['beta-to-1.0-migration.md', 'public-contracts.md', 'stability-policy.md'];
