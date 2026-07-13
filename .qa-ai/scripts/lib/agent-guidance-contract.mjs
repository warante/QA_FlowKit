import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { validateAgainstSchema } from './json-schema-lite.mjs';
import { resolveRepoPath } from './utils.mjs';

const MAX_GUIDANCE_JSON_BYTES = 5 * 1024 * 1024;
const AGENT_GUIDANCE_V1_SCHEMA_SHA256 = '0e68e488dfeaaddad86d580b9425c2ba2a49be79e8a1ccfc5a505ae877c229eb';

function canonicalJson(value, depth = 0) {
  if (depth > 128) throw new Error('Schema canonicalization depth exceeds 128.');
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item, depth + 1)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key], depth + 1)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

async function readGuidanceJson(root, relativePath, label) {
  const filePath = resolveRepoPath(root, relativePath, { label });
  const stat = await fs.lstat(filePath);
  if (!stat.isFile()) throw new Error(`${label} must be a regular file inside the repository.`);
  if (stat.size > MAX_GUIDANCE_JSON_BYTES) {
    throw new Error(`${label} exceeds the ${MAX_GUIDANCE_JSON_BYTES}-byte size limit.`);
  }
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

export function normalizeLineEndings(text) {
  return String(text || '').replace(/\r/g, '');
}

export function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

export async function loadAgentGuidanceContract(root) {
  return readGuidanceJson(root, '.qa-ai/contracts/agent-guidance.v1.json', 'agent guidance contract');
}

const _schemaCache = new Map();

export async function loadAgentGuidanceSchema(root) {
  const schemaPath = path.join(path.resolve(root), '.qa-ai', 'contracts', 'agent-guidance.v1.schema.json');
  if (_schemaCache.has(schemaPath)) return _schemaCache.get(schemaPath);
  const schema = await readGuidanceJson(
    root,
    '.qa-ai/contracts/agent-guidance.v1.schema.json',
    'agent guidance schema'
  );
  _schemaCache.set(schemaPath, schema);
  return schema;
}

export function clearAgentGuidanceSchemaCache() {
  _schemaCache.clear();
}

const ALLOWED_CATEGORIES = ['index', 'phase', 'governed-substep', 'reactive', 'specialist-cache', 'specialist'];
const ALLOWED_POLICIES = ['none', 'contractual-only', 'contractual-with-auxiliary', 'generated-cache'];
const REQUIRED_SOURCES = ['workflow', 'configSchema', 'gherkinConstants', 'specialistCommonRules'];
const AGENT_GUIDANCE_SCHEMA_ID = 'https://github.com/warante/QA_FlowKit/.qa-ai/contracts/agent-guidance.v1.schema.json';
const CANONICAL_SOURCE_PATHS = Object.freeze({
  workflow: '.qa-ai/contracts/workflow.v1.json',
  configSchema: '.qa-ai/contracts/config.v1.schema.json',
  gherkinConstants: '.qa-ai/scripts/lib/gherkin-constants.mjs',
  specialistCommonRules: '.qa-ai/rules/specialist-common.rules.md'
});

const ROOT_REQUIRED = ['version', 'canonicalSources', 'guidance'];
const CANONICAL_SOURCE_KEYS = ['workflow', 'configSchema', 'gherkinConstants', 'specialistCommonRules'];
const GUIDANCE_REQUIRED = ['path', 'category'];
const GUIDANCE_ALLOWED = new Set([
  'path',
  'category',
  'phaseIds',
  'requiredSections',
  'requiredRules',
  'permissions',
  'phasePermissions',
  'artifactPolicy',
  'configKeys',
  'canonicalVocabularies',
  'auxiliaryArtifacts',
  'routingSignals',
  'strategyFamily',
  'allowlistApprovalGates'
]);
const PERMISSION_KEYS = ['localWrite', 'externalRead', 'externalWrite'];
const AUX_REQUIRED = ['path', 'condition', 'linkedArtifact', 'evidenceType', 'gating'];
const AUX_ALLOWED = new Set(['path', 'condition', 'linkedArtifact', 'evidenceType', 'gating', 'safetyClassification']);
const AUX_SAFETY_CLASSIFICATIONS = ['public-safe-summary', 'sensitive-reference-only', 'internal'];
const EVIDENCE_TYPES = [
  'feature',
  'automation-script',
  'manual-charter',
  'test-plan',
  'technical-review',
  'residual-risk'
];

function _find(prefix, key) {
  return prefix ? `${prefix}.${key}` : key;
}

export function validateAgentGuidanceSchemaIdentity(schema) {
  const findings = [];

  function invalid(message) {
    findings.push({
      code: 'AGENT_SCHEMA_INVALID',
      severity: 'error',
      file: 'agent-guidance.v1.schema.json',
      message
    });
  }

  function requires(node, keys) {
    return Array.isArray(node?.required) && keys.every((key) => node.required.includes(key));
  }

  function enforcesBooleanProperties(node, keys) {
    return (
      node?.type === 'object' &&
      node.additionalProperties === false &&
      requires(node, keys) &&
      keys.every((key) => node.properties?.[key]?.type === 'boolean')
    );
  }

  if (typeof schema !== 'object' || schema === null || Array.isArray(schema)) {
    invalid('Schema must be a non-null object.');
    return findings;
  }

  let schemaDigest;
  try {
    schemaDigest = createHash('sha256').update(canonicalJson(schema)).digest('hex');
  } catch {
    invalid('Schema exceeds the canonical identity depth limit.');
    return findings;
  }
  if (schemaDigest !== AGENT_GUIDANCE_V1_SCHEMA_SHA256) {
    invalid('Schema must match the complete canonical agent-guidance V1 semantics.');
    return findings;
  }

  if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
    invalid('Schema must declare $schema: https://json-schema.org/draft/2020-12/schema.');
  }

  if (schema.$id !== AGENT_GUIDANCE_SCHEMA_ID) {
    invalid(`Schema $id must be ${AGENT_GUIDANCE_SCHEMA_ID}.`);
  }

  if (schema.type !== 'object') {
    invalid('Schema type must be "object".');
  }

  if (schema.additionalProperties !== false) {
    invalid('Schema must set additionalProperties: false.');
  }

  if (!requires(schema, ROOT_REQUIRED)) {
    invalid('Schema required must include version, canonicalSources, and guidance.');
  }

  if (schema.properties?.version?.type !== 'number' || schema.properties.version.const !== 1) {
    invalid('Schema properties.version must enforce numeric const 1.');
  }

  const canonicalSources = schema.properties?.canonicalSources;
  if (
    canonicalSources?.type !== 'object' ||
    canonicalSources.additionalProperties !== false ||
    !requires(canonicalSources, CANONICAL_SOURCE_KEYS) ||
    !CANONICAL_SOURCE_KEYS.every(
      (key) => canonicalSources.properties?.[key]?.type === 'string' && canonicalSources.properties[key].minLength >= 1
    )
  ) {
    invalid('Schema properties.canonicalSources must enforce all four non-empty V1 source paths.');
  }

  const guidance = schema.properties?.guidance;
  if (
    guidance?.type !== 'array' ||
    typeof guidance.minItems !== 'number' ||
    guidance.minItems < 1 ||
    guidance.items?.$ref !== '#/$defs/guidanceEntry'
  ) {
    invalid('Schema properties.guidance must be a non-empty array of $defs.guidanceEntry.');
  }

  const permissions = schema.$defs?.permissions;
  if (!enforcesBooleanProperties(permissions, PERMISSION_KEYS)) {
    invalid('Schema $defs.permissions must require the three boolean permission dimensions.');
  }

  const phasePermissionEntry = schema.$defs?.phasePermissionEntry;
  if (!enforcesBooleanProperties(phasePermissionEntry, PERMISSION_KEYS)) {
    invalid('Schema $defs.phasePermissionEntry must require the three boolean permission dimensions.');
  }
  if (
    phasePermissionEntry?.properties?.approvalGates?.type !== 'array' ||
    phasePermissionEntry.properties.approvalGates.items?.type !== 'string'
  ) {
    invalid('Schema $defs.phasePermissionEntry must define approvalGates as a string array.');
  }

  const guidanceEntry = schema.$defs?.guidanceEntry;
  if (
    guidanceEntry?.type !== 'object' ||
    guidanceEntry.additionalProperties !== false ||
    !requires(guidanceEntry, ['path', 'category', 'requiredSections', 'artifactPolicy'])
  ) {
    invalid('Schema $defs.guidanceEntry must enforce the required V1 guidance entry shape.');
  }
  if (
    guidanceEntry?.properties?.permissions?.$ref !== '#/$defs/permissions' ||
    guidanceEntry?.properties?.phasePermissions?.type !== 'object' ||
    guidanceEntry.properties.phasePermissions.additionalProperties?.$ref !== '#/$defs/phasePermissionEntry'
  ) {
    invalid('Schema $defs.guidanceEntry must bind aggregate and phase-scoped permission definitions.');
  }

  const guidanceAllOf = Array.isArray(guidanceEntry?.allOf) ? guidanceEntry.allOf : [];
  const phaseRule = guidanceAllOf.find((rule) => rule?.if?.properties?.category?.const === 'phase' && rule?.then);
  const phaseAnyOf = Array.isArray(phaseRule?.then?.anyOf) ? phaseRule.then.anyOf : [];
  const permissionAlternatives = new Set(
    phaseAnyOf.flatMap((branch) => (Array.isArray(branch?.required) ? branch.required : []))
  );
  if (
    !requires(phaseRule?.then, ['phaseIds']) ||
    permissionAlternatives.size !== 2 ||
    !permissionAlternatives.has('permissions') ||
    !permissionAlternatives.has('phasePermissions')
  ) {
    invalid('Schema phase guidance rule must require phaseIds and either permissions or phasePermissions.');
  }

  return findings;
}

export function validateAgentGuidanceContractShape(contract, schema) {
  const findings = [];

  if (schema) {
    const identityFindings = validateAgentGuidanceSchemaIdentity(schema);
    findings.push(...identityFindings);

    let schemaResult = null;
    if (identityFindings.length === 0) {
      try {
        schemaResult = validateAgainstSchema(contract, schema);
      } catch {
        findings.push({
          code: 'AGENT_SCHEMA_INVALID',
          severity: 'error',
          file: 'agent-guidance.v1.schema.json',
          message: 'Schema contains an invalid keyword structure.'
        });
      }
    }
    for (const message of schemaResult?.errors || []) {
      const schemaStructureError = message.includes(': schema ');
      findings.push({
        code: schemaStructureError ? 'AGENT_SCHEMA_INVALID' : 'AGENT_CONTRACT_SCHEMA',
        severity: 'error',
        file: schemaStructureError ? 'agent-guidance.v1.schema.json' : 'agent-guidance.v1.json',
        message
      });
    }
  }

  if (typeof contract !== 'object' || contract === null) {
    findings.push({
      code: 'AGENT_CONTRACT_TYPE',
      severity: 'error',
      file: 'agent-guidance.v1.json',
      message: 'Contract must be an object.'
    });
    return findings;
  }

  for (const key of Object.keys(contract)) {
    if (!ROOT_REQUIRED.includes(key) && key !== 'guidance') {
      findings.push({
        code: 'AGENT_CONTRACT_UNKNOWN_PROPERTY',
        severity: 'error',
        file: `$.${key}`,
        message: `Unknown root property "${key}".`
      });
    }
  }

  for (const r of ROOT_REQUIRED) {
    if (!(r in contract)) {
      findings.push({
        code: 'AGENT_CONTRACT_MISSING_PROPERTY',
        severity: 'error',
        file: `$`,
        message: `Missing required root property "${r}".`
      });
    }
  }

  if (contract.version !== 1) {
    findings.push({
      code: 'AGENT_CONTRACT_VERSION',
      severity: 'error',
      file: 'agent-guidance.v1.json',
      message: `Unsupported version ${contract.version}; expected 1.`
    });
  }

  if (!contract.canonicalSources || typeof contract.canonicalSources !== 'object') {
    findings.push({
      code: 'AGENT_CONTRACT_MISSING_SOURCES',
      severity: 'error',
      file: 'agent-guidance.v1.json',
      message: 'Missing or invalid canonicalSources.'
    });
    return findings;
  }

  for (const key of Object.keys(contract.canonicalSources)) {
    if (!CANONICAL_SOURCE_KEYS.includes(key)) {
      findings.push({
        code: 'AGENT_CONTRACT_UNKNOWN_PROPERTY',
        severity: 'error',
        file: '$.canonicalSources',
        message: `Unknown canonical source "${key}".`
      });
    }
  }

  for (const src of REQUIRED_SOURCES) {
    if (!contract.canonicalSources[src]) {
      findings.push({
        code: 'AGENT_CONTRACT_MISSING_SOURCE',
        severity: 'error',
        file: 'agent-guidance.v1.json',
        message: `Missing canonical source: ${src}.`
      });
    }
  }

  if (!Array.isArray(contract.guidance)) {
    findings.push({
      code: 'AGENT_CONTRACT_NO_GUIDANCE',
      severity: 'error',
      file: 'agent-guidance.v1.json',
      message: 'Missing or invalid guidance array.'
    });
    return findings;
  }

  const paths = new Set();

  for (const [idx, entry] of contract.guidance.entries()) {
    const pos = `guidance[${idx}]`;
    const loc = (f) => f.path || pos;

    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      findings.push({
        code: 'AGENT_CONTRACT_ENTRY_TYPE',
        severity: 'error',
        file: pos,
        message: 'Guidance entry must be an object.'
      });
      continue;
    }

    for (const key of Object.keys(entry)) {
      if (!GUIDANCE_ALLOWED.has(key)) {
        findings.push({
          code: 'AGENT_CONTRACT_UNKNOWN_PROPERTY',
          severity: 'error',
          file: loc(entry),
          message: `Unknown property "${key}" on guidance entry.`
        });
      }
    }

    for (const r of GUIDANCE_REQUIRED) {
      if (!(r in entry)) {
        findings.push({
          code: 'AGENT_CONTRACT_MISSING_PROPERTY',
          severity: 'error',
          file: pos,
          message: `Missing required property "${r}".`
        });
      }
    }

    if (!entry.path || typeof entry.path !== 'string') {
      findings.push({
        code: 'AGENT_CONTRACT_MISSING_PATH',
        severity: 'error',
        file: pos,
        message: 'Missing or invalid path.'
      });
      continue;
    }

    const normalizedPath = entry.path.replace(/\\/g, '/');
    if (normalizedPath !== entry.path) {
      findings.push({
        code: 'AGENT_CONTRACT_PATH_NORMALIZATION',
        severity: 'error',
        file: entry.path,
        message: `Path must use POSIX separators: "${normalizedPath}".`
      });
    }

    if (paths.has(entry.path)) {
      findings.push({
        code: 'AGENT_CONTRACT_DUPLICATE_PATH',
        severity: 'error',
        file: entry.path,
        message: `Duplicate path.`
      });
    }
    paths.add(entry.path);

    if (!ALLOWED_CATEGORIES.includes(entry.category)) {
      findings.push({
        code: 'AGENT_CONTRACT_UNKNOWN_CATEGORY',
        severity: 'error',
        file: entry.path,
        message: `Unknown category "${entry.category}".`
      });
    }

    if (entry.category === 'phase') {
      if (!Array.isArray(entry.phaseIds)) {
        findings.push({
          code: 'AGENT_CONTRACT_MISSING_PHASEIDS',
          severity: 'error',
          file: entry.path,
          message: 'Phase agent must declare phaseIds array.'
        });
      } else if (entry.phaseIds.length === 0 && entry.path !== '.qa-ai/agents/qa-workflow-orchestrator.md') {
        findings.push({
          code: 'AGENT_CONTRACT_EMPTY_PHASEIDS',
          severity: 'error',
          file: entry.path,
          message: 'Phase agent must have at least one phaseId (or be the meta-orchestrator).'
        });
      }
    }

    if (['index', 'specialist-cache', 'reactive'].includes(entry.category)) {
      if (entry.phaseIds && entry.phaseIds.length > 0) {
        findings.push({
          code: 'AGENT_CONTRACT_UNEXPECTED_PHASEIDS',
          severity: 'error',
          file: entry.path,
          message: `${entry.category} must not declare phaseIds.`
        });
      }
    }

    if (entry.category === 'specialist') {
      if (entry.phaseIds && entry.phaseIds.length > 0) {
        findings.push({
          code: 'AGENT_CONTRACT_UNEXPECTED_PHASEIDS',
          severity: 'error',
          file: entry.path,
          message: 'Specialist must not declare phaseIds.'
        });
      }
      if (!entry.strategyFamily || typeof entry.strategyFamily !== 'string') {
        findings.push({
          code: 'AGENT_CONTRACT_MISSING_FAMILY',
          severity: 'error',
          file: entry.path,
          message: 'Specialist must declare strategyFamily.'
        });
      }
      if (!entry.routingSignals || !Array.isArray(entry.routingSignals) || entry.routingSignals.length === 0) {
        findings.push({
          code: 'AGENT_CONTRACT_MISSING_SIGNALS',
          severity: 'error',
          file: entry.path,
          message: 'Specialist must declare routingSignals.'
        });
      }
    }

    if (entry.artifactPolicy && !ALLOWED_POLICIES.includes(entry.artifactPolicy)) {
      findings.push({
        code: 'AGENT_CONTRACT_UNKNOWN_POLICY',
        severity: 'error',
        file: entry.path,
        message: `Unknown artifactPolicy "${entry.artifactPolicy}".`
      });
    }

    if (entry.permissions && (typeof entry.permissions !== 'object' || Array.isArray(entry.permissions))) {
      findings.push({
        code: 'AGENT_CONTRACT_TYPE',
        severity: 'error',
        file: entry.path,
        message: 'permissions must be an object.'
      });
    } else if (entry.permissions) {
      for (const key of Object.keys(entry.permissions)) {
        if (!PERMISSION_KEYS.includes(key)) {
          findings.push({
            code: 'AGENT_CONTRACT_UNKNOWN_PROPERTY',
            severity: 'error',
            file: entry.path,
            message: `Unknown permission key "${key}".`
          });
        }
      }
      for (const key of PERMISSION_KEYS) {
        if (key in entry.permissions && typeof entry.permissions[key] !== 'boolean') {
          findings.push({
            code: 'AGENT_CONTRACT_TYPE',
            severity: 'error',
            file: entry.path,
            message: `Permission "${key}" must be a boolean.`
          });
        }
      }
    }

    if (entry.auxiliaryArtifacts) {
      if (!Array.isArray(entry.auxiliaryArtifacts)) {
        findings.push({
          code: 'AGENT_CONTRACT_TYPE',
          severity: 'error',
          file: entry.path,
          message: 'auxiliaryArtifacts must be an array.'
        });
      } else {
        for (const aux of entry.auxiliaryArtifacts) {
          if (!aux || typeof aux !== 'object' || Array.isArray(aux)) {
            findings.push({
              code: 'AGENT_CONTRACT_TYPE',
              severity: 'error',
              file: entry.path,
              message: 'Each auxiliary artifact must be an object.'
            });
            continue;
          }
          for (const key of Object.keys(aux)) {
            if (!AUX_ALLOWED.has(key)) {
              findings.push({
                code: 'AGENT_AUXILIARY_UNKNOWN_PROPERTY',
                severity: 'error',
                file: entry.path,
                message: `Unknown auxiliary property "${key}".`
              });
            }
          }
          for (const r of AUX_REQUIRED) {
            if (!(r in aux)) {
              findings.push({
                code: 'AGENT_AUXILIARY_MISSING',
                severity: 'error',
                file: entry.path,
                message: `Auxiliary artifact missing "${r}".`
              });
            }
          }
          if (aux.gating === true) {
            findings.push({
              code: 'AGENT_AUXILIARY_GATING',
              severity: 'error',
              file: entry.path,
              message: `Auxiliary artifact "${aux.path}" cannot be gating in v1.`
            });
          }
          if (aux.gating !== false) {
            findings.push({
              code: 'AGENT_AUXILIARY_GATING',
              severity: 'error',
              file: entry.path,
              message: `Auxiliary artifact "${aux.path}" must declare gating: false in v1.`
            });
          }
          if (aux.path && !aux.linkedArtifact) {
            findings.push({
              code: 'AGENT_AUXILIARY_UNLINKED',
              severity: 'warning',
              file: entry.path,
              message: `Auxiliary artifact "${aux.path}" missing linkedArtifact.`
            });
          }
          if (aux.evidenceType && !EVIDENCE_TYPES.includes(aux.evidenceType)) {
            findings.push({
              code: 'AGENT_UNKNOWN_VOCABULARY',
              severity: 'error',
              file: entry.path,
              message: `Unknown evidence type "${aux.evidenceType}" in auxiliary artifact. Canonical: ${EVIDENCE_TYPES.join(', ')}.`
            });
          }
          if (aux.safetyClassification && !AUX_SAFETY_CLASSIFICATIONS.includes(aux.safetyClassification)) {
            findings.push({
              code: 'AGENT_CONTRACT_TYPE',
              severity: 'error',
              file: entry.path,
              message: `Unknown safetyClassification "${aux.safetyClassification}".`
            });
          }
        }
      }
    }

    const auxiliaryCount = Array.isArray(entry.auxiliaryArtifacts) ? entry.auxiliaryArtifacts.length : 0;
    if (entry.artifactPolicy === 'contractual-with-auxiliary' && auxiliaryCount === 0) {
      findings.push({
        code: 'AGENT_AUXILIARY_POLICY_MISMATCH',
        severity: 'error',
        file: entry.path,
        message: 'contractual-with-auxiliary requires at least one registered auxiliary artifact.'
      });
    }
    if (entry.artifactPolicy !== 'contractual-with-auxiliary' && auxiliaryCount > 0) {
      findings.push({
        code: 'AGENT_AUXILIARY_POLICY_MISMATCH',
        severity: 'error',
        file: entry.path,
        message: 'Registered auxiliary artifacts require contractual-with-auxiliary policy.'
      });
    }

    if (
      entry.allowlistApprovalGates &&
      (!Array.isArray(entry.allowlistApprovalGates) || entry.allowlistApprovalGates.length === 0)
    ) {
      findings.push({
        code: 'AGENT_CONTRACT_TYPE',
        severity: 'error',
        file: entry.path,
        message: 'allowlistApprovalGates must be a non-empty array.'
      });
    }

    if (entry.configKeys) {
      if (!Array.isArray(entry.configKeys)) {
        findings.push({
          code: 'AGENT_CONTRACT_TYPE',
          severity: 'error',
          file: entry.path,
          message: 'configKeys must be an array.'
        });
      }
    }
  }

  return findings;
}

export async function discoverGuidanceFiles(root) {
  const agentsDir = path.join(root, '.qa-ai', 'agents');
  const files = [];

  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = toPosixPath(path.relative(root, fullPath));
      if (entry.isDirectory()) await walk(fullPath);
      else if (entry.isFile() && entry.name.endsWith('.md')) files.push(relPath);
    }
  }

  await walk(agentsDir);
  return files.sort();
}

export function indexGuidanceByPath(contract) {
  const idx = {};
  for (const entry of contract.guidance) idx[entry.path] = entry;
  return idx;
}

export function getGuidanceForPhase(contract, phaseId) {
  return contract.guidance.filter(
    (e) => e.category === 'phase' && Array.isArray(e.phaseIds) && e.phaseIds.includes(phaseId)
  );
}

export function validateGuidanceInventory(contract, discovered) {
  const findings = [];
  const registeredSet = new Set(contract.guidance.map((e) => e.path));
  const discoveredSet = new Set(discovered);

  for (const file of discovered) {
    if (!registeredSet.has(file))
      findings.push({
        code: 'AGENT_UNREGISTERED_FILE',
        severity: 'error',
        file,
        message: `Discovered file "${file}" not registered in guidance contract.`
      });
  }
  for (const entry of contract.guidance) {
    if (entry.artifactPolicy === 'generated-cache') continue;
    if (!discoveredSet.has(entry.path))
      findings.push({
        code: 'AGENT_MISSING_FILE',
        severity: 'error',
        file: entry.path,
        message: `Registered file "${entry.path}" not found on disk.`
      });
  }
  return findings;
}

export function validateGuidanceReferences(contract, workflowContract) {
  const findings = [];
  const validPhaseIds = new Set(Object.values(workflowContract.trackOrder || {}).flat());
  const validGates = new Set();
  for (const phase of workflowContract.phases || []) {
    for (const gate of phase.entryApprovals || []) validGates.add(gate);
  }
  const validValidators = new Set();
  for (const phase of workflowContract.phases || []) {
    for (const v of phase.validators || []) validValidators.add(v);
  }
  const phasesById = new Map((workflowContract.phases || []).map((phase) => [phase.id, phase]));

  for (const entry of contract.guidance) {
    if (entry.category === 'phase' && Array.isArray(entry.phaseIds)) {
      for (const phaseId of entry.phaseIds) {
        if (!validPhaseIds.has(phaseId)) {
          findings.push({
            code: 'AGENT_UNKNOWN_PHASE_ID',
            severity: 'error',
            file: entry.path,
            message: `Unknown phase ID "${phaseId}".`
          });
        }
      }
    }
    if (entry.category === 'governed-substep' && Array.isArray(entry.phaseIds)) {
      for (const phaseId of entry.phaseIds) {
        if (!validPhaseIds.has(phaseId)) {
          findings.push({
            code: 'AGENT_UNKNOWN_PHASE_ID',
            severity: 'error',
            file: entry.path,
            message: `Unknown phase ID "${phaseId}".`
          });
        }
      }
    }
    if (entry.allowlistApprovalGates) {
      for (const gate of entry.allowlistApprovalGates) {
        if (!validGates.has(gate)) {
          findings.push({
            code: 'AGENT_UNKNOWN_APPROVAL_GATE',
            severity: 'error',
            file: entry.path,
            message: `Unknown approval gate "${gate}".`
          });
        }
      }
    }

    if (Array.isArray(entry.phaseIds) && entry.phaseIds.length > 0) {
      const expectedPhaseIds = (workflowContract.phases || [])
        .filter((phase) => (phase.guidance || []).includes(entry.path))
        .map((phase) => phase.id)
        .sort();
      const declaredPhaseIds = [...entry.phaseIds].sort();
      if (JSON.stringify(expectedPhaseIds) !== JSON.stringify(declaredPhaseIds)) {
        findings.push({
          code: 'AGENT_PHASE_MAPPING_MISMATCH',
          severity: 'error',
          file: entry.path,
          message: `Declared phaseIds (${declaredPhaseIds.join(', ')}) do not match workflow guidance (${expectedPhaseIds.join(', ')}).`
        });
      }

      if (entry.permissions?.externalWrite === true) {
        const writablePhases = entry.phaseIds.filter((phaseId) => {
          const permission = phasesById.get(phaseId)?.permissions?.externalWrite;
          return permission === 'allowed' || permission === 'approval';
        });
        if (writablePhases.length === 0 || !entry.allowlistApprovalGates?.length) {
          findings.push({
            code: 'AGENT_EXTERNAL_WRITE_UNGOVERNED',
            severity: 'error',
            file: entry.path,
            message: 'externalWrite requires a writable workflow phase and an explicit approval gate.'
          });
        }
      }
    }
  }

  for (const phase of workflowContract.phases || []) {
    for (const guidancePath of phase.guidance || []) {
      if (guidancePath.startsWith('.qa-ai/agents/') && !indexGuidanceByPath(contract)[guidancePath]) {
        findings.push({
          code: 'AGENT_CONTRACT_PHASE_REFERENCE_MISSING',
          severity: 'error',
          file: `phase:${phase.id}`,
          message: `Phase "${phase.id}" references unregistered guidance "${guidancePath}".`
        });
      }
    }
  }

  return findings;
}

export function validatePhaseScopedPermissions(contract, workflowContract) {
  const findings = [];
  const phasesById = new Map((workflowContract.phases || []).map((p) => [p.id, p]));
  const validGates = new Set();
  for (const phase of workflowContract.phases || []) {
    for (const gate of phase.entryApprovals || []) validGates.add(gate);
  }

  for (const entry of contract.guidance) {
    if (!Array.isArray(entry.phaseIds) || entry.phaseIds.length === 0) continue;

    if (entry.phasePermissions) {
      for (const [phaseId, phasePerm] of Object.entries(entry.phasePermissions)) {
        const wfPhase = phasesById.get(phaseId);
        if (!wfPhase) {
          findings.push({
            code: 'AGENT_PERMISSION_PHASE_MISMATCH',
            severity: 'error',
            file: entry.path,
            phase: phaseId,
            message: `phasePermissions references unknown workflow phase "${phaseId}".`
          });
          continue;
        }

        const wfExternalWrite = wfPhase.permissions?.externalWrite;
        const agentWantsExternalWrite = phasePerm.externalWrite === true;
        const wfAllowsExternalWrite = wfExternalWrite === 'allowed' || wfExternalWrite === 'approval';

        if (agentWantsExternalWrite !== wfAllowsExternalWrite) {
          findings.push({
            code: 'AGENT_PERMISSION_PHASE_MISMATCH',
            severity: 'error',
            file: entry.path,
            phase: phaseId,
            message: `externalWrite mismatch for phase "${phaseId}": agent declares ${phasePerm.externalWrite}, workflow declares "${wfExternalWrite}".`
          });
        }

        const wfAllowsLocalWrite =
          (wfPhase.permissions?.createLocal && wfPhase.permissions.createLocal !== 'denied') ||
          (wfPhase.permissions?.modifyExisting && wfPhase.permissions.modifyExisting !== 'denied');
        if (phasePerm.localWrite !== wfAllowsLocalWrite) {
          findings.push({
            code: 'AGENT_PERMISSION_PHASE_MISMATCH',
            severity: 'error',
            file: entry.path,
            phase: phaseId,
            message: `localWrite mismatch for phase "${phaseId}": agent declares ${phasePerm.localWrite}, workflow allows=${wfAllowsLocalWrite}.`
          });
        }

        if (agentWantsExternalWrite) {
          const agentGates = phasePerm.approvalGates || [];
          const wfGates = wfPhase.entryApprovals || [];

          if (agentGates.length === 0) {
            findings.push({
              code: 'AGENT_EXTERNAL_WRITE_UNGOVERNED',
              severity: 'error',
              file: entry.path,
              phase: phaseId,
              message: `externalWrite is true for phase "${phaseId}" but no approvalGates declared.`
            });
          }

          for (const gate of agentGates) {
            if (!validGates.has(gate)) {
              findings.push({
                code: 'AGENT_UNKNOWN_APPROVAL_GATE',
                severity: 'error',
                file: entry.path,
                phase: phaseId,
                message: `Unknown approval gate "${gate}" declared for phase "${phaseId}".`
              });
            }
          }

          const sortedAgentGates = [...agentGates].sort();
          const sortedWfGates = [...wfGates].sort();
          if (JSON.stringify(sortedAgentGates) !== JSON.stringify(sortedWfGates)) {
            findings.push({
              code: 'AGENT_APPROVAL_GATE_PHASE_MISMATCH',
              severity: 'error',
              file: entry.path,
              phase: phaseId,
              message: `approvalGates mismatch for phase "${phaseId}": agent=[${sortedAgentGates.join(', ')}], workflow=[${sortedWfGates.join(', ')}].`
            });
          }
        } else if (phasePerm.approvalGates && phasePerm.approvalGates.length > 0) {
          findings.push({
            code: 'AGENT_APPROVAL_GATE_PHASE_MISMATCH',
            severity: 'error',
            file: entry.path,
            phase: phaseId,
            message: `approvalGates declared for phase "${phaseId}" but externalWrite is false.`
          });
        }
      }

      const declaredPhaseIds = new Set(Object.keys(entry.phasePermissions));
      for (const phaseId of entry.phaseIds) {
        if (!declaredPhaseIds.has(phaseId)) {
          findings.push({
            code: 'AGENT_PERMISSION_PHASE_MISMATCH',
            severity: 'error',
            file: entry.path,
            phase: phaseId,
            message: `phasePermissions missing for mapped phase "${phaseId}".`
          });
        }
      }
      for (const phaseId of declaredPhaseIds) {
        if (!entry.phaseIds.includes(phaseId)) {
          findings.push({
            code: 'AGENT_PERMISSION_PHASE_MISMATCH',
            severity: 'error',
            file: entry.path,
            phase: phaseId,
            message: `phasePermissions declares phase "${phaseId}" that is not in entry.phaseIds.`
          });
        }
      }

      if (entry.permissions) {
        const phaseValues = Object.values(entry.phasePermissions);
        const anyExternalWrite = phaseValues.some((p) => p.externalWrite === true);
        const anyLocalWrite = phaseValues.some((p) => p.localWrite === true);
        const anyExternalRead = phaseValues.some((p) => p.externalRead === true);
        if (entry.permissions.externalWrite === true && !anyExternalWrite) {
          findings.push({
            code: 'AGENT_PERMISSION_PHASE_MISMATCH',
            severity: 'error',
            file: entry.path,
            message: 'permissions.externalWrite=true but no phasePermissions phase allows externalWrite.'
          });
        }
        if (entry.permissions.localWrite === true && !anyLocalWrite) {
          findings.push({
            code: 'AGENT_PERMISSION_PHASE_MISMATCH',
            severity: 'error',
            file: entry.path,
            message: 'permissions.localWrite=true but no phasePermissions phase allows localWrite.'
          });
        }
        if (entry.permissions.externalRead === true && !anyExternalRead) {
          findings.push({
            code: 'AGENT_PERMISSION_PHASE_MISMATCH',
            severity: 'error',
            file: entry.path,
            message: 'permissions.externalRead=true but no phasePermissions phase allows externalRead.'
          });
        }
      }
    } else if (entry.permissions) {
      const entryPhaseIds = entry.phaseIds.filter((id) => phasesById.has(id));
      if (entryPhaseIds.length > 1) {
        const firstPerms = JSON.stringify(phasesById.get(entryPhaseIds[0]).permissions);
        const allSame = entryPhaseIds.every((id) => JSON.stringify(phasesById.get(id).permissions) === firstPerms);
        if (!allSame) {
          findings.push({
            code: 'AGENT_PERMISSION_PHASE_MISMATCH',
            severity: 'error',
            file: entry.path,
            message: `Aggregate permissions fallback invalid: mapped phases have different workflow permissions. Use phasePermissions for "${entry.path}".`
          });
        }
      }
    }
  }

  return findings;
}

function phaseAllowsExternalRead(phase) {
  if (!phase || typeof phase !== 'object') return false;

  const externalValidators = new Set([
    'validate-external-intake',
    'validate-observability-intake',
    'validate-sync-plan',
    'validate-sync-diff',
    'validate-sync-result'
  ]);
  if (Array.isArray(phase.validators) && phase.validators.some((v) => externalValidators.has(v))) {
    return true;
  }

  const externalSkipFields = new Set(['sources.external.enabled', 'observability.enabled', 'tools.testManagement']);
  if (Array.isArray(phase.skipConditions)) {
    for (const condition of phase.skipConditions) {
      if (externalSkipFields.has(condition.field)) return true;
    }
  }

  const ioPaths = [];
  if (Array.isArray(phase.inputs)) {
    ioPaths.push(...phase.inputs.map((i) => i.path).filter(Boolean));
  }
  if (Array.isArray(phase.outputs)) {
    ioPaths.push(...phase.outputs.map((o) => o.path).filter(Boolean));
  }
  for (const p of ioPaths) {
    if (
      p.startsWith('$config.sources.external') ||
      p.startsWith('$config.observability') ||
      p.startsWith('$config.testManagementSync')
    ) {
      return true;
    }
  }

  return false;
}

export function validateExternalReadAuthority(contract, workflowContract) {
  const findings = [];
  if (!contract || !Array.isArray(contract.guidance)) return findings;
  const phasesById = new Map((workflowContract.phases || []).map((p) => [p.id, p]));

  for (const entry of contract.guidance) {
    if (!Array.isArray(entry.phaseIds) || entry.phaseIds.length === 0) continue;

    if (entry.phasePermissions) {
      for (const [phaseId, phasePerm] of Object.entries(entry.phasePermissions)) {
        const wfPhase = phasesById.get(phaseId);
        if (!wfPhase) continue;
        const allowsRead = phaseAllowsExternalRead(wfPhase);
        const declaresRead = phasePerm.externalRead === true;

        if (declaresRead && !allowsRead) {
          findings.push({
            code: 'AGENT_PERMISSION_EXTERNAL_READ_UNAUTHORIZED',
            severity: 'error',
            file: entry.path,
            phase: phaseId,
            message: `externalRead=true for phase "${phaseId}" is not authorized by workflow inputs/responsibilities.`
          });
        } else if (allowsRead && !declaresRead) {
          findings.push({
            code: 'AGENT_PERMISSION_EXTERNAL_READ_REQUIRED',
            severity: 'error',
            file: entry.path,
            phase: phaseId,
            message: `phase "${phaseId}" requires externalRead=true based on workflow inputs/responsibilities.`
          });
        }
      }
    } else if (entry.permissions) {
      for (const phaseId of entry.phaseIds) {
        const wfPhase = phasesById.get(phaseId);
        if (!wfPhase) continue;
        const allowsRead = phaseAllowsExternalRead(wfPhase);
        const declaresRead = entry.permissions.externalRead === true;

        if (declaresRead && !allowsRead) {
          findings.push({
            code: 'AGENT_PERMISSION_EXTERNAL_READ_UNAUTHORIZED',
            severity: 'error',
            file: entry.path,
            phase: phaseId,
            message: `externalRead=true for phase "${phaseId}" is not authorized by workflow inputs/responsibilities.`
          });
        } else if (allowsRead && !declaresRead) {
          findings.push({
            code: 'AGENT_PERMISSION_EXTERNAL_READ_REQUIRED',
            severity: 'error',
            file: entry.path,
            phase: phaseId,
            message: `phase "${phaseId}" requires externalRead=true based on workflow inputs/responsibilities.`
          });
        }
      }
    }
  }

  return findings;
}

export function extractConfigKeysFromSchema(schema, prefix = '') {
  const keys = new Set();
  if (!schema || typeof schema !== 'object') return keys;
  if (schema.properties) {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      const fullKey = _find(prefix, propName);
      keys.add(fullKey);
      if (propSchema && typeof propSchema === 'object' && propSchema.type === 'object' && propSchema.properties) {
        for (const subKey of extractConfigKeysFromSchema(propSchema, fullKey)) keys.add(subKey);
      }
    }
  }
  return keys;
}

export function validateGuidanceConfigKeys(contract, configSchema) {
  const findings = [];
  const validKeys = extractConfigKeysFromSchema(configSchema);

  for (const entry of contract.guidance) {
    if (!entry.configKeys || !Array.isArray(entry.configKeys)) continue;
    for (const key of entry.configKeys) {
      const wildcard = key.endsWith('.*');
      const baseKey = wildcard ? key.slice(0, -2) : key;
      let isValid = validKeys.has(key);
      if (!isValid && wildcard) {
        isValid = [...validKeys].some((vk) => vk.startsWith(`${baseKey}.`));
      }
      if (!isValid) {
        findings.push({
          code: 'AGENT_UNKNOWN_CONFIG_KEY',
          severity: 'error',
          file: entry.path,
          message: `Unknown config key "${key}".`
        });
      }
    }
  }
  return findings;
}

export function extractMarkdownHeadings(content) {
  const headings = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)/);
    if (match) headings.push({ level: match[1].length, text: match[2].trim(), line: i + 1 });
  }
  return headings;
}

export function extractMarkdownConfigKeys(content) {
  const keys = new Set();
  const lines = content.split('\n');
  let inFence = false;
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const matches = line.match(/`([^`]+)`/g);
    if (matches) {
      for (const m of matches) {
        const inner = m.slice(1, -1);
        if (/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(inner)) keys.add(inner);
      }
    }
  }
  return [...keys];
}

export function extractMarkdownLinks(content) {
  const links = [];
  const regex = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (!match[2].startsWith('http://') && !match[2].startsWith('https://')) {
      const lineNum = content.slice(0, match.index).split('\n').length;
      links.push({ text: match[1], url: match[2], raw: match[0], index: match.index, line: lineNum });
    }
  }
  return links;
}

export function validateMarkdownHeadings(entry, content) {
  const findings = [];
  if (!entry.requiredSections || !Array.isArray(entry.requiredSections)) return findings;
  const headings = extractMarkdownHeadings(content);
  const headingMap = new Map(headings.map((h) => [h.text.toLowerCase(), h.line]));

  const sectionAliases = {
    output: ['outputs', 'output structure', 'output rules', 'output format'],
    constraints: ['rules', 'verification'],
    'done criteria': ['completion criteria', 'verification', 'handoff']
  };

  for (const section of entry.requiredSections) {
    const lowerSection = section.toLowerCase();
    if (!headingMap.has(lowerSection)) {
      const aliases = sectionAliases[lowerSection] || [];
      if (!aliases.some((a) => headingMap.has(a.toLowerCase()))) {
        findings.push({
          code: 'AGENT_MISSING_SECTION',
          severity: 'error',
          file: entry.path,
          line: null,
          message: `Required section "${section}" not found in Markdown headings.`
        });
      }
    }
  }
  return findings;
}

export function validateMarkdownRules(_entry, _content) {
  const findings = [];
  // Rule files are loaded globally by agents/README.md and rules/README.md. Their
  // existence is validated by the CLI; phase guidance need not duplicate links.
  return findings;
}

function _findLineMatching(lines, regex) {
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) return i + 1;
  }
  return null;
}

export function validateMarkdownSemantics(entry, content) {
  const findings = [];
  const lowerContent = content.toLowerCase();
  const lines = content.split('\n');

  if (entry.category === 'specialist') {
    if (!lowerContent.includes('specialist-common.rules.md') && !lowerContent.includes('inherit')) {
      findings.push({
        code: 'AGENT_MISSING_INHERITANCE',
        severity: 'error',
        file: entry.path,
        line: null,
        message: 'Specialist does not reference specialist-common.rules.md inheritance.'
      });
    }
  }

  if (entry.category === 'specialist-cache') {
    if (content.match(/add\s+manually|edit\s+this\s+file|manually\s+maintain/i)) {
      const l = _findLineMatching(lines, /add\s+manually|edit\s+this\s+file|manually\s+maintain/i);
      findings.push({
        code: 'AGENT_CACHE_AUTHORITY',
        severity: 'error',
        file: entry.path,
        line: l,
        message: 'active.md must not be described as manually authoritative.'
      });
    }
  }

  const placeholderLines = lines.filter((line) => {
    const matchesPlaceholder =
      /todo:\s*replace with stable selector/i.test(line) ||
      /create test skeletons with/i.test(line) ||
      /test environment not available[^\n]*create specs/i.test(line);
    return matchesPlaceholder && !/(?:do not|never|must not)/i.test(line);
  });
  if (placeholderLines.length > 0) {
    findings.push({
      code: 'AGENT_PLACEHOLDER_DEFAULT',
      severity: 'error',
      file: entry.path,
      line: _findLineMatching(lines, new RegExp(placeholderLines[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))),
      message: 'Missing implementation inputs must not default to executable placeholders or skipped specs.'
    });
  }

  const manualCacheMutation = lines.some(
    (line) =>
      /manually\s+(?:edit|add\s+.*\s+to)\s+[^\n]*active\.md/i.test(line) && !/(?:do not|never|must not)/i.test(line)
  );
  if (manualCacheMutation) {
    const l = _findLineMatching(
      lines,
      /manually\s+(?:edit|add\s+.*\s+to)\s+[^\n]*active\.md(?!.*(?:do not|never|must not))/i
    );
    findings.push({
      code: 'AGENT_CACHE_AUTHORITY',
      severity: 'error',
      file: entry.path,
      line: l,
      message: 'Guidance must not instruct users to maintain active.md manually.'
    });
  }

  function _hasGovernedWritePhase(entry) {
    if (!entry.phasePermissions) return false;
    for (const [, phasePerm] of Object.entries(entry.phasePermissions)) {
      if (
        phasePerm.externalWrite === true &&
        Array.isArray(phasePerm.approvalGates) &&
        phasePerm.approvalGates.length > 0
      ) {
        return true;
      }
    }
    return false;
  }

  const governedWriteEntry =
    entry.permissions?.externalWrite === true &&
    Array.isArray(entry.allowlistApprovalGates) &&
    entry.allowlistApprovalGates.length > 0;
  const governedPhaseWrite = _hasGovernedWritePhase(entry);
  const hasGovernedWrite = entry.phasePermissions ? governedPhaseWrite : governedWriteEntry;
  const isReadOnly = entry.phasePermissions
    ? !governedPhaseWrite
    : entry.permissions?.externalWrite === false && !governedWriteEntry;

  if (hasGovernedWrite) {
    const documentsApproval = /\b(?:approval|approved)\b/i.test(content);
    const documentsRollback = /\brollback\b|\broll\s+back\b/i.test(content);
    if (!documentsApproval || !documentsRollback) {
      findings.push({
        code: 'AGENT_EXTERNAL_WRITE_UNGOVERNED',
        severity: 'error',
        file: entry.path,
        message: 'Governed external-write guidance must document both explicit approval and rollback safety.'
      });
    }
  }

  if (isReadOnly) {
    const unsafeExternalWrite = lines.some(
      (line) =>
        /(?:perform|execute|apply|write|create|update)\s+[^\n]*(?:externally|external tool|testrail|jira)/i.test(
          line
        ) &&
        !/(?:do not|never|no external|without approval|proposal|draft|blocked|\.qa-ai\/|local markdown)/i.test(line)
    );
    if (unsafeExternalWrite) {
      const l = _findLineMatching(
        lines,
        /(?:perform|execute|apply|write|create|update)\s+[^\n]*(?:externally|external tool|testrail|jira)(?![^\n]*(?:do not|never|no external|without approval|proposal|draft|blocked|\.qa-ai\/|local markdown))/i
      );
      findings.push({
        code: 'AGENT_EXTERNAL_WRITE_UNGOVERNED',
        severity: 'error',
        file: entry.path,
        line: l,
        message: 'Read-only guidance claims an external mutation without permission.'
      });
    }
  }

  if (/scaffold-only[^\n]*(?:counts? as|satisf(?:y|ies))[^\n]*(?:done|complete|pass)/i.test(content)) {
    const l = _findLineMatching(
      lines,
      /scaffold-only[^\n]*(?:counts? as|satisf(?:y|ies))[^\n]*(?:done|complete|pass)/i
    );
    findings.push({
      code: 'AGENT_UNEVIDENCED_DONE',
      severity: 'error',
      file: entry.path,
      line: l,
      message: 'Scaffold-only output cannot satisfy completion or PASS evidence.'
    });
  }

  if (/count\s+(?:feature files|features)\s+as\s+(?:tests|test cases)/i.test(content)) {
    const l = _findLineMatching(lines, /count\s+(?:feature files|features)\s+as\s+(?:tests|test cases)/i);
    findings.push({
      code: 'AGENT_FEATURE_COUNT_AS_TEST_COUNT',
      severity: 'error',
      file: entry.path,
      line: l,
      message: 'Use scenarios/Test IDs, not feature-file count, as the test-count unit.'
    });
  }

  if (entry.path === '.qa-ai/agents/gherkin-test-design-agent.md') {
    const text = content.replace(/```[\s\S]*?```/g, '');
    const textLines = text.split('\n');
    let hasContradiction = false;
    let contradictionLine = null;
    for (let i = 0; i < textLines.length; i++) {
      const line = textLines[i];
      const ll = line.toLowerCase();
      if (
        ll.includes('one scenario') &&
        ll.includes('per file') &&
        !ll.includes('one-per-file') &&
        !ll.includes('multiple-per-file') &&
        !ll.includes('scenariolayout') &&
        !ll.includes('emit')
      ) {
        hasContradiction = true;
        contradictionLine = i + 1;
      }
    }
    if (hasContradiction) {
      findings.push({
        code: 'AGENT_LAYOUT_CONTRADICTION',
        severity: 'error',
        file: entry.path,
        line: contradictionLine,
        message: 'Absolute one-scenario-per-file instruction contradicts layout support.'
      });
    }
  }

  const mutationVerbs = /\b(?:delete|overwrite|rename|move|patch|rewrite|remove|replace|modify)\b/i;
  const evaluatedTargets =
    /\b(?:requirements?|existing tests?|\.?feature files?|contracts?|snapshots?|source files?|spec files?|\.feature|normalized-requirements?|test cases?)\b/i;
  const prohibitionWords = /\b(?:do not|never|must not|cannot|should not)\b/i;
  const userActionPrefix = /\b(?:the user|end[ -]user|tester)\s+(?:may|can|should|will|must|shall)/i;

  const processedLines = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    processedLines.push({ index: i, text: trimmed });
  }

  for (const { index, text } of processedLines) {
    const lower = text.toLowerCase();

    if (!mutationVerbs.test(lower)) continue;
    if (!evaluatedTargets.test(lower)) continue;

    if (prohibitionWords.test(lower)) continue;
    if (userActionPrefix.test(lower)) continue;

    if (hasGovernedWrite) continue;

    findings.push({
      code: 'AGENT_READONLY_MUTATION',
      severity: 'error',
      file: entry.path,
      line: index + 1,
      message: 'Read-only guidance instructs mutation of evaluated inputs (delete/overwrite/rename/move/patch/rewrite).'
    });
    break;
  }

  return findings;
}

export function getCategoryCounts(contract) {
  const counts = {};
  for (const entry of contract.guidance) counts[entry.category] = (counts[entry.category] || 0) + 1;
  return counts;
}

const SEVERITY_ORDER = { error: 0, warning: 1 };
const EMPTY_LINE = Number.MAX_SAFE_INTEGER;

export function sortFindings(findings) {
  return [...findings].sort((a, b) => {
    const sevA = SEVERITY_ORDER[a.severity] ?? 2;
    const sevB = SEVERITY_ORDER[b.severity] ?? 2;
    if (sevA !== sevB) return sevA - sevB;

    const fileA = a.file || '';
    const fileB = b.file || '';
    if (fileA < fileB) return -1;
    if (fileA > fileB) return 1;

    const lineA = typeof a.line === 'number' && !Number.isNaN(a.line) ? a.line : EMPTY_LINE;
    const lineB = typeof b.line === 'number' && !Number.isNaN(b.line) ? b.line : EMPTY_LINE;
    if (lineA !== lineB) return lineA - lineB;

    const codeA = a.code || '';
    const codeB = b.code || '';
    if (codeA < codeB) return -1;
    if (codeA > codeB) return 1;

    const msgA = a.message || '';
    const msgB = b.message || '';
    if (msgA < msgB) return -1;
    if (msgA > msgB) return 1;
    return 0;
  });
}

const TRAVERSAL_SEGMENT = /(?:^|[\\/])\.\.(?:[\\/]|$)/;

const UNSAFE_PATH_PATTERNS = [
  { test: (p) => TRAVERSAL_SEGMENT.test(p), label: 'traversal (..)' },
  { test: (p) => path.isAbsolute(p), label: 'absolute path' },
  { test: (p) => /^\\\\/.test(p), label: 'UNC path' },
  { test: (p) => /^[A-Za-z]:/.test(p), label: 'Windows drive letter' },
  { test: (p) => p.includes('#'), label: 'URL fragment' }
];

const THREAT_PATH = 'AGENT_UNSAFE_PATH';
const REQUIRED_RULE_NAME = /^[a-z0-9][a-z0-9-]*\.rules\.md$/;

export function isCanonicalRequiredRuleName(value) {
  return typeof value === 'string' && REQUIRED_RULE_NAME.test(value);
}

export function validateGuidancePaths(contract) {
  const findings = [];
  for (const entry of contract.guidance) {
    const p = entry.path || '';
    const posixP = toPosixPath(p);

    for (const { test, label } of UNSAFE_PATH_PATTERNS) {
      if (test(p)) {
        findings.push({
          code: THREAT_PATH,
          severity: 'error',
          file: p,
          message: `Path contains ${label}.`
        });
      }
    }

    if (!posixP.startsWith('.qa-ai/agents/')) {
      findings.push({
        code: THREAT_PATH,
        severity: 'error',
        file: p,
        message: `Path must stay under .qa-ai/agents/.`
      });
    }

    for (const rule of Array.isArray(entry.requiredRules) ? entry.requiredRules : []) {
      if (!isCanonicalRequiredRuleName(rule)) {
        findings.push({
          code: THREAT_PATH,
          severity: 'error',
          file: p,
          message: 'Required rule must be a canonical *.rules.md basename under .qa-ai/rules/.'
        });
      }
    }
  }
  return findings;
}

export function validateAuxiliaryPaths(contract) {
  const findings = [];
  for (const entry of contract.guidance) {
    if (!entry.auxiliaryArtifacts || !Array.isArray(entry.auxiliaryArtifacts)) continue;

    for (const aux of entry.auxiliaryArtifacts) {
      const auxPath = aux.path || '';

      for (const { test, label } of UNSAFE_PATH_PATTERNS) {
        if (test(auxPath)) {
          findings.push({
            code: THREAT_PATH,
            severity: 'error',
            file: entry.path,
            message: `Auxiliary path "${auxPath}" contains ${label}.`
          });
        }
      }

      const posixAux = toPosixPath(auxPath);
      if (!posixAux.startsWith('.qa-ai/output/')) {
        findings.push({
          code: THREAT_PATH,
          severity: 'error',
          file: entry.path,
          message: `Auxiliary path "${auxPath}" must stay under .qa-ai/output/.`
        });
      }

      if (aux.linkedArtifact) {
        const linked = aux.linkedArtifact;

        for (const { test, label } of UNSAFE_PATH_PATTERNS) {
          if (test(linked)) {
            findings.push({
              code: THREAT_PATH,
              severity: 'error',
              file: entry.path,
              message: `Linked artifact "${linked}" contains ${label}.`
            });
          }
        }

        const posixLinked = toPosixPath(linked);
        if (!posixLinked.startsWith('.qa-ai/output/')) {
          findings.push({
            code: THREAT_PATH,
            severity: 'error',
            file: entry.path,
            message: `Linked artifact "${linked}" must stay under .qa-ai/output/.`
          });
        }
      }
    }
  }
  return findings;
}

export async function validateCanonicalSources(root, contract) {
  const findings = [];
  if (!contract || typeof contract.canonicalSources !== 'object' || contract.canonicalSources === null) {
    return findings;
  }

  for (const key of CANONICAL_SOURCE_KEYS) {
    const value = contract.canonicalSources[key];
    if (typeof value !== 'string' || value.length === 0) {
      findings.push({
        code: 'AGENT_CONTRACT_CANONICAL_SOURCE_ESCAPE',
        severity: 'error',
        file: `canonicalSources.${key}`,
        message: `Canonical source ${key} must be a non-empty string.`
      });
      continue;
    }

    let unsafe = false;
    for (const { test, label } of UNSAFE_PATH_PATTERNS) {
      if (test(value)) {
        unsafe = true;
        findings.push({
          code: 'AGENT_CONTRACT_CANONICAL_SOURCE_ESCAPE',
          severity: 'error',
          file: `canonicalSources.${key}`,
          message: `Canonical source ${key} contains ${label}.`
        });
      }
    }

    const normalized = path.posix.normalize(value);
    if (value.includes('\\') || normalized !== value || path.posix.isAbsolute(value)) {
      unsafe = true;
      findings.push({
        code: 'AGENT_CONTRACT_CANONICAL_SOURCE_ESCAPE',
        severity: 'error',
        file: `canonicalSources.${key}`,
        message: `Canonical source ${key} must be a normalized POSIX repository-relative path.`
      });
    }

    if (unsafe) continue;

    if (!value.startsWith('.qa-ai/')) {
      findings.push({
        code: 'AGENT_CONTRACT_CANONICAL_SOURCE_ESCAPE',
        severity: 'error',
        file: `canonicalSources.${key}`,
        message: `Canonical source ${key} must stay under .qa-ai/.`
      });
      continue;
    }

    const rootPath = path.resolve(root);
    const resolved = path.resolve(rootPath, ...value.split('/'));
    const relative = path.relative(rootPath, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      findings.push({
        code: 'AGENT_CONTRACT_CANONICAL_SOURCE_ESCAPE',
        severity: 'error',
        file: `canonicalSources.${key}`,
        message: `Canonical source ${key} resolves outside the repository.`
      });
      continue;
    }

    if (value !== CANONICAL_SOURCE_PATHS[key]) {
      findings.push({
        code: 'AGENT_CONTRACT_CANONICAL_SOURCE_SURFACE',
        severity: 'error',
        file: `canonicalSources.${key}`,
        message: `Canonical source ${key} must point to ${CANONICAL_SOURCE_PATHS[key]}.`
      });
    }

    let contained;
    try {
      contained = resolveRepoPath(rootPath, value, { label: `canonical source ${key}` });
    } catch {
      findings.push({
        code: 'AGENT_CONTRACT_CANONICAL_SOURCE_ESCAPE',
        severity: 'error',
        file: `canonicalSources.${key}`,
        message: `Canonical source ${key} must resolve inside the repository.`
      });
      continue;
    }

    let exists = false;
    try {
      exists = contained === resolved && (await fs.lstat(contained)).isFile();
    } catch {
      // The dedicated missing-file finding below is the public result.
    }
    if (!exists) {
      findings.push({
        code: 'AGENT_CONTRACT_CANONICAL_SOURCE_MISSING',
        severity: 'error',
        file: `canonicalSources.${key}`,
        message: `Canonical source ${key} does not exist as a file: ${value}.`
      });
    }
  }

  return findings;
}
