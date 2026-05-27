#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseSimpleYaml, readText } from './lib/utils.mjs';

const sourceRoot = process.cwd();
const node = process.execPath;

function run(cwd, args, { expectFailure = false } = {}) {
  const result = spawnSync(node, args, {
    cwd,
    encoding: 'utf8',
    shell: false
  });
  const failed = result.status !== 0;
  if (expectFailure ? !failed : failed) {
    throw new Error([
      `Command ${expectFailure ? 'succeeded unexpectedly' : 'failed'}: node ${args.join(' ')}`,
      result.stdout,
      result.stderr
    ].filter(Boolean).join('\n'));
  }
  return result;
}

async function copyFramework(targetRoot) {
  await fs.cp(path.join(sourceRoot, '.qa-ai'), path.join(targetRoot, '.qa-ai'), {
    recursive: true,
    force: false
  });
}

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-ai-starter-smoke-'));
  let unsafeRoot = null;
  let defaultTarget = null;
  let geminiTarget = null;
  let qaContextTarget = null;
  let optionalDocsTarget = null;
  let strictTarget = null;
  let quickStrictTarget = null;
  let importProfileTarget = null;
  let validatorTarget = null;
  try {
    await copyFramework(tempRoot);

    run(tempRoot, [
      '.qa-ai/scripts/init.mjs',
      '--preset', 'webdriverio-playwright-api',
      '--interface-language', 'en',
      '--gherkin-language', 'en',
      '--ui-framework', 'webdriverio',
      '--api-framework', 'playwright-api',
      '--adapters', 'generic'
    ]);

    const config = parseSimpleYaml(await readText(path.join(tempRoot, 'qa-ai.config.yaml')));
    if (config.automation.ui.specsPath !== 'tests/wdio/specs') {
      throw new Error(`Expected preset UI path tests/wdio/specs, got ${config.automation.ui.specsPath}`);
    }
    if (config.automation.api.specsPath !== 'tests/api/specs') {
      throw new Error(`Expected preset API path tests/api/specs, got ${config.automation.api.specsPath}`);
    }

    run(tempRoot, [
      '.qa-ai/scripts/config.mjs',
      '--export', '.qa-ai/config-profiles/team.yaml'
    ]);
    importProfileTarget = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-ai-starter-import-'));
    await copyFramework(importProfileTarget);
    await fs.mkdir(path.join(importProfileTarget, '.qa-ai/config-profiles'), { recursive: true });
    await fs.copyFile(
      path.join(tempRoot, '.qa-ai/config-profiles/team.yaml'),
      path.join(importProfileTarget, '.qa-ai/config-profiles/team.yaml')
    );
    run(importProfileTarget, [
      '.qa-ai/scripts/config.mjs',
      '--import', '.qa-ai/config-profiles/team.yaml'
    ]);
    const importedConfig = parseSimpleYaml(await readText(path.join(importProfileTarget, 'qa-ai.config.yaml')));
    if (importedConfig.automation.ui.specsPath !== 'tests/wdio/specs') {
      throw new Error(`Imported config did not preserve UI specs path, got ${importedConfig.automation.ui.specsPath}`);
    }
    const expectedImportPaths = [
      '.qa-ai/agents/specialists/active.md',
      'features',
      'qa-ai-output',
      'tests/wdio/specs',
      'tests/api/specs'
    ];
    for (const relPath of expectedImportPaths) {
      try {
        await fs.access(path.join(importProfileTarget, relPath));
      } catch {
        throw new Error(`Config import did not create expected path: ${relPath}`);
      }
    }

    defaultTarget = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-ai-starter-default-'));
    await copyFramework(defaultTarget);
    run(defaultTarget, ['.qa-ai/scripts/init.mjs']);
    const expectedDefaultPaths = [
      '.opencode/README.md',
      '.opencode/commands/qa-init.md',
      'qa-ai.config.yaml',
      'qa-ai-output',
      'features'
    ];
    for (const relPath of expectedDefaultPaths) {
      try {
        await fs.access(path.join(defaultTarget, relPath));
      } catch {
        throw new Error(`Default init did not create expected path: ${relPath}`);
      }
    }
    const unexpectedDefaultPaths = [
      '.claude',
      '.codex',
      'qa-ai-output/requirement-analysis.md',
      'qa-ai-output/test-management-mapping.json'
    ];
    for (const relPath of unexpectedDefaultPaths) {
      try {
        await fs.access(path.join(defaultTarget, relPath));
        throw new Error(`Default init created unexpected path: ${relPath}`);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    run(defaultTarget, ['.qa-ai/scripts/doctor.mjs']);

    geminiTarget = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-ai-starter-gemini-'));
    await copyFramework(geminiTarget);
    run(geminiTarget, [
      '.qa-ai/scripts/init.mjs',
      '--adapters', 'gemini'
    ]);
    const expectedGeminiPaths = [
      'AGENTS.md',
      'GEMINI.md'
    ];
    for (const relPath of expectedGeminiPaths) {
      try {
        await fs.access(path.join(geminiTarget, relPath));
      } catch {
        throw new Error(`Gemini adapter init did not create expected path: ${relPath}`);
      }
    }

    qaContextTarget = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-ai-starter-context-'));
    await copyFramework(qaContextTarget);
    await fs.mkdir(path.join(qaContextTarget, 'qa-ai-knowledge'), { recursive: true });
    await fs.writeFile(
      path.join(qaContextTarget, 'qa-ai-knowledge', 'qa-process.md'),
      '# QA Process\n\nUse Jira, TestRail and English Gherkin.\n',
      'utf8'
    );
    run(qaContextTarget, [
      '.qa-ai/scripts/init.mjs',
      '--qa-context', 'qa-ai-knowledge',
      '--no-adapters'
    ]);
    const qaContextConfig = parseSimpleYaml(await readText(path.join(qaContextTarget, 'qa-ai.config.yaml')));
    if (qaContextConfig.knowledge.enabled !== true) {
      throw new Error('QA context init did not enable knowledge config.');
    }
    if (qaContextConfig.knowledge.sourcePath !== 'qa-ai-knowledge') {
      throw new Error(`QA context init did not preserve sourcePath, got ${qaContextConfig.knowledge.sourcePath}`);
    }

    optionalDocsTarget = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-ai-starter-docs-'));
    await copyFramework(optionalDocsTarget);
    run(optionalDocsTarget, [
      '.qa-ai/scripts/init.mjs',
      '--with-doc-templates',
      '--with-test-management-mapping',
      '--no-adapters'
    ]);
    const expectedOptionalDocPaths = [
      'qa-ai-output/requirement-analysis.md',
      'qa-ai-output/test-design-system.md',
      'qa-ai-output/test-design-proposal.md',
      'qa-ai-output/traceability-matrix.md',
      'qa-ai-output/test-management-mapping.json'
    ];
    for (const relPath of expectedOptionalDocPaths) {
      try {
        await fs.access(path.join(optionalDocsTarget, relPath));
      } catch {
        throw new Error(`Optional doc init did not create expected path: ${relPath}`);
      }
    }

    strictTarget = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-ai-starter-strict-'));
    await copyFramework(strictTarget);
    run(strictTarget, [
      '.qa-ai/scripts/init.mjs',
      '--preset', 'webdriverio-playwright-api',
      '--with-doc-templates',
      '--with-test-management-mapping',
      '--adapters', 'generic'
    ]);
    await fs.writeFile(path.join(strictTarget, 'wdio.conf.js'), 'export const config = {};\n', 'utf8');
    await fs.writeFile(path.join(strictTarget, 'playwright.config.js'), 'export default {};\n', 'utf8');
    run(strictTarget, ['.qa-ai/scripts/doctor.mjs', '--strict']);
    await fs.rm(path.join(strictTarget, 'qa-ai-output', 'traceability-matrix.md'), { force: true });
    run(strictTarget, ['.qa-ai/scripts/doctor.mjs', '--strict'], { expectFailure: true });

    quickStrictTarget = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-ai-starter-quick-strict-'));
    await copyFramework(quickStrictTarget);
    run(quickStrictTarget, [
      '.qa-ai/scripts/init.mjs',
      '--preset', 'manual-only',
      '--no-adapters'
    ]);
    await fs.writeFile(
      path.join(quickStrictTarget, 'qa-ai-output', 'requirement-analysis.md'),
      '# Requirement Analysis\n\nRF-101 login.\n',
      'utf8'
    );
    await fs.writeFile(
      path.join(quickStrictTarget, 'qa-ai-output', 'traceability-matrix.md'),
      '# Traceability Matrix\n\n| Requirement Source | RF | CA | Feature File | Test Management Case ID | Type | Priority | Automation Status | Automation File |\n|---|---|---|---|---|---|---|---|---|\n',
      'utf8'
    );
    await fs.writeFile(
      path.join(quickStrictTarget, 'qa-ai-output', 'pr-summary.md'),
      '# PR Summary\n\nQuick track summary.\n',
      'utf8'
    );
    run(quickStrictTarget, ['.qa-ai/scripts/doctor.mjs', '--strict']);

    validatorTarget = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-ai-starter-validators-'));
    await copyFramework(validatorTarget);
    run(validatorTarget, [
      '.qa-ai/scripts/init.mjs',
      '--preset', 'manual-only',
      '--no-adapters'
    ]);
    await fs.mkdir(path.join(validatorTarget, 'features', 'functional'), { recursive: true });
    await fs.writeFile(
      path.join(validatorTarget, 'features', 'functional', 'RF-101-TC-001-login.feature'),
      [
        '@priority:high @type:functional @manual:false @id:TC-001',
        'Feature: RF-101 Login',
        '',
        'Acceptance Criteria:',
        '- User can sign in with valid credentials.',
        '',
        'Scenario: RF-101 TC-001 Valid login',
        '  Given a registered user',
        '  When the user signs in',
        '  Then the dashboard is displayed',
        ''
      ].join('\n'),
      'utf8'
    );
    await fs.writeFile(
      path.join(validatorTarget, 'qa-ai-output', 'traceability-matrix.md'),
      [
        '# Traceability Matrix',
        '',
        '| Requirement Source | RF | CA | Feature File | Test Management Case ID | Type | Priority | Automation Status | Automation File |',
        '|---|---|---|---|---|---|---|---|---|',
        '| Jira | RF-101 | User can sign in with valid credentials. | features/functional/RF-101-TC-001-login.feature | TC-001 | functional | high | automated | tests/login.spec.js |',
        ''
      ].join('\n'),
      'utf8'
    );
    await fs.writeFile(path.join(validatorTarget, 'qa-ai-output', 'requirement-analysis.md'), '# Requirement Analysis\n\nRF-101 login.\n', 'utf8');
    await fs.writeFile(
      path.join(validatorTarget, 'qa-ai-output', 'test-design-proposal.md'),
      [
        '# Test Design Proposal (per RF / epic)',
        '',
        '## Official RF ID',
        'RF-101',
        '',
        '## Scope',
        'Login for RF-101.',
        '',
        '## Proposed tests',
        '| RF | CA | Test ID | Title | Type | Priority | Manual | Action |',
        '|---|---|---|---|---|---|---|---|',
        '| RF-101 | Valid login | TC-001 | Valid login | functional | high | false | create |',
        '',
        '## Existing tests to reuse',
        'None.',
        '',
        '## Existing tests requiring modification',
        'None.',
        '',
        '## New tests to create',
        'TC-001.',
        '',
        '## Ambiguities requiring user decision',
        'None.',
        '',
        '## Approval request',
        'Approve TC-001 feature generation.',
        ''
      ].join('\n'),
      'utf8'
    );
    await fs.writeFile(path.join(validatorTarget, 'qa-ai-output', 'testrail-coverage-analysis.md'), '# TestRail Coverage Analysis\n\nRF-101 coverage.\n', 'utf8');
    await fs.writeFile(path.join(validatorTarget, 'qa-ai-output', 'pr-summary.md'), '# PR Summary\n\nValidation pending.\n', 'utf8');
    await fs.writeFile(
      path.join(validatorTarget, 'qa-ai-output', 'testrail-sync-plan.md'),
      [
        '# TestRail Sync Plan',
        '',
        'Approval is required before any external write.',
        '',
        '| ID | Proposed action | Approval status | Target section | Notes |',
        '|---|---|---|---|---|',
        '| RF-101 | Review coverage | Pending approval | Login | Requirement coverage check |',
        '| TC-001 | Propose create/update only | Approval required | Login | Do not sync without approval |',
        ''
      ].join('\n'),
      'utf8'
    );
    await fs.writeFile(
      path.join(validatorTarget, 'qa-ai-output', 'test-management-mapping.json'),
      `${JSON.stringify({
        'TC-001': {
          externalId: 'C123',
          section: 'Login',
          suite: 'Regression',
          status: 'planned',
          lastReviewedAt: '2026-05-25',
          notes: 'Mapped from validated sync proposal.'
        }
      }, null, 2)}\n`,
      'utf8'
    );
    run(validatorTarget, ['.qa-ai/scripts/validate-features.mjs']);
    run(validatorTarget, ['.qa-ai/scripts/validate-traceability.mjs']);
    run(validatorTarget, ['.qa-ai/scripts/validate-target.mjs']);
    await fs.rm(path.join(validatorTarget, 'qa-ai-output', 'traceability-matrix.md'), { force: true });
    run(validatorTarget, ['.qa-ai/scripts/validate-target.mjs'], { expectFailure: true });
    await fs.writeFile(
      path.join(validatorTarget, 'qa-ai-output', 'traceability-matrix.md'),
      [
        '# Traceability Matrix',
        '',
        '| Requirement Source | RF | CA | Feature File | Test Management Case ID | Type | Priority | Automation Status | Automation File |',
        '|---|---|---|---|---|---|---|---|---|',
        '| Jira | RF-101 | User can sign in with valid credentials. | features/functional/RF-101-TC-001-login.feature | TC-001 | functional | high | automated | tests/login.spec.js |',
        ''
      ].join('\n'),
      'utf8'
    );
    await fs.writeFile(
      path.join(validatorTarget, 'qa-ai-output', 'traceability-matrix.md'),
      [
        '# Traceability Matrix',
        '',
        '| Requirement Source | RF | CA | Feature File | Test Management Case ID | Type | Priority | Automation Status | Automation File |',
        '|---|---|---|---|---|---|---|---|---|',
        '| Jira | RF-101 | User can sign in with valid credentials. | features/functional/RF-101-TC-001-login.feature | TC-001 | functional | high | automated | tests/login.spec.js |',
        '| Jira | RF-101 | User can sign in with valid credentials. | features/functional/RF-101-TC-001-login.feature | TC-001 | functional | high | automated | tests/login.spec.js |',
        ''
      ].join('\n'),
      'utf8'
    );
    run(validatorTarget, ['.qa-ai/scripts/validate-traceability.mjs'], { expectFailure: true });
    run(validatorTarget, ['.qa-ai/scripts/validate-sync-plan.mjs']);
    await fs.writeFile(
      path.join(validatorTarget, 'qa-ai-output', 'testrail-sync-plan.md'),
      [
        '# TestRail Sync Plan',
        '',
        'Approval is required before any external write.',
        '',
        '| ID | Proposed action | Approval status | Target section | Notes |',
        '|---|---|---|---|---|',
        '| TC-001 | Created in TestRail | Done | Login | Direct write claim |',
        '| TC-001 | Updated in TestRail | Done | Login | Duplicate direct write claim |',
        ''
      ].join('\n'),
      'utf8'
    );
    run(validatorTarget, ['.qa-ai/scripts/validate-sync-plan.mjs'], { expectFailure: true });
    await fs.writeFile(
      path.join(validatorTarget, 'qa-ai-output', 'testrail-sync-plan.md'),
      [
        '# TestRail Sync Plan',
        '',
        'Approval is required before any external write.',
        '',
        '| ID | Proposed action | Approval status | Target section | Notes |',
        '|---|---|---|---|---|',
        '| RF-101 | Review coverage | Pending approval | Login | Requirement coverage check |',
        '| TC-001 | Propose create/update only | Approval required | Login | Do not sync without approval |',
        ''
      ].join('\n'),
      'utf8'
    );
    await fs.writeFile(
      path.join(validatorTarget, 'qa-ai-output', 'test-management-mapping.json'),
      `${JSON.stringify({
        'TC-001': { externalId: 'C123' },
        'TC-002': { externalId: 'C123' }
      }, null, 2)}\n`,
      'utf8'
    );
    run(validatorTarget, ['.qa-ai/scripts/validate-sync-plan.mjs'], { expectFailure: true });
    run(validatorTarget, ['.qa-ai/scripts/validate-active-specialists.mjs']);

    const preservedPath = path.join(tempRoot, 'qa-ai-output', 'requirement-analysis.md');
    await fs.mkdir(path.dirname(preservedPath), { recursive: true });
    await fs.writeFile(preservedPath, 'USER EDIT\n', 'utf8');
    run(tempRoot, [
      '.qa-ai/scripts/init.mjs',
      '--preset', 'webdriverio-playwright-api',
      '--interface-language', 'en',
      '--gherkin-language', 'en',
      '--adapters', 'generic'
    ]);
    const preservedContent = await readText(preservedPath);
    if (preservedContent !== 'USER EDIT\n') {
      throw new Error('requirement-analysis.md was overwritten without --force.');
    }
    const activePath = path.join(tempRoot, '.qa-ai/agents/specialists/active.md');
    const activeContent = await readText(activePath);
    if (!activeContent.includes('Active QA AI Specialists')) {
      throw new Error('active.md was not regenerated from init config.');
    }

    unsafeRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-ai-starter-unsafe-'));
    await copyFramework(unsafeRoot);
    run(unsafeRoot, [
      '.qa-ai/scripts/init.mjs',
      '--preset', 'manual-only',
      '--set', 'traceability.matrixPath=../traceability.md',
      '--no-adapters'
    ], { expectFailure: true });
    run(unsafeRoot, [
      '.qa-ai/scripts/init.mjs',
      '--preset', 'manual-only',
      '--qa-context', '../qa-knowledge',
      '--no-adapters'
    ], { expectFailure: true });

    console.log('Smoke tests passed.');
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
    if (unsafeRoot) await fs.rm(unsafeRoot, { recursive: true, force: true });
    if (defaultTarget) await fs.rm(defaultTarget, { recursive: true, force: true });
    if (geminiTarget) await fs.rm(geminiTarget, { recursive: true, force: true });
    if (qaContextTarget) await fs.rm(qaContextTarget, { recursive: true, force: true });
    if (optionalDocsTarget) await fs.rm(optionalDocsTarget, { recursive: true, force: true });
    if (strictTarget) await fs.rm(strictTarget, { recursive: true, force: true });
    if (quickStrictTarget) await fs.rm(quickStrictTarget, { recursive: true, force: true });
    if (importProfileTarget) await fs.rm(importProfileTarget, { recursive: true, force: true });
    if (validatorTarget) await fs.rm(validatorTarget, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
