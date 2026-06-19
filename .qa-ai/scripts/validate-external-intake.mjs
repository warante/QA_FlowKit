#!/usr/bin/env node
import { scanText } from './lib/injection-patterns.mjs';
import { normalizeColumn, parseMarkdownTable } from './lib/markdown-table.mjs';
import {
  getConfigValue,
  loadQaAiConfig,
  logHeader,
  parseArgs,
  pathExists,
  readText,
  resolveRepoPath
} from './lib/utils.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-external-intake.mjs [options]

Options:
  --requirements-path <file>  Override imported requirements path
  --cases-path <file>         Override imported cases path
  --rf-pattern <regex>        Override RF ID pattern (default: RF-\\\\d+)
  --allow-missing             Return success if artifacts are missing
  --strict                    Treat injection-scan findings as errors
  --json                      Print machine-readable JSON only
  --help                      Show this help

Validates imported-requirements.md and imported-cases.md:
  - Required table columns and non-empty values
  - Unique RF IDs (requirements) and External IDs (cases)
  - ISO 8601 timestamps
  - RF ID format against configured pattern
  - Injection scan on all imported text (findings are warnings; --strict turns them into errors)
`);
}

const ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

function isValidIso(value) {
  return ISO_TIMESTAMP_RE.test(String(value || '').trim());
}

function validateRfId(id, pattern) {
  try {
    return new RegExp(pattern).test(id);
  } catch {
    return false;
  }
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = Boolean(args.json);
  if (!jsonMode) {
    logHeader('QA AI external intake validator');
  }

  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};

  const externalEnabled = getConfigValue(config, 'sources.external.enabled', false);

  const requirementsPath =
    args['requirements-path'] ||
    getConfigValue(config, 'sources.external.requirementsImportPath', 'qa-ai-output/imported-requirements.md');
  const casesPath =
    args['cases-path'] || getConfigValue(config, 'sources.external.casesImportPath', 'qa-ai-output/imported-cases.md');
  const rfPattern = args['rf-pattern'] || getConfigValue(config, 'requirements.rfIdPattern', 'RF-\\d+');
  const strictMode = Boolean(args.strict);
  const allowMissing = Boolean(args['allow-missing']);

  const absReq = resolveRepoPath(cwd, requirementsPath, { label: 'imported requirements' });
  const absCases = resolveRepoPath(cwd, casesPath, { label: 'imported cases' });

  const reqExists = await pathExists(absReq);
  const casesExists = await pathExists(absCases);

  if (!externalEnabled && !reqExists && !casesExists) {
    // Not enabled and no artifacts — silently pass (standard case)
    if (jsonMode) {
      console.log(JSON.stringify({ ok: true, skipped: true, errors: [], warnings: [] }));
    } else {
      console.log('Skipping external intake validation (sources.external.enabled is false and artifacts absent).');
    }
    return;
  }

  if (!reqExists && !casesExists) {
    if (allowMissing) {
      if (jsonMode) {
        console.log(JSON.stringify({ ok: true, errors: [], warnings: [] }));
      } else {
        console.log('Skipping external intake validation (missing artifacts under --allow-missing).');
      }
      return;
    }
    const errors = [];
    errors.push(`Imported requirements file not found at ${requirementsPath}`);
    errors.push(`Imported cases file not found at ${casesPath}`);
    if (jsonMode) {
      console.log(JSON.stringify({ ok: false, errors, warnings: [] }));
    } else {
      for (const err of errors) console.error(`[FAIL] ${err}`);
    }
    process.exit(1);
  }

  const errors = [];
  const warnings = [];

  // ─────────────────────────────────────────────
  // Validate imported-requirements.md
  // ─────────────────────────────────────────────
  if (reqExists) {
    const reqContent = await readText(absReq);

    // Injection scan
    const reqInjection = scanText(reqContent);
    for (const finding of reqInjection) {
      const msg = `${requirementsPath}:${finding.line}: injection pattern "${finding.pattern}" — ${finding.excerpt} (see untrusted-content.rules.md)`;
      if (strictMode) {
        errors.push(msg);
      } else {
        warnings.push(msg);
      }
    }

    // Parse index table
    const reqTable = parseMarkdownTable(reqContent, {
      label: 'Imported requirements index table',
      requiredColumns: ['RF ID', 'External key', 'Title', 'Source', 'Imported at', 'Content hash']
    });
    errors.push(...reqTable.errors.map((e) => `Requirements: ${e}`));

    const seenRfIds = new Set();
    for (const row of reqTable.rows) {
      const rfId = String(row.values[normalizeColumn('RF ID')] || '').trim();
      const externalKey = String(row.values[normalizeColumn('External key')] || '').trim();
      const title = String(row.values[normalizeColumn('Title')] || '').trim();
      const importedAt = String(row.values[normalizeColumn('Imported at')] || '').trim();
      const contentHash = String(row.values[normalizeColumn('Content hash')] || '').trim();

      if (!rfId) {
        errors.push(`Requirements: Row ${row.line} is missing an RF ID.`);
      } else {
        if (!validateRfId(rfId, rfPattern) && !rfId.startsWith('RF-PENDING')) {
          errors.push(
            `Requirements: Row ${row.line}: RF ID "${rfId}" does not match configured pattern "${rfPattern}".`
          );
        }
        if (seenRfIds.has(rfId)) {
          errors.push(`Requirements: Duplicate RF ID "${rfId}" at row ${row.line}.`);
        } else {
          seenRfIds.add(rfId);
        }
      }

      if (!externalKey) {
        errors.push(`Requirements: Row ${row.line} (${rfId || 'unknown'}): missing External key.`);
      }

      if (!title) {
        errors.push(`Requirements: Row ${row.line} (${rfId || 'unknown'}): missing Title.`);
      }

      if (!importedAt) {
        errors.push(`Requirements: Row ${row.line} (${rfId || 'unknown'}): missing Imported at timestamp.`);
      } else if (!isValidIso(importedAt)) {
        errors.push(
          `Requirements: Row ${row.line} (${rfId || 'unknown'}): "Imported at" value "${importedAt}" is not a valid ISO 8601 UTC timestamp (expected format: YYYY-MM-DDTHH:MM:SSZ).`
        );
      }

      if (!contentHash) {
        errors.push(`Requirements: Row ${row.line} (${rfId || 'unknown'}): missing Content hash.`);
      }
    }

    if (reqTable.rows.length === 0 && reqTable.errors.length === 0) {
      warnings.push(`Requirements: Index table in ${requirementsPath} has no rows.`);
    }
  } else if (externalEnabled) {
    errors.push(`Imported requirements file not found at ${requirementsPath} (sources.external.enabled is true).`);
  }

  // ─────────────────────────────────────────────
  // Validate imported-cases.md
  // ─────────────────────────────────────────────
  if (casesExists) {
    const casesContent = await readText(absCases);

    // Injection scan
    const caseInjection = scanText(casesContent);
    for (const finding of caseInjection) {
      const msg = `${casesPath}:${finding.line}: injection pattern "${finding.pattern}" — ${finding.excerpt} (see untrusted-content.rules.md)`;
      if (strictMode) {
        errors.push(msg);
      } else {
        warnings.push(msg);
      }
    }

    // Parse cases table
    const casesTable = parseMarkdownTable(casesContent, {
      label: 'Imported cases table',
      requiredColumns: ['External ID', 'Title', 'Section', 'Status', 'Imported at']
    });
    errors.push(...casesTable.errors.map((e) => `Cases: ${e}`));

    const seenExternalIds = new Set();
    for (const row of casesTable.rows) {
      const externalId = String(row.values[normalizeColumn('External ID')] || '').trim();
      const title = String(row.values[normalizeColumn('Title')] || '').trim();
      const importedAt = String(row.values[normalizeColumn('Imported at')] || '').trim();

      if (!externalId) {
        errors.push(`Cases: Row ${row.line} is missing an External ID.`);
      } else {
        if (seenExternalIds.has(externalId)) {
          errors.push(`Cases: Duplicate External ID "${externalId}" at row ${row.line}.`);
        } else {
          seenExternalIds.add(externalId);
        }
      }

      if (!title) {
        errors.push(`Cases: Row ${row.line} (${externalId || 'unknown'}): missing Title.`);
      }

      if (!importedAt) {
        errors.push(`Cases: Row ${row.line} (${externalId || 'unknown'}): missing Imported at timestamp.`);
      } else if (!isValidIso(importedAt)) {
        errors.push(
          `Cases: Row ${row.line} (${externalId || 'unknown'}): "Imported at" value "${importedAt}" is not a valid ISO 8601 UTC timestamp (expected format: YYYY-MM-DDTHH:MM:SSZ).`
        );
      }
    }

    if (casesTable.rows.length === 0 && casesTable.errors.length === 0) {
      warnings.push(`Cases: Table in ${casesPath} has no rows.`);
    }
  } else if (externalEnabled) {
    errors.push(`Imported cases file not found at ${casesPath} (sources.external.enabled is true).`);
  }

  // ─────────────────────────────────────────────
  // Output results
  // ─────────────────────────────────────────────
  const ok = errors.length === 0;

  if (jsonMode) {
    const findings = [
      ...errors.map((msg) => ({ message: msg, severity: 'error' })),
      ...warnings.map((msg) => ({ message: msg, severity: 'warning' }))
    ];
    console.log(JSON.stringify({ ok, findings }));
    process.exit(ok ? 0 : 1);
  }

  for (const w of warnings) console.log(`[WARN] ${w}`);

  if (!ok) {
    for (const err of errors) console.error(`[FAIL] ${err}`);
    console.error(`\nFAILED - ${errors.length} external intake validation error(s).`);
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log(`\n[PASS] External intake artifacts valid (${warnings.length} warning(s)).`);
  } else {
    console.log('[PASS] External intake artifacts pass all validation checks.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
