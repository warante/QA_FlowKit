#!/usr/bin/env node
import path from 'node:path';
import {
  discoverGuidanceFiles,
  extractConfigKeysFromSchema,
  extractMarkdownConfigKeys,
  extractMarkdownLinks,
  getCategoryCounts,
  isCanonicalRequiredRuleName,
  loadAgentGuidanceContract,
  loadAgentGuidanceSchema,
  sortFindings,
  validateAgentGuidanceContractShape,
  validateAuxiliaryPaths,
  validateCanonicalSources,
  validateExternalReadAuthority,
  validateGuidanceConfigKeys,
  validateGuidanceInventory,
  validateGuidancePaths,
  validateGuidanceReferences,
  validateMarkdownHeadings,
  validateMarkdownRules,
  validateMarkdownSemantics,
  validatePhaseScopedPermissions
} from './lib/agent-guidance-contract.mjs';
import { logHeader, parseArgs, pathExists, readText, resolveRepoPath } from './lib/utils.mjs';
import { emitFindingsJson, finishValidatorFindingsRun, isJsonMode, runValidatorMain } from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-agent-guidance.mjs [options]

Options:
  --json   Print machine-readable JSON
  --help   Show this help

Validates .qa-ai/contracts/agent-guidance.v1.json and all registered guidance files.`);
}

async function loadWorkflowContract(cwd) {
  const p = resolveRepoPath(cwd, '.qa-ai/contracts/workflow.v1.json', { label: 'workflow contract' });
  if (!(await pathExists(p))) return { data: null, missing: true };
  try {
    return { data: JSON.parse(await readText(p)), missing: false, parseError: false };
  } catch (err) {
    return { data: null, missing: false, parseError: true, message: err.message };
  }
}

async function loadConfigSchema(cwd) {
  const p = resolveRepoPath(cwd, '.qa-ai/contracts/config.v1.schema.json', { label: 'config schema' });
  if (!(await pathExists(p))) return { data: null, missing: true };
  try {
    return { data: JSON.parse(await readText(p)), missing: false, parseError: false };
  } catch (err) {
    return { data: null, missing: false, parseError: true, message: err.message };
  }
}

async function readGuidanceMarkdown(cwd, entryPath) {
  try {
    return await readText(resolveRepoPath(cwd, entryPath, { label: entryPath }));
  } catch {
    return null;
  }
}

function emitFail(jsonMode, code, message, extra = {}) {
  const finding = { severity: 'error', code, message };
  if (extra.file) finding.file = extra.file;
  const errors = [message];
  const summaryExtra = extra.summaryExtra || {};
  if (jsonMode) {
    emitFindingsJson({
      ok: false,
      errors,
      warnings: [],
      findings: [finding],
      extra: {
        validator: 'validate-agent-guidance',
        contractVersion: extra.contractVersion ?? null,
        summary: { registered: 0, discovered: 0, errors: 1, warnings: 0, categories: {}, ...summaryExtra }
      }
    });
    process.exit(1);
  }
  finishValidatorFindingsRun({
    ok: false,
    errors,
    warnings: [],
    findings: [finding],
    jsonMode: false,
    successMessage: '',
    failureMessage: `FAILED - ${message}`,
    extraJson: {}
  });
}

function isStructurallySafeGuidanceEntry(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry) || typeof entry.path !== 'string') return false;
  if (entry.permissions && (typeof entry.permissions !== 'object' || Array.isArray(entry.permissions))) return false;
  if (entry.phasePermissions && (typeof entry.phasePermissions !== 'object' || Array.isArray(entry.phasePermissions))) {
    return false;
  }
  if (
    entry.phasePermissions &&
    Object.values(entry.phasePermissions).some(
      (permission) => !permission || typeof permission !== 'object' || Array.isArray(permission)
    )
  ) {
    return false;
  }
  if (
    entry.auxiliaryArtifacts &&
    (!Array.isArray(entry.auxiliaryArtifacts) ||
      entry.auxiliaryArtifacts.some((artifact) => !artifact || typeof artifact !== 'object' || Array.isArray(artifact)))
  ) {
    return false;
  }
  return true;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const cwd = process.cwd();
  const jsonMode = isJsonMode(args);
  if (!jsonMode) logHeader('Agent guidance validator');

  const contractPath = resolveRepoPath(cwd, '.qa-ai/contracts/agent-guidance.v1.json', {
    label: 'agent guidance contract'
  });
  if (!(await pathExists(contractPath))) {
    emitFail(
      jsonMode,
      'AGENT_CONTRACT_MISSING',
      'Agent guidance contract file missing: .qa-ai/contracts/agent-guidance.v1.json'
    );
    return;
  }

  let contract;
  try {
    contract = await loadAgentGuidanceContract(cwd);
  } catch (err) {
    emitFail(jsonMode, 'AGENT_CONTRACT_PARSE', `Agent guidance contract parse error: ${err.message}`, {
      file: '.qa-ai/contracts/agent-guidance.v1.json'
    });
    return;
  }

  let schema;
  try {
    schema = await loadAgentGuidanceSchema(cwd);
  } catch (err) {
    if (err.code === 'ENOENT') {
      emitFail(
        jsonMode,
        'AGENT_SCHEMA_MISSING',
        'Agent guidance schema file missing: .qa-ai/contracts/agent-guidance.v1.schema.json'
      );
      return;
    }
    emitFail(jsonMode, 'AGENT_SCHEMA_PARSE', `Agent guidance schema parse error: ${err.message}`, {
      file: '.qa-ai/contracts/agent-guidance.v1.schema.json'
    });
    return;
  }

  const findings = [];

  const shapeFindings = validateAgentGuidanceContractShape(contract, schema);
  findings.push(...shapeFindings);
  const hasShapeErrors = shapeFindings.some((finding) => finding.severity === 'error');
  const pathSafeGuidance = Array.isArray(contract?.guidance)
    ? contract.guidance.filter(
        (entry) =>
          entry !== null && typeof entry === 'object' && !Array.isArray(entry) && typeof entry.path === 'string'
      )
    : [];

  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
    contract = { version: null, canonicalSources: {}, guidance: [] };
  } else if (!Array.isArray(contract.guidance) || hasShapeErrors) {
    // Shape/schema validation already reports the missing/invalid guidance property;
    // normalize to an empty array so downstream semantic checks never consume a
    // partially typed contract and cannot replace structured findings with a crash.
    contract.guidance = [];
  } else {
    // Invalid entries already have shape findings. Exclude them from deeper semantic
    // passes so hostile-but-parseable JSON cannot turn structured validation into a crash.
    contract.guidance = contract.guidance.filter(isStructurallySafeGuidanceEntry);
  }

  // Keep path traversal classification available even when another shape error
  // prevents deeper semantic validation of the partially typed contract.
  findings.push(...validateGuidancePaths({ guidance: pathSafeGuidance }));
  findings.push(...validateAuxiliaryPaths(contract));
  findings.push(...(await validateCanonicalSources(cwd, contract)));

  const discovered = await discoverGuidanceFiles(cwd);
  findings.push(...validateGuidanceInventory(contract, discovered));

  const workflowResult = await loadWorkflowContract(cwd);
  if (workflowResult.data) {
    findings.push(...validateGuidanceReferences(contract, workflowResult.data));
    findings.push(...validatePhaseScopedPermissions(contract, workflowResult.data));
    findings.push(...validateExternalReadAuthority(contract, workflowResult.data));
  } else if (workflowResult.parseError) {
    findings.push({
      code: 'AGENT_WORKFLOW_PARSE',
      severity: 'error',
      file: '.qa-ai/contracts/workflow.v1.json',
      message: `Workflow contract parse error: ${workflowResult.message}.`
    });
  } else {
    findings.push({
      code: 'AGENT_WORKFLOW_MISSING',
      severity: 'error',
      file: '.qa-ai/contracts/workflow.v1.json',
      message: 'Workflow contract is required for guidance validation.'
    });
  }

  const configSchemaResult = await loadConfigSchema(cwd);
  if (configSchemaResult.data) {
    const configSchema = configSchemaResult.data;
    findings.push(...validateGuidanceConfigKeys(contract, configSchema));
    const validSchemaKeys = extractConfigKeysFromSchema(configSchema);

    for (const entry of contract.guidance) {
      const content = await readGuidanceMarkdown(cwd, entry.path);
      if (!content) continue;
      const mdKeys = extractMarkdownConfigKeys(content);
      const knownNonConfig = new Set([
        'AGENTS.md',
        'active.md',
        'init.mjs',
        'pom.xml',
        'build.gradle',
        'openapi.yaml',
        'asyncapi.yaml',
        'appium.md',
        'maestro.md',
        'karate.env'
      ]);
      for (const key of mdKeys) {
        if (knownNonConfig.has(key)) continue;
        if (
          key.endsWith('.md') ||
          key.endsWith('.mjs') ||
          key.endsWith('.yaml') ||
          key.endsWith('.xml') ||
          key.endsWith('.gradle')
        )
          continue;
        if (/^[a-zA-Z][a-zA-Z0-9_.]*(\.[a-zA-Z][a-zA-Z0-9_.]*)+$/.test(key)) {
          const wildcard = key.endsWith('.*');
          const baseKey = wildcard ? key.slice(0, -2) : key;
          const knownExports = new Set([
            'module.exports',
            'process.env',
            'process.exit',
            'process.argv',
            'process.cwd',
            'fileURLToPath',
            'toString'
          ]);
          if (knownExports.has(baseKey) || baseKey.startsWith('evidence.')) continue;
          const isCodeRef = content
            .split('\n')
            .some(
              (l) =>
                l.includes(key) &&
                (l.trim().startsWith('import ') ||
                  l.trim().startsWith('const ') ||
                  l.trim().startsWith('let ') ||
                  l.trim().startsWith('export ') ||
                  l.trim().startsWith('```') ||
                  l.toLowerCase().includes('d.ts'))
            );
          if (!isCodeRef && !validSchemaKeys.has(key)) {
            if (!wildcard || !validSchemaKeys.some((vk) => vk.startsWith(`${baseKey}.`))) {
              findings.push({
                code: 'AGENT_UNKNOWN_CONFIG_KEY',
                severity: 'error',
                file: entry.path,
                message: `Markdown references unknown config key "${key}".`
              });
            }
          }
        }
      }
    }
  } else if (configSchemaResult.parseError) {
    findings.push({
      code: 'AGENT_CONFIG_SCHEMA_PARSE',
      severity: 'error',
      file: '.qa-ai/contracts/config.v1.schema.json',
      message: `Config schema parse error: ${configSchemaResult.message}.`
    });
  } else {
    findings.push({
      code: 'AGENT_CONFIG_SCHEMA_MISSING',
      severity: 'error',
      file: '.qa-ai/contracts/config.v1.schema.json',
      message: 'Config schema is required for guidance validation.'
    });
  }

  for (const entry of contract.guidance) {
    const content = await readGuidanceMarkdown(cwd, entry.path);
    if (!content) continue;

    findings.push(...validateMarkdownHeadings(entry, content));
    findings.push(...validateMarkdownRules(entry, content));
    findings.push(...validateMarkdownSemantics(entry, content));

    for (const rule of entry.requiredRules || []) {
      if (!isCanonicalRequiredRuleName(rule)) continue;
      const rulePath = resolveRepoPath(cwd, `.qa-ai/rules/${rule}`, { label: 'required rule' });
      if (!(await pathExists(rulePath))) {
        findings.push({
          code: 'AGENT_MISSING_RULE',
          severity: 'error',
          file: entry.path,
          message: `Required rule does not exist: ${rule}.`
        });
      }
    }

    const links = extractMarkdownLinks(content);
    for (const link of links) {
      if (!link.url.startsWith('.') && !link.url.startsWith('/')) continue;
      try {
        if (link.url.startsWith('/')) throw new Error('absolute local link');
        const linkPath = link.url.split('#')[0];
        const repoRelativeLink = path.posix.normalize(path.posix.join(path.posix.dirname(entry.path), linkPath));
        const resolved = resolveRepoPath(cwd, repoRelativeLink, { label: 'link target' });
        if (!(await pathExists(resolved))) {
          findings.push({
            code: 'AGENT_BROKEN_LINK',
            severity: 'error',
            file: entry.path,
            line: link.line,
            message: `Broken local link: ${link.url}.`
          });
        }
        continue;
      } catch {
        findings.push({
          code: 'AGENT_BROKEN_LINK',
          severity: 'error',
          file: entry.path,
          line: link.line,
          message: 'Local link is invalid or escapes the repository.'
        });
      }
    }

    if (entry.category === 'specialist') {
      const policy = content.match(/## Artifact and handoff policy[^\n]*\n([\s\S]*?)(?=\n## |\s*$)/i)?.[1] || '';
      const allowedLine = policy.match(/Allowed evidence types:\*\*\s*([^\r\n]+)/i)?.[1] || '';
      const declaredEvidence = [...allowedLine.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
      const canonicalEvidence = new Set([
        'feature',
        'automation-script',
        'manual-charter',
        'test-plan',
        'technical-review',
        'residual-risk'
      ]);
      for (const evidenceType of declaredEvidence) {
        if (!canonicalEvidence.has(evidenceType)) {
          findings.push({
            code: 'AGENT_UNKNOWN_VOCABULARY',
            severity: 'error',
            file: entry.path,
            message: `Unknown specialist evidence type "${evidenceType}".`
          });
        }
      }

      const auxiliaryLine = policy.match(/Optional auxiliary artifact:\*\*\s*([^\r\n]+)/i)?.[1] || '';
      const markdownAuxiliary = auxiliaryLine.match(/`([^`]+)`/)?.[1] || '';
      const manifestAuxiliary = (entry.auxiliaryArtifacts || []).map((artifact) => artifact.path);
      if (markdownAuxiliary === 'none' && manifestAuxiliary.length > 0) {
        findings.push({
          code: 'AGENT_AUXILIARY_POLICY_MISMATCH',
          severity: 'error',
          file: entry.path,
          message: 'Markdown declares no auxiliary artifact but the manifest registers one.'
        });
      } else if (markdownAuxiliary && markdownAuxiliary !== 'none' && !manifestAuxiliary.includes(markdownAuxiliary)) {
        findings.push({
          code: 'AGENT_AUXILIARY_POLICY_MISMATCH',
          severity: 'error',
          file: entry.path,
          message: `Markdown auxiliary artifact is not registered: ${markdownAuxiliary}.`
        });
      }
    }
  }

  const sorted = sortFindings(findings);

  const errors = sorted.filter((f) => f.severity === 'error').map((f) => `[${f.code}] ${f.file}: ${f.message}`);
  const warnings = sorted.filter((f) => f.severity === 'warning').map((f) => `[${f.code}] ${f.file}: ${f.message}`);
  const ok = errors.length === 0;
  const categories = getCategoryCounts(contract);

  const extraJson = {
    validator: 'validate-agent-guidance',
    contractVersion: contract.version,
    summary: {
      registered: contract.guidance.length,
      discovered: discovered.length,
      errors: errors.length,
      warnings: warnings.length,
      categories
    }
  };

  if (jsonMode) {
    emitFindingsJson({ ok, errors, warnings, findings: sorted, extra: extraJson });
    process.exit(ok ? 0 : 1);
  }

  finishValidatorFindingsRun({
    ok,
    errors,
    warnings,
    findings: sorted,
    jsonMode: false,
    successMessage: `[PASS] Agent guidance contract valid. ${contract.guidance.length} files registered, ${discovered.length} discovered.`,
    failureMessage: `\nFAILED - ${errors.length} error(s), ${warnings.length} warning(s).`,
    extraJson
  });
}

runValidatorMain(import.meta.url, main);
