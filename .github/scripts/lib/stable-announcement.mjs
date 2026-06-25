export const ANNOUNCEMENT_REQUIRED_LINKS = [
  'beta-to-1.0-migration.md',
  'examples/README.md',
  'getting-started.md',
  'public-contracts.md',
  'stability-policy-stable.md'
];

export const ANNOUNCEMENT_REQUIRED_SECTIONS = [
  '## Summary',
  '## Install',
  '## Upgrade',
  '## Examples',
  '## Known limitations',
  '## Feedback'
];

export const STABLE_PRIMARY_COMMANDS = ['npx qa-flowkit@latest', 'npx qa-flowkit init'];

export const STABLE_LIFECYCLE_EN = /\*\*Stable\*\*/i;
export const STABLE_LIFECYCLE_ES = /\*\*Estable\*\*/i;
export const BETA_LIFECYCLE_EN = /\*\*Beta\*\*/i;
export const BETA_LIFECYCLE_ES = /\*\*Beta\*\*/i;

export const UNSUPPORTED_CLAIM_PATTERNS = [
  /\b100%\s+(?:secure|safe|coverage)\b/i,
  /\bguarantee(?:s|d)?\s+(?:security|productivity|quality)\b/i,
  /\bzero\s+(?:bugs|defects)\b/i
];
