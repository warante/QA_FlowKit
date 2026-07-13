import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const doctorScript = path.join(repoRoot, '.qa-ai', 'scripts', 'doctor.mjs');

async function prepareTempTarget({ includeDocs = false } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'qafk-doctor-'));
  await fs.cp(path.join(repoRoot, '.qa-ai'), path.join(dir, '.qa-ai'), { recursive: true });
  await fs.cp(path.join(repoRoot, 'AGENTS.md'), path.join(dir, 'AGENTS.md'));
  await fs.mkdir(path.join(dir, '.qa-ai', 'output'), { recursive: true });
  await fs.mkdir(path.join(dir, '.qa-ai', 'features'), { recursive: true });
  // The doctor requires a valid qa-ai.config.yaml for non-source checkouts.
  // Copy a tracked fixture so tests are deterministic even when the source repo
  // does not ship its own runtime config.
  await fs.cp(
    path.join(repoRoot, 'test', 'fixtures', 'golden-target', '.qa-ai', 'qa-ai.config.yaml'),
    path.join(dir, '.qa-ai', 'qa-ai.config.yaml')
  );
  if (includeDocs) {
    await fs.mkdir(path.join(dir, 'docs', 'qa-ai'), { recursive: true });
    await fs.writeFile(path.join(dir, 'docs', 'qa-ai', 'architecture.md'), '# architecture');
  }
  return dir;
}

function spawnDoctor(cwd, args = []) {
  return new Promise((resolve, reject) => {
    const child = execFile(process.execPath, [doctorScript, ...args], { cwd });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d;
    });
    child.stderr.on('data', (d) => {
      stderr += d;
    });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.on('error', reject);
  });
}

test('doctor reports valid guidance state on a complete target', async () => {
  const dir = await prepareTempTarget();
  try {
    const result = await spawnDoctor(dir);
    assert.equal(result.code, 0, `doctor should exit 0, got stdout=${result.stdout} stderr=${result.stderr}`);
    assert.match(result.stdout, /state=valid/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('doctor reports source-checkout only when the framework source integrity is complete', async () => {
  const dir = await prepareTempTarget({ includeDocs: true });
  try {
    const result = await spawnDoctor(dir);
    assert.equal(result.code, 0, `doctor should exit 0, got stdout=${result.stdout} stderr=${result.stderr}`);
    assert.match(result.stdout, /state=source-checkout/);
    assert.equal(countPassGuidanceLines(result.stdout), 1);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('doctor reports missing-contract state when guidance contract is absent', async () => {
  const dir = await prepareTempTarget();
  try {
    await fs.rm(path.join(dir, '.qa-ai', 'contracts', 'agent-guidance.v1.json'));
    const result = await spawnDoctor(dir);
    assert.notEqual(result.code, 0);
    assert.match(result.stdout, /state=missing-contract/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('doctor reports missing-contract when contract is absent in a source checkout', async () => {
  const dir = await prepareTempTarget({ includeDocs: true });
  try {
    await fs.rm(path.join(dir, '.qa-ai', 'contracts', 'agent-guidance.v1.json'));
    const result = await spawnDoctor(dir);
    assert.notEqual(result.code, 0);
    assert.match(result.stdout, /state=missing-contract/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('doctor reports corrupt-contract state when guidance contract is malformed', async () => {
  const dir = await prepareTempTarget();
  try {
    await fs.writeFile(path.join(dir, '.qa-ai', 'contracts', 'agent-guidance.v1.json'), '{ bad json }');
    const result = await spawnDoctor(dir);
    assert.notEqual(result.code, 0);
    assert.match(result.stdout, /state=corrupt-contract/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('doctor reports missing-schema state and fails because the schema is a required contract', async () => {
  const dir = await prepareTempTarget();
  try {
    await fs.rm(path.join(dir, '.qa-ai', 'contracts', 'agent-guidance.v1.schema.json'));
    const result = await spawnDoctor(dir);
    assert.notEqual(result.code, 0);
    assert.match(result.stdout, /state=missing-schema/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('doctor reports corrupt-schema state when guidance schema is malformed', async () => {
  const dir = await prepareTempTarget();
  try {
    await fs.writeFile(path.join(dir, '.qa-ai', 'contracts', 'agent-guidance.v1.schema.json'), '{ corrupt');
    const result = await spawnDoctor(dir);
    assert.notEqual(result.code, 0);
    assert.match(result.stdout, /state=corrupt-schema/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

async function loadContract(dir) {
  const contractPath = path.join(dir, '.qa-ai', 'contracts', 'agent-guidance.v1.json');
  return JSON.parse(await fs.readFile(contractPath, 'utf8'));
}

async function writeContract(dir, contract) {
  const contractPath = path.join(dir, '.qa-ai', 'contracts', 'agent-guidance.v1.json');
  await fs.writeFile(contractPath, JSON.stringify(contract, null, 2));
}

function countPassGuidanceLines(stdout) {
  const matches = stdout.match(/\[PASS\] guidance integrity/g);
  return matches ? matches.length : 0;
}

test('doctor reports missing-guidance state when contract has no guidance array', async () => {
  const dir = await prepareTempTarget();
  try {
    const contract = await loadContract(dir);
    delete contract.guidance;
    await writeContract(dir, contract);
    const result = await spawnDoctor(dir);
    assert.notEqual(result.code, 0, `expected nonzero exit, got stdout=${result.stdout}`);
    assert.match(result.stdout, /state=missing-guidance/);
    assert.equal(countPassGuidanceLines(result.stdout), 0);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('doctor reports version-mismatch state when contract version is not 1', async () => {
  const dir = await prepareTempTarget();
  try {
    const contract = await loadContract(dir);
    contract.version = 2;
    await writeContract(dir, contract);
    const result = await spawnDoctor(dir);
    assert.notEqual(result.code, 0, `expected nonzero exit, got stdout=${result.stdout}`);
    assert.match(result.stdout, /state=version-mismatch/);
    assert.equal(countPassGuidanceLines(result.stdout), 0);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('doctor reports invalid-contract state when contract violates schema', async () => {
  const dir = await prepareTempTarget();
  try {
    const contract = await loadContract(dir);
    delete contract.canonicalSources;
    await writeContract(dir, contract);
    const result = await spawnDoctor(dir);
    assert.notEqual(result.code, 0, `expected nonzero exit, got stdout=${result.stdout}`);
    assert.match(result.stdout, /state=invalid-contract/);
    assert.equal(countPassGuidanceLines(result.stdout), 0);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('doctor reports invalid-contract for parseable malformed guidance entries without stack traces', async () => {
  const dir = await prepareTempTarget();
  try {
    const mutations = [
      (contract) => {
        contract.guidance = [null];
      },
      (contract) => {
        contract.guidance[0].requiredRules = {};
      },
      (contract) => {
        const entry = contract.guidance.find((item) => item.phasePermissions);
        Object.values(entry.phasePermissions)[0].approvalGates = 1;
      },
      (contract) => {
        const entry = contract.guidance.find((item) => item.auxiliaryArtifacts?.length);
        entry.auxiliaryArtifacts[0].path = 1;
      }
    ];
    for (const mutate of mutations) {
      const contract = JSON.parse(
        await fs.readFile(path.join(repoRoot, '.qa-ai', 'contracts', 'agent-guidance.v1.json'), 'utf8')
      );
      mutate(contract);
      await writeContract(dir, contract);
      const result = await spawnDoctor(dir);
      assert.notEqual(result.code, 0);
      const guidanceLine = result.stdout.split(/\r?\n/).find((line) => line.includes('guidance integrity'));
      assert.match(guidanceLine || '', /state=invalid-contract/);
      assert.equal(countPassGuidanceLines(result.stdout), 0);
      assert.doesNotMatch(result.stdout + result.stderr, /TypeError|Cannot read properties|\n\s+at\s/);
    }
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('doctor reports invalid-schema when allOf or anyOf keywords have invalid types', async () => {
  const dir = await prepareTempTarget();
  try {
    const schemaPath = path.join(dir, '.qa-ai', 'contracts', 'agent-guidance.v1.schema.json');
    const mutations = [
      (schema) => {
        schema.required = {};
      },
      (schema) => {
        schema.anyOf = {};
      },
      (schema) => {
        schema.allOf = [1];
      },
      (schema) => {
        schema.anyOf = [1];
      },
      (schema) => {
        schema.additionalProperties = [];
      },
      (schema) => {
        schema.$defs.guidanceEntry.properties.path.pattern = '^(a+)+$';
      },
      (schema) => {
        schema.if = 1;
      },
      (schema) => {
        schema.not = 1;
      },
      (schema) => {
        schema.properties.unused = 1;
      },
      (schema) => {
        schema.$defs.guidanceEntry.properties.requiredSections = {
          $ref: 'https://example.invalid/sections'
        };
      },
      (schema) => {
        schema.minimum = '0';
      },
      (schema) => {
        schema.properties.unused = { $ref: '#/title' };
      },
      (schema) => {
        schema.$defs.unconstrained = {};
        schema.$defs.guidanceEntry.properties.requiredSections = {
          $ref: '#/$defs/unconstrained'
        };
      },
      (schema) => {
        schema.$defs.guidanceEntry.allOf = {};
      },
      (schema) => {
        let node = schema;
        for (let index = 0; index < 256; index += 1) {
          node.deep = {};
          node = node.deep;
        }
      }
    ];
    for (const mutate of mutations) {
      const schema = JSON.parse(
        await fs.readFile(path.join(repoRoot, '.qa-ai', 'contracts', 'agent-guidance.v1.schema.json'), 'utf8')
      );
      mutate(schema);
      await fs.writeFile(schemaPath, JSON.stringify(schema));
      const result = await spawnDoctor(dir);
      assert.notEqual(result.code, 0);
      assert.match(result.stdout, /state=invalid-schema/);
      assert.equal(countPassGuidanceLines(result.stdout), 0);
      assert.doesNotMatch(result.stdout + result.stderr, /TypeError|object is not iterable|\n\s+at\s/);
    }
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('doctor safely handles an invalid schema combined with a partially typed contract', async () => {
  const dir = await prepareTempTarget();
  try {
    const contract = await loadContract(dir);
    contract.guidance[0].requiredRules = {};
    await writeContract(dir, contract);
    await fs.writeFile(path.join(dir, '.qa-ai', 'contracts', 'agent-guidance.v1.schema.json'), '{}');

    const result = await spawnDoctor(dir);
    assert.notEqual(result.code, 0);
    assert.match(result.stdout, /state=invalid-schema/);
    assert.match(result.stdout, /AGENT_SCHEMA_INVALID/);
    assert.equal(countPassGuidanceLines(result.stdout), 0);
    assert.doesNotMatch(result.stdout + result.stderr, /TypeError|Cannot read properties|\n\s+at\s/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('doctor reports invalid-contract state when contract has unknown root property', async () => {
  const dir = await prepareTempTarget();
  try {
    const contract = await loadContract(dir);
    contract.foo = 'bar';
    await writeContract(dir, contract);
    const result = await spawnDoctor(dir);
    assert.notEqual(result.code, 0, `expected nonzero exit, got stdout=${result.stdout}`);
    assert.match(result.stdout, /state=invalid-contract/);
    assert.equal(countPassGuidanceLines(result.stdout), 0);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('doctor reports invalid-paths state when a guidance path escapes .qa-ai/agents/', async () => {
  const dir = await prepareTempTarget();
  try {
    const contract = await loadContract(dir);
    contract.guidance[0].path = '../../escape.md';
    await writeContract(dir, contract);
    const result = await spawnDoctor(dir);
    assert.notEqual(result.code, 0, `expected nonzero exit, got stdout=${result.stdout}`);
    assert.match(result.stdout, /state=invalid-paths/);
    assert.equal(countPassGuidanceLines(result.stdout), 0);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('doctor reports missing-schema as FAIL not WARN', async () => {
  const dir = await prepareTempTarget();
  try {
    await fs.rm(path.join(dir, '.qa-ai', 'contracts', 'agent-guidance.v1.schema.json'));
    const result = await spawnDoctor(dir);
    assert.notEqual(result.code, 0, `expected nonzero exit, got stdout=${result.stdout}`);
    assert.match(result.stdout, /\[FAIL\] guidance integrity: state=missing-schema/);
    assert.doesNotMatch(result.stdout, /\[WARN\] guidance integrity: state=missing-schema/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('doctor prints exactly one PASS guidance integrity line on valid target', async () => {
  const dir = await prepareTempTarget();
  try {
    const result = await spawnDoctor(dir);
    assert.equal(result.code, 0, `doctor should exit 0, got stdout=${result.stdout} stderr=${result.stderr}`);
    assert.equal(
      countPassGuidanceLines(result.stdout),
      1,
      `expected exactly one PASS guidance integrity line, got stdout=${result.stdout}`
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('doctor prints zero PASS guidance integrity lines on invalid target', async () => {
  const dir = await prepareTempTarget();
  try {
    const contract = await loadContract(dir);
    contract.version = 99;
    await writeContract(dir, contract);
    const result = await spawnDoctor(dir);
    assert.notEqual(result.code, 0);
    assert.equal(
      countPassGuidanceLines(result.stdout),
      0,
      `expected zero PASS guidance integrity lines, got stdout=${result.stdout}`
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('doctor fails missing-schema in source checkout', async () => {
  const dir = await prepareTempTarget({ includeDocs: true });
  try {
    await fs.rm(path.join(dir, '.qa-ai', 'contracts', 'agent-guidance.v1.schema.json'));
    const result = await spawnDoctor(dir);
    assert.notEqual(result.code, 0, `doctor should fail a source checkout with no schema, got stdout=${result.stdout}`);
    assert.match(result.stdout, /state=missing-schema/);
    assert.match(result.stdout, /\[FAIL\] guidance integrity/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('doctor FAILs invalid-contract even in source-checkout', async () => {
  const dir = await prepareTempTarget({ includeDocs: true });
  try {
    const contract = await loadContract(dir);
    delete contract.canonicalSources;
    await writeContract(dir, contract);
    const result = await spawnDoctor(dir);
    assert.notEqual(result.code, 0, `expected nonzero exit, got stdout=${result.stdout}`);
    assert.match(result.stdout, /state=invalid-contract/);
    assert.equal(countPassGuidanceLines(result.stdout), 0);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('doctor rejects a parsed schema whose core contract definitions were weakened', async () => {
  const dir = await prepareTempTarget({ includeDocs: true });
  try {
    const schemaPath = path.join(dir, '.qa-ai', 'contracts', 'agent-guidance.v1.schema.json');
    const schema = JSON.parse(await fs.readFile(schemaPath, 'utf8'));
    schema.$defs.guidanceEntry = { type: 'object' };
    schema.$defs.permissions = { type: 'object' };
    schema.$defs.phasePermissionEntry = { type: 'object' };
    await fs.writeFile(schemaPath, JSON.stringify(schema, null, 2));

    const result = await spawnDoctor(dir);
    assert.notEqual(result.code, 0, `expected nonzero exit, got stdout=${result.stdout}`);
    assert.match(result.stdout, /state=invalid-schema/);
    assert.match(result.stdout, /AGENT_SCHEMA_INVALID/);
    assert.equal(countPassGuidanceLines(result.stdout), 0);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('doctor executes full phase-mapping integrity instead of shape-only checks', async () => {
  const dir = await prepareTempTarget();
  try {
    const contract = await loadContract(dir);
    const entry = contract.guidance.find((candidate) => candidate.path === '.qa-ai/agents/qa-context-intake-agent.md');
    assert.ok(entry, 'expected qa-context-intake-agent entry');
    entry.phaseIds = ['risk'];
    await writeContract(dir, contract);

    const result = await spawnDoctor(dir);
    assert.notEqual(result.code, 0, `expected nonzero exit, got stdout=${result.stdout}`);
    assert.match(result.stdout, /state=contract-integrity/);
    assert.match(result.stdout, /AGENT_PHASE_MAPPING_MISMATCH|AGENT_UNKNOWN_PHASE_ID/);
    assert.equal(countPassGuidanceLines(result.stdout), 0);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('doctor rejects canonical sources on the wrong surface', async () => {
  const dir = await prepareTempTarget();
  try {
    const contract = await loadContract(dir);
    contract.canonicalSources.workflow = '.qa-ai/rules/README.md';
    await writeContract(dir, contract);

    const result = await spawnDoctor(dir);
    assert.notEqual(result.code, 0, `expected nonzero exit, got stdout=${result.stdout}`);
    assert.match(result.stdout, /state=canonical-source-invalid/);
    assert.match(result.stdout, /AGENT_CONTRACT_CANONICAL_SOURCE_SURFACE/);
    assert.equal(countPassGuidanceLines(result.stdout), 0);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('doctor redacts stack traces on corrupt contract', async () => {
  const dir = await prepareTempTarget();
  try {
    const contract = await loadContract(dir);
    const secret = 'npm_123456789012345678901234567890123456';
    contract.guidance[0].path = secret;
    await writeContract(dir, contract);
    const result = await spawnDoctor(dir);
    assert.notEqual(result.code, 0, `expected nonzero exit, got stdout=${result.stdout}`);
    assert.doesNotMatch(result.stdout, new RegExp(secret));
    assert.doesNotMatch(result.stderr, new RegExp(secret));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('doctor reports missing-contract state when both contract and schema are absent', async () => {
  const dir = await prepareTempTarget();
  try {
    await fs.rm(path.join(dir, '.qa-ai', 'contracts', 'agent-guidance.v1.json'));
    await fs.rm(path.join(dir, '.qa-ai', 'contracts', 'agent-guidance.v1.schema.json'));
    const result = await spawnDoctor(dir);
    assert.notEqual(result.code, 0);
    assert.match(result.stdout, /state=missing-contract/);
    assert.equal(countPassGuidanceLines(result.stdout), 0);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
