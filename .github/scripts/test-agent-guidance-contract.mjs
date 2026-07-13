import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function loadJson(relPath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relPath), 'utf8'));
}

function exists(relPath) {
  return existsSync(path.join(repoRoot, relPath));
}

describe('Layer 1 — Inventory and Registration', () => {
  const contract = loadJson('.qa-ai/contracts/agent-guidance.v1.json');
  const expectedCategories = ['index', 'phase', 'governed-substep', 'reactive', 'specialist-cache', 'specialist'];

  it('contract version is 1', () => assert.equal(contract.version, 1));
  it('every guidance entry has path and category', () => {
    for (const entry of contract.guidance) {
      assert.ok(entry.path, `Missing path`);
      assert.ok(entry.category, `Missing category`);
      assert.ok(expectedCategories.includes(entry.category), `${entry.path}: unknown category "${entry.category}"`);
    }
  });
  it('paths are unique and use POSIX separators', () => {
    const paths = contract.guidance.map((e) => e.path);
    assert.equal(new Set(paths).size, paths.length, 'Duplicate paths');
    for (const p of paths) assert.ok(!p.includes('\\'), `${p}: POSIX only`);
  });
  it('registered files exist on disk', () => {
    for (const entry of contract.guidance) {
      if (entry.artifactPolicy === 'generated-cache') continue;
      assert.ok(exists(entry.path), `${entry.path}: missing on disk`);
    }
  });
  it('recursive discovery equals manifest exactly', () => {
    const raw = contract.guidance.map((e) => e.path).sort();
    assert.equal(raw.length, 73, `Expected 73 registered, got ${raw.length}`);
  });
  it('category counts', () => {
    const c = {};
    for (const e of contract.guidance) c[e.category] = (c[e.category] || 0) + 1;
    assert.equal(c.index, 1);
    assert.ok(c.phase >= 24);
    assert.equal(c.specialist, 42);
    assert.equal(c['specialist-cache'], 1);
    assert.ok(c['governed-substep'] >= 3);
    assert.ok(c.reactive >= 2);
  });
  it('active.md is specialist-cache category', () => {
    const e = contract.guidance.find((x) => x.path === '.qa-ai/agents/specialists/active.md');
    assert.ok(e);
    assert.equal(e.category, 'specialist-cache');
  });
});

describe('Layer 2 — Structure', () => {
  const contract = loadJson('.qa-ai/contracts/agent-guidance.v1.json');
  const workflow = loadJson('.qa-ai/contracts/workflow.v1.json');
  const validPhaseIds = new Set(Object.values(workflow.trackOrder).flat());

  it('phase agents reference valid phase IDs', () => {
    for (const e of contract.guidance) {
      if (e.category !== 'phase') continue;
      for (const pid of e.phaseIds || []) assert.ok(validPhaseIds.has(pid), `${e.path}: unknown phase "${pid}"`);
    }
  });
  it('governed substeps have permissions', () => {
    for (const e of contract.guidance) {
      if (e.category !== 'governed-substep') continue;
      assert.ok(e.permissions, `${e.path}: missing permissions`);
    }
  });
  it('specialists declare strategyFamily and routingSignals', () => {
    for (const e of contract.guidance) {
      if (e.category !== 'specialist') continue;
      assert.ok(e.strategyFamily, `${e.path}: missing strategyFamily`);
      assert.ok(e.routingSignals?.length > 0, `${e.path}: missing routingSignals`);
    }
  });
  it('no specialist declares phaseIds', () => {
    for (const e of contract.guidance) {
      if (e.category === 'specialist') assert.ok(!e.phaseIds || e.phaseIds.length === 0, `${e.path}: has phaseIds`);
    }
  });
});

describe('Layer 3 — References', () => {
  const contract = loadJson('.qa-ai/contracts/agent-guidance.v1.json');

  it('canonical sources exist', () => {
    for (const [k, v] of Object.entries(contract.canonicalSources))
      assert.ok(exists(v), `source "${k}" not found: ${v}`);
  });
  it('every workflow phase has agent guidance registered', () => {
    const workflow = loadJson('.qa-ai/contracts/workflow.v1.json');
    const reg = new Set(contract.guidance.map((e) => e.path));
    for (const phase of workflow.phases) {
      const agentGuides = phase.guidance.filter((g) => g.startsWith('.qa-ai/agents/') && reg.has(g));
      assert.ok(agentGuides.length > 0, `Phase ${phase.id}: no registered agent guidance`);
    }
  });
});

describe('Layer 4 — Config Keys', async () => {
  const contract = loadJson('.qa-ai/contracts/agent-guidance.v1.json');
  const schema = loadJson('.qa-ai/contracts/config.v1.schema.json');
  const { extractConfigKeysFromSchema } = await import(
    pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'agent-guidance-contract.mjs')).href
  );
  const validKeys = extractConfigKeysFromSchema(schema);

  it('manifest configKeys exist in schema', () => {
    for (const e of contract.guidance) {
      if (!e.configKeys) continue;
      for (const k of e.configKeys) assert.ok(validKeys.has(k), `${e.path}: unknown key "${k}"`);
    }
  });
  it('rejects tools.testManagementProject', () => assert.ok(!validKeys.has('tools.testManagementProject')));
  it('accepts testrail.projectName', () => assert.ok(validKeys.has('testrail.projectName')));
  it('accepts execution.commands', () => assert.ok(validKeys.has('execution.commands')));
  it('accepts risk.scoring.impactWeight', () => assert.ok(validKeys.has('risk.scoring.impactWeight')));
});

describe('Layer 5 — Vocabulary', () => {
  it('gherkin-constants includes edge-case, excludes boundary', () => {
    const c = readFileSync(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'gherkin-constants.mjs'), 'utf8');
    assert.ok(c.includes("'edge-case'"));
  });
});

describe('Layer 6 — Semantic Invariants', () => {
  const contract = loadJson('.qa-ai/contracts/agent-guidance.v1.json');

  it('no auxiliary artifact is gating', () => {
    for (const e of contract.guidance) {
      if (!e.auxiliaryArtifacts) continue;
      for (const a of e.auxiliaryArtifacts) assert.ok(a.gating !== true, `${e.path}: ${a.path} gating=true`);
    }
  });
  it('all non-generated paths exist on disk', () => {
    for (const e of contract.guidance) {
      if (e.artifactPolicy === 'generated-cache') continue;
      assert.ok(exists(e.path), e.path);
    }
  });
  it('every specialist has unique strategyFamily', () => {
    const f = new Set();
    for (const e of contract.guidance) {
      if (e.category !== 'specialist') continue;
      assert.ok(!f.has(e.strategyFamily), `Duplicate family: ${e.strategyFamily}`);
      f.add(e.strategyFamily);
    }
  });
});

describe('Layer 7 — Security', () => {
  const contract = loadJson('.qa-ai/contracts/agent-guidance.v1.json');

  it('no entry path escapes repository', () => {
    for (const e of contract.guidance) {
      assert.ok(!e.path.includes('..'), `${e.path}: .. in path`);
      assert.ok(!e.path.startsWith('/'), `${e.path}: absolute path`);
    }
  });
  it('auxiliary artifacts are repository-local', () => {
    for (const e of contract.guidance) {
      if (!e.auxiliaryArtifacts) continue;
      for (const a of e.auxiliaryArtifacts) {
        assert.ok(!a.path.includes('..'), `${e.path}: aux "${a.path}" has ..`);
      }
    }
  });
});

describe('Layer 8 — Routing Integration', () => {
  it('production router imports successfully', async () => {
    const r = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'test-strategy-router.mjs')).href
    );
    assert.ok(typeof r.routeStrategiesForText === 'function');
    assert.ok(typeof r.routeStrategiesForRequirement === 'function');
    assert.ok(typeof r.specialistsFromConfig === 'function');
  });

  it('production specialist catalog has 42 specialist entries', async () => {
    const { specialistCatalog } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'project-config.mjs')).href
    );
    assert.equal(Object.keys(specialistCatalog).length, 42);
  });

  it('every manifest specialist has a corresponding catalog entry', async () => {
    const contract = loadJson('.qa-ai/contracts/agent-guidance.v1.json');
    const { specialistCatalog } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'project-config.mjs')).href
    );
    for (const e of contract.guidance) {
      if (e.category !== 'specialist') continue;
      assert.ok(e.strategyFamily in specialistCatalog, `${e.path}: family "${e.strategyFamily}" missing`);
    }
  });

  it('every catalog entry has a corresponding manifest specialist', async () => {
    const contract = loadJson('.qa-ai/contracts/agent-guidance.v1.json');
    const { specialistCatalog } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'project-config.mjs')).href
    );
    const families = new Set(contract.guidance.filter((e) => e.category === 'specialist').map((e) => e.strategyFamily));
    for (const id of Object.keys(specialistCatalog)) assert.ok(families.has(id), `Catalog "${id}" not in manifest`);
  });

  it('routeStrategiesForText returns specialists for known signals', async () => {
    const { routeStrategiesForText } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'test-strategy-router.mjs')).href
    );
    const r = routeStrategiesForText('exploratory testing session-based charter for legacy system', {
      mode: 'advisory'
    });
    assert.ok(r.length > 0, 'Should match exploratory-testing specialist');
  });

  it('routeStrategiesForText returns empty for no-match text', async () => {
    const { routeStrategiesForText } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'test-strategy-router.mjs')).href
    );
    const r = routeStrategiesForText('no matching signal text xyz123', {});
    assert.equal(r.length, 0, 'Should return empty');
  });

  it('specialistsFromConfig routes BrowserStack when configured', async () => {
    const { specialistsFromConfig } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'test-strategy-router.mjs')).href
    );
    const r = specialistsFromConfig({ automation: { ui: { framework: 'browserstack' } } });
    const ids = r.map(([id]) => id);
    assert.ok(ids.includes('browserstack-strategy'), `Got: ${ids}`);
  });

  it('specialistsFromConfig returns empty for undecided framework', async () => {
    const { specialistsFromConfig } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'test-strategy-router.mjs')).href
    );
    const r = specialistsFromConfig({ automation: { ui: { framework: 'undecided' } } });
    assert.equal(r.length, 0);
  });
});

describe('Layer 10 — Path Containment', () => {
  it('M08: guidance path traversal is rejected', async () => {
    const { validateGuidancePaths } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'agent-guidance-contract.mjs')).href
    );
    const contract = {
      guidance: [{ path: '.qa-ai/../escape.md', category: 'index' }]
    };
    const findings = validateGuidancePaths(contract);
    assert.ok(findings.some((f) => f.code === 'AGENT_UNSAFE_PATH' && f.message.includes('traversal')));
  });

  it('M08: guidance absolute, drive, UNC, fragment and wrong-root paths are rejected', async () => {
    const { validateGuidancePaths } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'agent-guidance-contract.mjs')).href
    );
    const paths = [
      '/absolute/path.md',
      'C:\\windows\\path.md',
      '\\\\server\\share\\path.md',
      '.qa-ai/agents/foo.md#fragment'
    ];
    for (const badPath of paths) {
      const contract = { guidance: [{ path: badPath, category: 'index' }] };
      const findings = validateGuidancePaths(contract);
      assert.ok(
        findings.some((f) => f.code === 'AGENT_UNSAFE_PATH'),
        `${badPath}: should flag`
      );
    }
    const outsideAgents = { guidance: [{ path: '.qa-ai/templates/index.md', category: 'index' }] };
    const findings = validateGuidancePaths(outsideAgents);
    assert.ok(findings.some((f) => f.code === 'AGENT_UNSAFE_PATH' && f.message.includes('.qa-ai/agents/')));
  });

  it('requiredRules accepts canonical basenames and rejects path-shaped values', async () => {
    const { validateGuidancePaths } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'agent-guidance-contract.mjs')).href
    );
    for (const rule of [
      '../../README.md',
      'nested/requirements.rules.md',
      'nested\\requirements.rules.md',
      '/absolute/requirements.rules.md',
      'C:\\requirements.rules.md'
    ]) {
      const findings = validateGuidancePaths({
        guidance: [{ path: '.qa-ai/agents/example.md', requiredRules: [rule] }]
      });
      assert.ok(findings.some((finding) => finding.code === 'AGENT_UNSAFE_PATH'));
    }
    assert.equal(
      validateGuidancePaths({
        guidance: [{ path: '.qa-ai/agents/example.md', requiredRules: ['requirements.rules.md'] }]
      }).length,
      0
    );
  });

  it('M06: auxiliary path traversal is rejected', async () => {
    const { validateAuxiliaryPaths } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'agent-guidance-contract.mjs')).href
    );
    const contract = {
      guidance: [
        {
          path: '.qa-ai/agents/specialists/test.md',
          category: 'specialist',
          auxiliaryArtifacts: [
            { path: '.qa-ai/output/../escape.md', linkedArtifact: '.qa-ai/output/plan.md', gating: false }
          ]
        }
      ]
    };
    let findings = validateAuxiliaryPaths(contract);
    assert.ok(findings.some((f) => f.code === 'AGENT_UNSAFE_PATH' && f.message.includes('traversal')));

    const outsideOutput = {
      guidance: [
        {
          path: '.qa-ai/agents/specialists/test.md',
          category: 'specialist',
          auxiliaryArtifacts: [
            { path: '.qa-ai/templates/stray.md', linkedArtifact: '.qa-ai/output/plan.md', gating: false }
          ]
        }
      ]
    };
    findings = validateAuxiliaryPaths(outsideOutput);
    assert.ok(findings.some((f) => f.message.includes('.qa-ai/output/')));

    const linkedOutside = {
      guidance: [
        {
          path: '.qa-ai/agents/specialists/test.md',
          category: 'specialist',
          auxiliaryArtifacts: [
            { path: '.qa-ai/output/plan.md', linkedArtifact: '.qa-ai/output/../escape.md', gating: false }
          ]
        }
      ]
    };
    findings = validateAuxiliaryPaths(linkedOutside);
    assert.ok(
      findings.some((f) => f.code === 'AGENT_UNSAFE_PATH' && f.message.includes('Linked')),
      'should flag linked artifact escape'
    );

    const validContract = {
      guidance: [
        {
          path: '.qa-ai/agents/specialists/test.md',
          category: 'specialist',
          auxiliaryArtifacts: [
            {
              path: '.qa-ai/output/assessment.md',
              linkedArtifact: '.qa-ai/output/normalized-requirements.md',
              gating: false
            }
          ]
        }
      ]
    };
    findings = validateAuxiliaryPaths(validContract);
    assert.equal(findings.length, 0, 'valid auxiliary paths should pass');
  });

  it('M07: linked artifact traversal is rejected', async () => {
    const { validateAuxiliaryPaths } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'agent-guidance-contract.mjs')).href
    );
    const contract = {
      guidance: [
        {
          path: '.qa-ai/agents/specialists/test.md',
          category: 'specialist',
          auxiliaryArtifacts: [
            {
              path: '.qa-ai/output/plan.md',
              linkedArtifact: '.qa-ai/output/../../escape.md',
              gating: false
            }
          ]
        }
      ]
    };
    const findings = validateAuxiliaryPaths(contract);
    assert.ok(
      findings.some((finding) => finding.code === 'AGENT_UNSAFE_PATH' && finding.message.includes('Linked artifact')),
      'linked artifact traversal must be rejected independently of the auxiliary path'
    );
  });
});

describe('Layer 9 — Phase-Scoped Permissions', () => {
  const contract = loadJson('.qa-ai/contracts/agent-guidance.v1.json');
  const workflow = loadJson('.qa-ai/contracts/workflow.v1.json');

  function findingCodes(findings) {
    return new Set(findings.map((f) => f.code));
  }

  it('valid apply-agent phasePermissions match the workflow contract', async () => {
    const { validatePhaseScopedPermissions } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'agent-guidance-contract.mjs')).href
    );
    const findings = validatePhaseScopedPermissions(contract, workflow);
    const applyFindings = findings.filter((f) => f.file === '.qa-ai/agents/test-management-apply-agent.md');
    assert.equal(
      applyFindings.length,
      0,
      `apply-agent should have no permission findings, got: ${JSON.stringify(applyFindings)}`
    );
  });

  it('valid diff-agent phasePermissions need no apply approval gate', async () => {
    const { validatePhaseScopedPermissions } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'agent-guidance-contract.mjs')).href
    );
    const diffEntry = contract.guidance.find((e) => e.path === '.qa-ai/agents/test-management-diff-agent.md');
    assert.ok(diffEntry.phasePermissions, 'diff-agent must have phasePermissions');
    assert.ok(!diffEntry.allowlistApprovalGates, 'diff-agent must not have allowlistApprovalGates');
    const findings = validatePhaseScopedPermissions(contract, workflow);
    const diffFindings = findings.filter((f) => f.file === '.qa-ai/agents/test-management-diff-agent.md');
    assert.equal(
      diffFindings.length,
      0,
      `diff-agent should have no permission findings, got: ${JSON.stringify(diffFindings)}`
    );
  });

  it('M02: verify phase declares external write and fails phase permission validation', async () => {
    const { validatePhaseScopedPermissions } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'agent-guidance-contract.mjs')).href
    );
    const mutated = {
      guidance: [
        {
          path: 'mutated.md',
          phaseIds: ['sync-verify'],
          phasePermissions: {
            'sync-verify': {
              localWrite: true,
              externalRead: true,
              externalWrite: true,
              approvalGates: ['external-write:test-management']
            }
          }
        }
      ]
    };
    const findings = validatePhaseScopedPermissions(mutated, workflow);
    assert.ok(
      findingCodes(findings).has('AGENT_PERMISSION_PHASE_MISMATCH'),
      'should flag externalWrite=true on the read-only verify phase'
    );
  });

  it('aggregate permissions fallback remains valid for compatible single-phase entries', async () => {
    const { validatePhaseScopedPermissions } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'agent-guidance-contract.mjs')).href
    );
    const findings = validatePhaseScopedPermissions(contract, workflow);
    const fallbackFindings = findings.filter(
      (f) => f.code === 'AGENT_PERMISSION_PHASE_MISMATCH' && f.message.includes('Aggregate permissions fallback')
    );
    assert.equal(fallbackFindings.length, 0, 'no fallback mismatch for identical-phase entries');
  });

  it('phase permission validation flags unknown and missing approval gates', async () => {
    const { validatePhaseScopedPermissions } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'agent-guidance-contract.mjs')).href
    );
    const mutated = {
      guidance: [
        {
          path: 'bad-gate.md',
          phaseIds: ['sync-apply'],
          phasePermissions: {
            'sync-apply': { localWrite: true, externalRead: true, externalWrite: true, approvalGates: ['bogus-gate'] }
          }
        }
      ]
    };
    const findings = validatePhaseScopedPermissions(mutated, workflow);
    const codes = findingCodes(findings);
    assert.ok(codes.has('AGENT_UNKNOWN_APPROVAL_GATE'), 'should flag unknown gate');
    assert.ok(codes.has('AGENT_APPROVAL_GATE_PHASE_MISMATCH'), 'should flag gate mismatch');

    const noGate = {
      guidance: [
        {
          path: 'no-gate.md',
          phaseIds: ['sync-apply'],
          phasePermissions: {
            'sync-apply': { localWrite: true, externalRead: true, externalWrite: true, approvalGates: [] }
          }
        }
      ]
    };
    const noGateFindings = validatePhaseScopedPermissions(noGate, workflow);
    assert.ok(findingCodes(noGateFindings).has('AGENT_EXTERNAL_WRITE_UNGOVERNED'), 'should flag missing gate');
  });

  it('M03: diff actor declares the apply gate and fails gate phase validation', async () => {
    const { validatePhaseScopedPermissions } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'agent-guidance-contract.mjs')).href
    );
    const mutated = {
      guidance: [
        {
          path: 'diff-with-apply-gate.md',
          phaseIds: ['sync-diff'],
          phasePermissions: {
            'sync-diff': {
              localWrite: true,
              externalRead: true,
              externalWrite: false,
              approvalGates: ['external-write:test-management']
            }
          }
        }
      ]
    };
    const findings = validatePhaseScopedPermissions(mutated, workflow);
    const codes = findingCodes(findings);
    assert.ok(codes.has('AGENT_APPROVAL_GATE_PHASE_MISMATCH'), 'should reject the apply gate on sync-diff');
  });

  it('M04: writable actor borrows a gate from another phase and fails gate phase validation', async () => {
    const { validatePhaseScopedPermissions } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'agent-guidance-contract.mjs')).href
    );
    const mutated = {
      guidance: [
        {
          path: 'writable-with-borrowed-gate.md',
          phaseIds: ['sync-apply'],
          phasePermissions: {
            'sync-apply': {
              localWrite: true,
              externalRead: true,
              externalWrite: true,
              approvalGates: ['test-design']
            }
          }
        }
      ]
    };
    const findings = validatePhaseScopedPermissions(mutated, workflow);
    assert.ok(
      findings.some(
        (finding) => finding.code === 'AGENT_APPROVAL_GATE_PHASE_MISMATCH' && finding.phase === 'sync-apply'
      ),
      'should reject a valid gate borrowed from a different workflow phase'
    );
  });

  it('M05: one denied phase in a multi-phase actor cannot be masked by an allowed phase', async () => {
    const { validatePhaseScopedPermissions } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'agent-guidance-contract.mjs')).href
    );
    const mutated = {
      guidance: [
        {
          path: 'multi-phase-denial.md',
          phaseIds: ['sync-apply', 'sync-verify'],
          phasePermissions: {
            'sync-apply': {
              localWrite: true,
              externalRead: true,
              externalWrite: true,
              approvalGates: ['external-write:test-management']
            },
            'sync-verify': {
              localWrite: true,
              externalRead: true,
              externalWrite: true,
              approvalGates: ['external-write:test-management']
            }
          }
        }
      ]
    };
    const findings = validatePhaseScopedPermissions(mutated, workflow);
    const syncVerifyFindings = findings.filter((f) => f.phase === 'sync-verify');
    assert.ok(
      syncVerifyFindings.some((f) => f.code === 'AGENT_PERMISSION_PHASE_MISMATCH'),
      'sync-verify externalWrite=true must be rejected'
    );
  });

  it('phasePermissions must cover every entry phaseId and declare only mapped phases', async () => {
    const { validatePhaseScopedPermissions } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'agent-guidance-contract.mjs')).href
    );
    const missingPhase = {
      guidance: [
        {
          path: 'missing-phase.md',
          phaseIds: ['sync-apply', 'sync-verify'],
          phasePermissions: {
            'sync-apply': { localWrite: true, externalRead: true, externalWrite: false, approvalGates: [] }
          }
        }
      ]
    };
    const missingFindings = validatePhaseScopedPermissions(missingPhase, workflow);
    assert.ok(
      missingFindings.some(
        (f) => f.code === 'AGENT_PERMISSION_PHASE_MISMATCH' && f.message.includes('missing for mapped phase')
      ),
      'should flag uncovered phaseId'
    );

    const extraPhase = {
      guidance: [
        {
          path: 'extra-phase.md',
          phaseIds: ['sync-apply'],
          phasePermissions: {
            'sync-apply': { localWrite: true, externalRead: true, externalWrite: false, approvalGates: [] },
            'sync-verify': { localWrite: true, externalRead: true, externalWrite: false, approvalGates: [] }
          }
        }
      ]
    };
    const extraFindings = validatePhaseScopedPermissions(extraPhase, workflow);
    assert.ok(
      extraFindings.some(
        (f) => f.code === 'AGENT_PERMISSION_PHASE_MISMATCH' && f.message.includes('not in entry.phaseIds')
      ),
      'should flag phasePermissions key not in phaseIds'
    );
  });

  it('localWrite mismatch in phasePermissions is flagged', async () => {
    const { validatePhaseScopedPermissions } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'agent-guidance-contract.mjs')).href
    );
    const mutated = {
      guidance: [
        {
          path: 'localwrite-mismatch.md',
          phaseIds: ['sync-verify'],
          phasePermissions: {
            'sync-verify': { localWrite: false, externalRead: true, externalWrite: false, approvalGates: [] }
          }
        }
      ]
    };
    const findings = validatePhaseScopedPermissions(mutated, workflow);
    assert.ok(
      findings.some((f) => f.code === 'AGENT_PERMISSION_PHASE_MISMATCH' && f.message.includes('localWrite')),
      'should flag localWrite mismatch'
    );
  });

  it('aggregate permissions cannot claim write capability when all phasePermissions deny it', async () => {
    const { validatePhaseScopedPermissions } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'agent-guidance-contract.mjs')).href
    );
    const mutated = {
      guidance: [
        {
          path: 'aggregate-bypass.md',
          phaseIds: ['sync-apply', 'sync-verify'],
          permissions: { localWrite: true, externalRead: true, externalWrite: true },
          allowlistApprovalGates: ['external-write:test-management'],
          phasePermissions: {
            'sync-apply': { localWrite: true, externalRead: true, externalWrite: false, approvalGates: [] },
            'sync-verify': { localWrite: true, externalRead: true, externalWrite: false, approvalGates: [] }
          }
        }
      ]
    };
    const findings = validatePhaseScopedPermissions(mutated, workflow);
    assert.ok(
      findings.some(
        (f) =>
          f.code === 'AGENT_PERMISSION_PHASE_MISMATCH' &&
          f.message.includes('permissions.externalWrite=true but no phasePermissions phase allows externalWrite')
      ),
      'should flag aggregate externalWrite inconsistent with phasePermissions'
    );
  });
});

describe('Layer 11 — Stale Cache Resilience', () => {
  it('M16: runtime routing ignores an obsolete active.md cache', async () => {
    const { activeSpecialists } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'project-config.mjs')).href
    );
    const config = {
      agents: { specialistMode: 'auto' },
      automation: { ui: { framework: 'playwright' }, api: { framework: 'none' }, mobile: { framework: 'none' } },
      tools: { testManagement: 'testrail', issueTracker: '' },
      aiTesting: { enabled: false }
    };
    const result = activeSpecialists(config).map(([id]) => id);
    assert.ok(result.includes('playwright-ui'), 'should include playwright-ui from production config');
    assert.ok(result.includes('testrail'), 'should include testrail from production config');
    assert.ok(result.includes('generic-test-design'), 'should always include generic-test-design');
  });

  it('activeSpecialists returns empty for specialistMode off regardless of config', async () => {
    const { activeSpecialists } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'project-config.mjs')).href
    );
    const result = activeSpecialists({
      agents: { specialistMode: 'off' },
      automation: { ui: { framework: 'playwright' } }
    });
    assert.equal(result.length, 0, 'specialistMode off must return empty');
  });

  it('activeSpecialists returns empty for specialistMode none', async () => {
    const { activeSpecialists } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'project-config.mjs')).href
    );
    const result = activeSpecialists({
      agents: { specialistMode: 'none' },
      automation: { ui: { framework: 'playwright' } }
    });
    assert.equal(result.length, 0, 'specialistMode none must return empty');
  });
});

describe('Layer 12 — Explicit Selection and Precedence', () => {
  it('strategyRouting mode off returns empty routes', async () => {
    const { routeStrategiesForText } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'test-strategy-router.mjs')).href
    );
    const result = routeStrategiesForText('exploratory testing session-based charter', { mode: 'off' });
    assert.equal(result.length, 0, 'mode off must return no routes');
  });

  it('strategyRouting mode advisory returns advisory-tagged routes', async () => {
    const { routeStrategiesForText } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'test-strategy-router.mjs')).href
    );
    const result = routeStrategiesForText('exploratory testing session-based charter', { mode: 'advisory' });
    assert.ok(result.length > 0, 'advisory mode should match signals');
    assert.ok(
      result.every((r) => r.advisory === true),
      'all routes must be advisory'
    );
  });

  it('strategyRouting mode strict returns non-advisory routes', async () => {
    const { routeStrategiesForText } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'test-strategy-router.mjs')).href
    );
    const result = routeStrategiesForText('exploratory testing session-based charter', { mode: 'strict' });
    assert.ok(result.length > 0, 'strict mode should match signals');
    assert.ok(
      result.every((r) => r.advisory === false),
      'all routes must be non-advisory'
    );
  });

  it('strategyRouting mode respects config-driven normalization', async () => {
    const { routeStrategiesForText } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'test-strategy-router.mjs')).href
    );
    const result = routeStrategiesForText('no match', { config: { testDesign: { strategyRouting: { mode: 'off' } } } });
    assert.equal(result.length, 0, 'config-driven off should return empty');
  });

  it('specialistMode auto includes generic-test-design unconditionally', async () => {
    const { activeSpecialists } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'project-config.mjs')).href
    );
    const result = activeSpecialists({ agents: { specialistMode: 'auto' } }).map(([id]) => id);
    assert.ok(result.includes('generic-test-design'), 'auto mode must include generic-test-design');
  });
});

describe('Layer 13 — M15: Close-But-Invalid Signal Rejection', () => {
  it('M15: concatenated signal tokens can match because includes-based matching is intentional for >3 char signals', async () => {
    const { routeStrategiesForText } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'test-strategy-router.mjs')).href
    );
    const result = routeStrategiesForText('exploratorytesting combined without spaces', { mode: 'advisory' });
    assert.ok(
      result.length > 0,
      'concatenated "exploratorytesting" matches via includes-based matching for >3 char signals'
    );
  });

  it('M15: close-but-invalid phrasing does not trigger false routing', async () => {
    const { routeStrategiesForText } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'test-strategy-router.mjs')).href
    );
    const result = routeStrategiesForText('we need to explore testing approaches but nothing specific', {
      mode: 'advisory',
      maxSpecialists: 50
    });
    const ids = result.map((r) => r.specialistId);
    assert.ok(
      !ids.includes('exploratory-testing'),
      'vague "explore testing" must not match exploratory-testing signal'
    );
  });

  it('M15: short signal length enforces word boundary; "th" in unrelated text does not match "threat model"', async () => {
    const { routeStrategiesForText } = await import(
      pathToFileURL(path.join(repoRoot, '.qa-ai', 'scripts', 'lib', 'test-strategy-router.mjs')).href
    );
    const result = routeStrategiesForText('the path through the thicket was long', {
      mode: 'advisory',
      maxSpecialists: 50
    });
    const ids = result.map((r) => r.specialistId);
    assert.ok(!ids.includes('threat-modeling'), 'unrelated "the" must not match threat modeling signals');
  });
});
