export const DEMO_RF_ID = 'RF-101';

export const DEMO_REQUIRED_ARTIFACTS = [
  'qa-ai-output/requirement-analysis.md',
  'qa-ai-output/normalized-requirements.md',
  'features/functional/RF-101-TC-001-login.feature',
  'qa-ai-output/traceability-matrix.md',
  'qa-ai-output/pr-summary.md'
];

export const DEMO_WORKFLOW_PHASES = ['intake', 'normalize', 'gherkin', 'traceability', 'pr'];

export const DEMO_SCRIPT_SECTIONS = [
  '## Goal',
  '## Prerequisites',
  '## Recording setup',
  '## Scene 1',
  '## Scene 2',
  '## Scene 3',
  '## Scene 4',
  '## Scene 5',
  '## Closing',
  '## Replay without recording'
];

export const DEMO_TRANSCRIPT_SECTIONS = ['## Alt text', '## Captions', '## Static fallback', '## Claims to avoid'];

export const DEMO_PUBLIC_PATHS = [
  'docs/qa-ai/demo.md',
  'docs/qa-ai/demo-script.md',
  'docs/qa-ai/demo-transcript.md',
  'docs/qa-ai/demo.v1.json',
  'docs/qa-ai/media/qa-flowkit-rf101-demo.mp4',
  'docs/qa-ai/media/qa-flowkit-rf101-demo.gif',
  'docs/qa-ai/media/qa-flowkit-rf101-demo-thumbnail.png',
  'docs/qa-ai/media/qa-flowkit-rf101-demo.en.vtt',
  'docs/qa-ai/media/qa-flowkit-rf101-demo.es.vtt',
  'test/fixtures/quick-path/requirements/RF-101-login.md',
  '.github/scripts/run-quick-path-validation.mjs'
];

export const DEMO_FORBIDDEN_CLAIM_PATTERNS = [
  /\b(?:creates?|updates?|writes?) (?:to )?(?:Jira|TestRail|Zephyr|Xray)\b/i,
  /\b(?:the )?(?:AI|model|LLM) (?:automatically|will) (?:run|execute|publish)\b/i,
  /\b100%\s+(?:secure|safe|coverage)\b/i,
  /\bguarantee(?:s|d)?\s+(?:security|productivity|quality)\b/i
];
