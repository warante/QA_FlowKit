import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function readText(relPath) {
  return readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Semantic Markdown Content', () => {
  it('gherkin-test-design-agent supports both layouts', () => {
    const c = readText('.qa-ai/agents/gherkin-test-design-agent.md');
    assert.ok(c.toLowerCase().includes('multiple-per-file'));
    assert.ok(c.toLowerCase().includes('one-per-file'));
  });

  it('requirements-normalization-agent uses edge-case, not boundary as type', () => {
    const c = readText('.qa-ai/agents/requirements-normalization-agent.md');
    assert.ok(c.toLowerCase().includes('edge-case'));
    const lines = c.split('\n').filter((l) => l.includes('|'));
    for (const line of lines) {
      assert.ok(!line.toLowerCase().includes('| boundary '), `Found boundary type: ${line.trim()}`);
    }
  });

  it('test-management agents use testrail.projectName', () => {
    for (const f of ['test-management-coverage-agent.md', 'test-management-sync-agent.md']) {
      const c = readText(`.qa-ai/agents/${f}`);
      assert.ok(c.includes('testrail.projectName'), `${f}: missing testrail.projectName`);
      assert.ok(!c.includes('tools.testManagementProject'), `${f}: uses invalid tools.testManagementProject`);
    }
  });

  it('ui-implementation-agent blocks on unknown selectors', () => {
    const c = readText('.qa-ai/agents/ui-implementation-agent.md');
    assert.ok(c.toLowerCase().includes('blocked'), 'missing blocked behavior');
    assert.ok(!c.includes('TODO: replace with stable selector'), 'uses placeholder selectors');
    assert.ok(c.toLowerCase().includes('scaffold-only'), 'missing scaffold-only labeling');
  });

  it('api-testing-agent blocks on missing contract', () => {
    const c = readText('.qa-ai/agents/api-testing-agent.md');
    assert.ok(c.toLowerCase().includes('blocked'), 'missing blocked behavior');
  });

  it('accessibility specialist does not recommend editing active.md', () => {
    const c = readText('.qa-ai/agents/specialists/available/accessibility.md');
    assert.ok(!c.toLowerCase().includes('add manually'), 'recommends manual active.md edit');
  });

  it('release-gate-agent rejects scaffold-only evidence', () => {
    const c = readText('.qa-ai/agents/release-gate-agent.md');
    assert.ok(
      c.toLowerCase().includes('scaffold-only') || c.toLowerCase().includes('unevidenced'),
      'missing scaffold rejection'
    );
  });

  it('qa-workflow-orchestrator mentions guidance contract', () => {
    const c = readText('.qa-ai/agents/qa-workflow-orchestrator.md');
    assert.ok(c.toLowerCase().includes('agent-guidance'), 'missing agent-guidance reference');
  });

  it('agents README documents semantic contract and prohibits manual active.md edits', () => {
    const c = readText('.qa-ai/agents/README.md').toLowerCase();
    assert.ok(c.includes('agent-guidance'), 'missing contract documentation');
    assert.ok(
      c.includes('never edit') || c.includes('do not edit') || c.includes('do not manually edit'),
      'missing edit prohibition'
    );
    assert.ok(c.includes('artifact policy') || c.includes('artifactpolicy'), 'missing artifact policy docs');
  });

  it('all 42 specialists have Artifact and handoff policy section', () => {
    const contract = JSON.parse(readText('.qa-ai/contracts/agent-guidance.v1.json'));
    let missing = 0;
    for (const e of contract.guidance) {
      if (e.category !== 'specialist') continue;
      const c = readText(e.path).toLowerCase();
      if (!c.includes('artifact and handoff policy') && !c.includes('artefact and handoff policy')) {
        missing++;
      }
    }
    assert.equal(missing, 0, `${missing} specialists missing Artifact and handoff policy section`);
  });

  it('specialists do not use non-canonical evidence types in policy sections', () => {
    const canonical = [
      'feature',
      'automation-script',
      'manual-charter',
      'test-plan',
      'technical-review',
      'residual-risk'
    ];
    const contract = JSON.parse(readText('.qa-ai/contracts/agent-guidance.v1.json'));
    for (const e of contract.guidance) {
      if (e.category !== 'specialist') continue;
      const c = readText(e.path);
      const sectionMatch = c.match(/## Artifact and handoff policy[^\n]*\n([\s\S]*?)(?=\n## |\n---|\n*$)/);
      if (!sectionMatch) continue;
      const section = sectionMatch[0].toLowerCase();
      const nonCanonical = [
        'boundary',
        'integration-test',
        'e2e-test',
        'performance-test',
        'security-test',
        'accessibility-test',
        'compliance-test',
        'exploratory-test',
        'load-test',
        'visual-test',
        'contract-test'
      ];
      for (const nc of nonCanonical) {
        if (section.includes(nc) && !canonical.some((can) => section.includes(can))) {
          assert.fail(`${e.path}: uses non-canonical evidence-like term "${nc}"`);
        }
      }
    }
  });

  it('gherkin-constants defines edge-case', () => {
    const c = readText('.qa-ai/scripts/lib/gherkin-constants.mjs');
    assert.ok(c.includes("'edge-case'"), 'edge-case missing from gherkin constants');
  });

  it('gherkin-constants does not include boundary as a type', () => {
    const c = readText('.qa-ai/scripts/lib/gherkin-constants.mjs');
    const ghValues = c.match(/GHERKIN_TYPE_VALUES[^)]+\)/s)?.[0] || '';
    assert.ok(!ghValues.includes("'boundary'"), 'boundary must not be in GHERKIN_TYPE_VALUES');
  });

  it('automation-feasibility-agent classifies per Test ID/scenario', () => {
    const c = readText('.qa-ai/agents/automation-feasibility-agent.md').toLowerCase();
    assert.ok(c.includes('test id') || c.includes('per scenario'), 'missing Test ID/scenario classification');
  });

  it('pr-agent uses scenarios/Test IDs not flat features', () => {
    const c = readText('.qa-ai/agents/pr-agent.md').toLowerCase();
    assert.ok(c.includes('scenarios') || c.includes('test ids'), 'missing scenario/Test ID counts');
  });

  it('requirements normalization example IDs are sequential', () => {
    const c = readText('.qa-ai/agents/requirements-normalization-agent.md');
    const ids = [];
    const re = /CR-RF-\[ID\]-(\d+)/g;
    let m;
    while ((m = re.exec(c)) !== null) ids.push(parseInt(m[1], 10));
    assert.ok(ids.length >= 2, 'expected at least two example Criterion IDs');
    for (let i = 0; i < ids.length - 1; i++) {
      assert.equal(ids[i + 1], ids[i] + 1, `Criterion IDs must be sequential: ${ids.join(', ')}`);
    }
  });

  it('test-management-sync-agent distinguishes proposal-only from governed', () => {
    const c = readText('.qa-ai/agents/test-management-sync-agent.md');
    assert.ok(c.includes('proposal-only'), 'missing proposal-only');
    assert.ok(c.includes('governed'), 'missing governed');
  });

  it('read-only mutation positive: delete/overwrite evaluated input triggers finding', async () => {
    const { validateMarkdownSemantics } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'agent-guidance-contract.mjs')).href
    );
    const entry = { path: 'ro.md', permissions: { localWrite: false, externalWrite: false }, category: 'phase' };
    const findings = validateMarkdownSemantics(entry, 'Delete the feature file and overwrite it with new content.');
    const codes = new Set(findings.map((f) => f.code));
    assert.ok(codes.has('AGENT_READONLY_MUTATION'), 'must flag delete/overwrite of evaluated source');
  });

  it('read-only mutation negative: negated statement does not trigger finding', async () => {
    const { validateMarkdownSemantics } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'agent-guidance-contract.mjs')).href
    );
    const entry = { path: 'ro-safe.md', permissions: { localWrite: false, externalWrite: false }, category: 'phase' };
    const findings = validateMarkdownSemantics(
      entry,
      'Do not delete the existing feature files. Never rename contracts.'
    );
    const codes = new Set(findings.map((f) => f.code));
    assert.ok(!codes.has('AGENT_READONLY_MUTATION'), 'must not flag negated mutation statements');
  });

  it('M18: scanTextForSecrets detects and redacts secrets without exposing values', async () => {
    const { scanTextForSecrets } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'secret-patterns.mjs')).href
    );

    const findings = scanTextForSecrets('npm_NxaBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789ab', 'test');
    assert.ok(findings.length > 0, 'must detect npm token');
    assert.ok(
      findings.every((f) => !f.excerpt.includes('NxaBcDeF')),
      'excerpt must be redacted'
    );

    const awsFindings = scanTextForSecrets('AKIAIOSFODNN7EXAMPLE', 'test');
    assert.ok(awsFindings.length > 0, 'must detect AWS key');
    assert.ok(
      awsFindings.every((f) => !f.excerpt.includes('AKIAIO')),
      'AWS excerpt must be redacted'
    );

    const jwtFindings = scanTextForSecrets(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9nXk',
      'test'
    );
    assert.ok(jwtFindings.length > 0, 'must detect JWT');
  });

  it('M18: validator findings never echo secret values in messages', async () => {
    const { scanTextForSecrets } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'secret-patterns.mjs')).href
    );

    const secretsText = `npm_NxaBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789ab\nAKIAIOSFODNN7EXAMPLE\neyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.test`;
    const findings = scanTextForSecrets(secretsText, 'secrets-test');

    const sensitivePatterns = [/NxaBcDeF/, /AKIAIOSFODNN/, /eyJhbGciOi/];
    for (const finding of findings) {
      const combined = JSON.stringify(finding);
      for (const pattern of sensitivePatterns) {
        assert.ok(!pattern.test(combined), `finding must not contain secret value: ${pattern}`);
      }
    }
    assert.ok(findings.length >= 3, 'must detect all secret patterns');
  });

  it('M18: allowlisted placeholders do not trigger secret detection', async () => {
    const { scanTextForSecrets } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'secret-patterns.mjs')).href
    );

    const placeholders = [
      'api_key=CHANGE_ME',
      'token: <API-KEY>',
      'secret: <TOKEN>',
      'bearer your-token-here',
      'password: <placeholder>'
    ];

    for (const text of placeholders) {
      const findings = scanTextForSecrets(text, 'placeholder');
      assert.equal(findings.length, 0, `placeholder must not trigger detection: "${text}"`);
    }
  });

  it('M18: redactSecretsInText replaces sensitive values with [REDACTED]', async () => {
    const { redactSecretsInText } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'secret-patterns.mjs')).href
    );

    const input = 'Use api_key: sk-proj-12345678901234567890 in your request.';
    const redacted = redactSecretsInText(input);
    assert.ok(!redacted.includes('sk-proj-12345678901234567890'), 'secret must be redacted');
    assert.ok(redacted.includes('[REDACTED]'), 'output must contain [REDACTED] marker');
  });
});
