import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectLegacyConfigSignals } from './config-legacy.mjs';
import { detectLegacyLayout } from './project-paths.mjs';
import { formatLegacyLayoutRecommendation } from './doctor/layout-checks.mjs';
import { loadQaAiConfig, parseSimpleYaml, pathExists } from './utils.mjs';

export { collectLegacyConfigSignals } from './config-legacy.mjs';

export const OLDEST_SUPPORTED_BETA = '0.5.0-beta.0';

export const USER_OWNED_PATHS = [
  'qa-ai.config.yaml',
  '.qa-ai/qa-ai.config.yaml',
  'qa-ai-output/',
  '.qa-ai/output/',
  'features/',
  '.qa-ai/features/',
  'tests/',
  '.qa-ai/tests/',
  'AGENTS.md',
  '.claude/',
  '.codex/',
  '.opencode/',
  '.cline/',
  '.continue/',
  '.aider.conf.yml',
  '.goose/',
  'GEMINI.md'
];

export const PRESERVED_FRAMEWORK_PATHS = ['.qa-ai/state/', '.qa-ai/config-profiles/'];

async function loadDetectAdapters(cwd) {
  const modulePath = path.join(cwd, '.qa-ai', 'scripts', 'lib', 'detect-adapters.mjs');
  if (!(await pathExists(modulePath))) return [];
  const { detectExistingAdapters } = await import(pathToFileURL(modulePath).href);
  return detectExistingAdapters(cwd);
}

export async function buildUpdatePlan({ cwd = process.cwd(), packageRoot }) {
  const packageJson = JSON.parse(await fs.readFile(path.join(packageRoot, 'package.json'), 'utf8'));
  const configInfo = await loadQaAiConfig(cwd);
  const adaptersToSync = await loadDetectAdapters(cwd);
  const legacyConfigPath = path.join(cwd, 'qa-ai.config.yaml');
  const legacyConfigContent = configInfo.legacyConfigPresent ? await fs.readFile(legacyConfigPath, 'utf8') : '';
  const rawConfig = configInfo.exists ? parseSimpleYaml(configInfo.content, configInfo.relPath) : {};
  const legacyRawConfig = legacyConfigContent ? parseSimpleYaml(legacyConfigContent, 'qa-ai.config.yaml') : {};
  const legacyConfigKeys = [
    ...new Set([...collectLegacyConfigSignals(rawConfig), ...collectLegacyConfigSignals(legacyRawConfig)])
  ];
  const configConflicts = [];
  const legacyLayoutDetected = await detectLegacyLayout(cwd, configInfo);
  const dualConfigDetected = Boolean(configInfo.dualConfig);
  const legacyLayoutRecommendations = legacyLayoutDetected ? formatLegacyLayoutRecommendation(cwd, configInfo) : [];

  return {
    schemaVersion: 1,
    oldestSupportedBeta: OLDEST_SUPPORTED_BETA,
    targetPackageVersion: packageJson.version,
    action: 'update',
    preservedPaths: [...PRESERVED_FRAMEWORK_PATHS],
    replacedPaths: [
      '.qa-ai/ framework payload from the installed package (scripts, contracts, agents, rules, presets, templates, packaged adapters)'
    ],
    userOwnedPaths: [...USER_OWNED_PATHS],
    adaptersToSync,
    legacyConfigKeys,
    legacyLayoutDetected,
    dualConfigDetected,
    legacyLayoutRecommendations,
    configConflicts,
    destructiveChanges: [
      'Deletes obsolete files that lived only inside .qa-ai/ before the update.',
      'Does not rewrite qa-ai.config.yaml, .qa-ai/qa-ai.config.yaml, features/, qa-ai-output/ or root adapter files unless init is run with --force.'
    ],
    rollbackGuidance: [
      'Back up qa-ai.config.yaml (or .qa-ai/qa-ai.config.yaml), .qa-ai/state/, .qa-ai/config-profiles/, features/ and qa-ai-output/ before updating.',
      'If update fails after the framework folder is removed, restore .qa-ai/state/ and .qa-ai/config-profiles/ from backup, reinstall the previous package version, and rerun update.',
      'Review the plan first with: npx qa-flowkit update --dry-run --json'
    ]
  };
}

export function formatUpdatePlan(plan) {
  const lines = [
    'QA FlowKit update plan (dry run)',
    `Target package version: ${plan.targetPackageVersion}`,
    `Oldest supported beta source: ${plan.oldestSupportedBeta}`,
    '',
    'Preserved inside the repository:',
    ...plan.preservedPaths.map((item) => `  - ${item}`),
    '',
    'User-owned paths left unchanged by default:',
    ...plan.userOwnedPaths.map((item) => `  - ${item}`),
    '',
    'Replaced from the installed package:',
    ...plan.replacedPaths.map((item) => `  - ${item}`),
    '',
    `Adapters to refresh without overwrite: ${plan.adaptersToSync.length > 0 ? plan.adaptersToSync.join(', ') : '(none detected)'}`
  ];

  if (plan.legacyLayoutDetected || plan.dualConfigDetected) {
    lines.push('', 'Legacy layout recommendations:');
    for (const item of plan.legacyLayoutRecommendations) {
      lines.push(`  - ${item}`);
    }
  }

  if (plan.legacyConfigKeys.length > 0) {
    lines.push('', 'Legacy configuration keys detected:', ...plan.legacyConfigKeys.map((item) => `  - ${item}`));
    lines.push(
      '  Normalize to requirements.inferredAcceptanceCriteria when convenient; see docs/qa-ai/beta-to-1.0-migration.md.'
    );
  }
  if (plan.configConflicts.length > 0) {
    lines.push(
      '',
      'Configuration conflicts that will fail doctor/validate-config:',
      ...plan.configConflicts.map((item) => `  - ${item}`)
    );
  }
  lines.push('', 'Rollback:', ...plan.rollbackGuidance.map((item) => `  - ${item}`));
  return lines.join('\n');
}
