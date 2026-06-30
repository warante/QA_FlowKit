import { scanText } from './injection-patterns.mjs';
import { normalizeColumn, parseMarkdownTable } from './markdown-table.mjs';
import { getConfigValue, isIsoUtcDateString, loadQaAiConfig, pathExists, readText, resolveRepoPath } from './utils.mjs';
import { ARTIFACT_PATHS } from './artifact-paths.mjs';

export function compileRfIdMatcher(pattern) {
  const source = String(pattern || '').trim();
  const match = /^\^?([A-Za-z][A-Za-z0-9_-]*)-\\d\+\$?$/.exec(source);

  if (!match) {
    return {
      ok: false,
      error: `Unsupported RF ID pattern "${source}". Supported form: PREFIX-\\d+ with optional ^ and $ anchors.`
    };
  }

  const prefix = `${match[1]}-`;
  return {
    ok: true,
    pattern: source,
    test(id) {
      const value = String(id || '');
      return value.startsWith(prefix) && /^\d+$/.test(value.slice(prefix.length));
    }
  };
}

function intakeFindings(errors, warnings) {
  return [
    ...errors.map((message) => ({ message, severity: 'error' })),
    ...warnings.map((message) => ({ message, severity: 'warning' }))
  ];
}

/**
 * @returns {Promise<{ ok: boolean, errors: string[], warnings: string[], skipped?: boolean, findings?: object[] }>}
 */
export async function validateExternalIntake(cwd, options = {}) {
  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};
  const externalEnabled = getConfigValue(config, 'sources.external.enabled', false);

  const requirementsPath =
    options.requirementsPath ||
    getConfigValue(config, 'sources.external.requirementsImportPath', ARTIFACT_PATHS.importedRequirements);
  const casesPath =
    options.casesPath || getConfigValue(config, 'sources.external.casesImportPath', ARTIFACT_PATHS.importedCases);
  const rfPattern = options.rfPattern || getConfigValue(config, 'requirements.rfIdPattern', 'RF-\\d+');
  const rfMatcher = compileRfIdMatcher(rfPattern);
  const strictMode = Boolean(options.strict);
  const allowMissing = Boolean(options.allowMissing);

  const absReq = resolveRepoPath(cwd, requirementsPath, { label: 'imported requirements' });
  const absCases = resolveRepoPath(cwd, casesPath, { label: 'imported cases' });

  const reqExists = await pathExists(absReq);
  const casesExists = await pathExists(absCases);

  if (!externalEnabled && !reqExists && !casesExists) {
    return { ok: true, errors: [], warnings: [], skipped: true, findings: [] };
  }

  if (!reqExists && !casesExists) {
    if (allowMissing) return { ok: true, errors: [], warnings: [], findings: [] };
    const errors = [
      `Imported requirements file not found at ${requirementsPath}`,
      `Imported cases file not found at ${casesPath}`
    ];
    return { ok: false, errors, warnings: [], findings: intakeFindings(errors, []) };
  }

  const errors = [];
  const warnings = [];

  if (!rfMatcher.ok) {
    errors.push(rfMatcher.error);
  }

  if (reqExists) {
    const reqContent = await readText(absReq);
    for (const finding of scanText(reqContent)) {
      const msg = `${requirementsPath}:${finding.line}: injection pattern "${finding.pattern}" — ${finding.excerpt} (see untrusted-content.rules.md)`;
      if (strictMode) errors.push(msg);
      else warnings.push(msg);
    }

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
        if (rfMatcher.ok && !rfMatcher.test(rfId) && !rfId.startsWith('RF-PENDING')) {
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

      if (!externalKey) errors.push(`Requirements: Row ${row.line} (${rfId || 'unknown'}): missing External key.`);
      if (!title) errors.push(`Requirements: Row ${row.line} (${rfId || 'unknown'}): missing Title.`);
      if (!importedAt) {
        errors.push(`Requirements: Row ${row.line} (${rfId || 'unknown'}): missing Imported at timestamp.`);
      } else if (!isIsoUtcDateString(importedAt)) {
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

  if (casesExists) {
    const casesContent = await readText(absCases);
    for (const finding of scanText(casesContent)) {
      const msg = `${casesPath}:${finding.line}: injection pattern "${finding.pattern}" — ${finding.excerpt} (see untrusted-content.rules.md)`;
      if (strictMode) errors.push(msg);
      else warnings.push(msg);
    }

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
      } else if (seenExternalIds.has(externalId)) {
        errors.push(`Cases: Duplicate External ID "${externalId}" at row ${row.line}.`);
      } else {
        seenExternalIds.add(externalId);
      }

      if (!title) errors.push(`Cases: Row ${row.line} (${externalId || 'unknown'}): missing Title.`);
      if (!importedAt) {
        errors.push(`Cases: Row ${row.line} (${externalId || 'unknown'}): missing Imported at timestamp.`);
      } else if (!isIsoUtcDateString(importedAt)) {
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

  const ok = errors.length === 0;
  return { ok, errors, warnings, findings: intakeFindings(errors, warnings) };
}
