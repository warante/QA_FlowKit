import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { functionalMatrixContent } from './markdown-section.mjs';
import { normalizeColumn, parseMarkdownTable } from './markdown-table.mjs';
import { ARTIFACT_PATHS, getConfigValue, loadQaAiConfig, resolveRepoPath } from './utils.mjs';
import { redactSecretsInText } from './secret-patterns.mjs';

function git(cwd, args) {
  const result = spawnSync('git', ['--literal-pathspecs', ...args], {
    cwd,
    encoding: 'utf8',
    shell: false,
    timeout: 30000,
    maxBuffer: 8 * 1024 * 1024
  });
  if (result.error || result.status !== 0) {
    throw new Error(`Git ${args[0]} failed. Check repository history and fetch the required refs before retrying.`);
  }
  return result.stdout;
}

function localPath(value) {
  if (typeof value !== 'string' || !value || [...value].some((char) => char.charCodeAt(0) < 32)) return null;
  const text = value.replaceAll('\\', '/');
  if (text.includes(':') || path.posix.isAbsolute(text) || path.win32.isAbsolute(value)) return null;
  const normalized = path.posix.normalize(text);
  return normalized === '.' || normalized === '..' || normalized.startsWith('../') ? null : normalized;
}

export function parsePrChangedFiles(output) {
  if (!output) return [];
  const parts = output.split('\0');
  if (parts.pop() !== '') throw new Error('Invalid NUL-delimited Git diff.');
  const files = [];
  for (let index = 0; index < parts.length;) {
    const status = parts[index++];
    if (!/^(?:[AMDTUXB]|[RC]\d{1,3})$/.test(status)) throw new Error('Invalid Git change status.');
    const first = parts[index++];
    const renamed = /^[RC]/.test(status);
    const destination = renamed ? parts[index++] : first;
    if (!first || !destination) throw new Error('Incomplete Git change record.');
    files.push({ status, path: destination, ...(renamed ? { previousPath: first } : {}) });
  }
  return files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

function identifier(value) {
  const text = String(value || '').trim();
  return /^(?:-|n\/a|none|pending)?$/i.test(text) ? '' : text;
}

function matrixAt(cwd, commit, matrixPath, warnings) {
  const entry = git(cwd, ['ls-tree', '-z', commit, '--', matrixPath]);
  if (!entry) {
    warnings.push({ code: 'matrix-missing', commit });
    return [];
  }
  if (!entry.startsWith('100644 blob ') && !entry.startsWith('100755 blob ')) {
    throw new Error('Traceability matrix must be a committed regular file.');
  }
  const content = git(cwd, ['cat-file', 'blob', `${commit}:${matrixPath}`]);
  const table = parseMarkdownTable(functionalMatrixContent(content), {
    label: 'Traceability matrix',
    requiredColumns: ['RF', 'Feature File', 'Test Management Case ID']
  });
  if (table.errors.length)
    throw new Error('Committed traceability matrix is malformed; validate and repair it before summarizing.');
  return table.rows.map((row) => ({
    rf: identifier(row.values[normalizeColumn('RF')]),
    testId: identifier(row.values[normalizeColumn('Test Management Case ID')]),
    feature: localPath(row.values[normalizeColumn('Feature File')]),
    links: ['Requirement Source', 'Feature File', 'Automation File']
      .map((column) => ({
        column,
        path: localPath(row.values[normalizeColumn(column)])
      }))
      .filter((link) => link.path),
    commit,
    line: row.line
  }));
}

function sanitize(value) {
  if (typeof value === 'string') return redactSecretsInText(value);
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitize(item)]));
  return value;
}

/** Read committed PR scope only; exact matrix links are declarations, never proven code coverage. */
export async function buildPrSummary(cwd, { base = 'main', head = 'HEAD', matrixPath: override } = {}) {
  if (path.resolve(git(cwd, ['rev-parse', '--show-toplevel']).trim()) !== path.resolve(cwd)) {
    throw new Error('Run pr-summary from the repository root.');
  }
  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};
  const matrixPath = localPath(
    override || getConfigValue(config, 'traceability.matrixPath', ARTIFACT_PATHS.traceabilityMatrix)
  );
  if (!matrixPath) throw new Error('Traceability matrix path must be repository-relative.');
  const resolveCommit = (ref) => {
    if (typeof ref !== 'string' || !ref || ref.startsWith('-')) throw new Error('Invalid comparison ref.');
    return git(cwd, ['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`]).trim();
  };
  const baseCommit = resolveCommit(base);
  const headCommit = resolveCommit(head);
  const mergeBases = git(cwd, ['merge-base', '--all', baseCommit, headCommit]).trim().split(/\s+/);
  if (mergeBases.length !== 1 || !mergeBases[0])
    throw new Error('A unique merge base is required for the PR comparison.');
  const mergeBase = mergeBases[0];
  const warnings = [];
  if (git(cwd, ['status', '--porcelain', '--untracked-files=normal']).trim())
    warnings.push({ code: 'working-tree-excluded' });
  const files = parsePrChangedFiles(
    git(cwd, [
      'diff',
      '--no-ext-diff',
      '--no-textconv',
      '--name-status',
      '-z',
      '--find-renames',
      mergeBase,
      headCommit,
      '--'
    ])
  );
  const beforeRows = matrixAt(cwd, mergeBase, matrixPath, warnings);
  const afterRows = mergeBase === headCommit ? beforeRows : matrixAt(cwd, headCommit, matrixPath, warnings);
  if (files.some((file) => [file.path, file.previousPath].includes(matrixPath)))
    warnings.push({ code: 'matrix-changed' });
  const affected = new Map();
  const unmappedFiles = [];
  for (const file of files) {
    let mapped = false;
    for (const row of [...beforeRows, ...afterRows]) {
      if (!row.rf) continue;
      for (const link of row.links) {
        if (![file.path, file.previousPath].includes(link.path)) continue;
        mapped = true;
        if (!affected.has(row.rf)) affected.set(row.rf, { rf: row.rf, evidence: [], reviewTestIds: [] });
        affected.get(row.rf).evidence.push({
          file: file.path,
          linkedPath: link.path,
          column: link.column,
          matrixLine: row.line,
          commit: row.commit
        });
      }
    }
    if (!mapped) unmappedFiles.push(file.path);
  }
  const affectedRequirements = [...affected.values()].sort((a, b) => (a.rf < b.rf ? -1 : a.rf > b.rf ? 1 : 0));
  for (const requirement of affectedRequirements) {
    requirement.evidence = [...new Map(requirement.evidence.map((item) => [JSON.stringify(item), item])).values()];
    requirement.reviewTestIds = [
      ...new Set(
        afterRows.filter((row) => row.rf === requirement.rf && row.testId && row.feature).map((row) => row.testId)
      )
    ].sort();
  }
  return sanitize({
    schemaVersion: 1,
    ok: true,
    language:
      getConfigValue(config, 'project.interfaceLanguage', getConfigValue(config, 'project.defaultLanguage', 'en')) ===
      'es'
        ? 'es'
        : 'en',
    comparison: { baseCommit, headCommit, mergeBase, scope: 'committed-merge-base-to-head' },
    traceability: { matrixPath, configSource: 'workspace', snapshots: [...new Set([mergeBase, headCommit])] },
    files,
    affectedRequirements,
    unmappedFiles,
    warnings,
    verification: { testsExecuted: false, validationExecuted: false, coverageAssessed: false }
  });
}

function cell(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('|', '&#124;')
    .replaceAll('`', '&#96;')
    .replaceAll('@', '&#64;')
    .replace(/[\\[\]()*_#!~]/g, (char) => `&#${char.charCodeAt(0)};`)
    .replace(/[\r\n\t]/g, ' ');
}

export function formatPrSummary(report) {
  const es = report.language === 'es';
  const lines = [
    es ? '# Resumen de impacto para PR' : '# PR impact summary',
    '',
    es
      ? 'Solo commits; los cambios locales quedan fuera del diff. No se han ejecutado tests ni validadores. La cobertura no se ha evaluado.'
      : 'Committed changes only; local changes are excluded from the diff. Tests and validators were not executed. Coverage was not assessed.',
    '',
    `- Base: ${cell(report.comparison.baseCommit)}`,
    `- ${es ? 'Base común' : 'Merge base'}: ${cell(report.comparison.mergeBase)}`,
    `- ${es ? 'Destino' : 'Head'}: ${cell(report.comparison.headCommit)}`,
    `- ${es ? 'Matriz' : 'Matrix'}: ${cell(report.traceability.matrixPath)}`,
    es
      ? '- La ruta de la matriz y el idioma se resuelven desde la configuración local; la matriz se lee de los commits.'
      : '- Matrix path and language come from workspace config; matrix contents come from the commits.',
    '',
    es ? '## Archivos cambiados' : '## Changed files',
    '',
    es ? '| Estado | Ruta | Ruta anterior |' : '| Status | Path | Previous path |',
    '| --- | --- | --- |'
  ];
  for (const file of report.files)
    lines.push(`| ${cell(file.status)} | ${cell(file.path)} | ${cell(file.previousPath || '-')} |`);
  if (!report.files.length)
    lines.push(es ? 'Sin cambios entre la base común y el destino.' : 'No changes between merge base and head.');
  lines.push(
    '',
    es ? '## Requisitos vinculados y tests para revisar' : '## Linked requirements and tests to review',
    '',
    es
      ? 'Vínculos declarados en la matriz, no dependencias de código demostradas. Los tests listados no son una selección completa ni prueba de existencia o ejecución.'
      : 'Declared matrix links, not proven code dependencies. Listed tests are not an exhaustive selection or proof of existence or execution.',
    '',
    es ? '| RF | IDs de tests |' : '| RF | Test IDs |',
    '| --- | --- |'
  );
  for (const item of report.affectedRequirements)
    lines.push(`| ${cell(item.rf)} | ${cell(item.reviewTestIds.join(', ') || '-')} |`);
  if (!report.affectedRequirements.length)
    lines.push(
      es
        ? 'Sin vínculos exactos encontrados; esto no implica ausencia de impacto.'
        : 'No exact links found; this does not imply no impact.'
    );
  lines.push(
    '',
    es ? '### Evidencia de vinculación' : '### Link evidence',
    '',
    es
      ? '| RF | Archivo | Columna de matriz | Línea de matriz | Commit |'
      : '| RF | File | Matrix column | Matrix line | Commit |',
    '| --- | --- | --- | --- | --- |'
  );
  for (const item of report.affectedRequirements)
    for (const evidence of item.evidence) {
      lines.push(
        `| ${cell(item.rf)} | ${cell(evidence.linkedPath)} | ${cell(evidence.column)} | ${evidence.matrixLine} | ${cell(evidence.commit)} |`
      );
    }
  lines.push(
    '',
    es ? '## Archivos sin vínculo: revisión manual pendiente' : '## Unmapped files: manual review pending',
    ''
  );
  for (const file of report.unmappedFiles) lines.push(`- ${cell(file)}`);
  if (!report.unmappedFiles.length)
    lines.push(
      es
        ? 'Ninguno en este diff. No se garantiza la cobertura funcional.'
        : 'None in this diff. Functional coverage is not guaranteed.'
    );
  const warnings = es
    ? {
        'matrix-missing': 'No hay matriz en el commit indicado; la trazabilidad es incompleta.',
        'matrix-changed': 'La matriz cambió: revisa sus vínculos antes de usar este resumen.',
        'working-tree-excluded': 'Hay cambios locales o archivos sin seguimiento excluidos del diff.'
      }
    : {
        'matrix-missing': 'Matrix missing at the indicated commit; traceability is incomplete.',
        'matrix-changed': 'The matrix changed: review its links before using this summary.',
        'working-tree-excluded': 'Local changes or untracked files are excluded from the diff.'
      };
  lines.push('', es ? '## Advertencias' : '## Warnings', '');
  for (const warning of report.warnings)
    lines.push(`- ${warnings[warning.code]}${warning.commit ? ` (${cell(warning.commit)})` : ''}`);
  lines.push(
    '',
    es ? '## Comprobaciones pendientes' : '## Pending verification',
    '',
    es
      ? '- Revisar los archivos sin vínculo y la trazabilidad, incluidos los NFR (no evaluados aquí).'
      : '- Review unmapped files and traceability, including NFRs (not assessed here).',
    es
      ? '- Ejecutar los tests aplicables y validate-target; vincular evidencia del mismo commit antes de decidir un gate.'
      : '- Run applicable tests and validate-target; link evidence for the same commit before deciding a gate.',
    es
      ? '- Este resumen no aprueba una PR, un release ni escrituras externas.'
      : '- This summary does not approve a PR, release or external writes.'
  );
  return `${lines.join('\n')}\n`;
}

export async function writePrSummary(cwd, output, content, { force = false } = {}) {
  if (!localPath(output)) throw new Error('Output must be a repository-relative path.');
  const target = resolveRepoPath(cwd, output, { label: 'PR summary output' });
  // Require an existing, safe parent instead of creating directories through an unchecked symlink.
  resolveRepoPath(cwd, path.dirname(output), { label: 'PR summary parent', allowRoot: true });
  const parent = await fs.realpath(path.dirname(target));
  resolveRepoPath(cwd, parent, { label: 'PR summary parent', allowRoot: true });
  try {
    if ((await fs.lstat(target)).isSymbolicLink()) throw new Error('Refusing to overwrite a symlink.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await fs.writeFile(target, content, { encoding: 'utf8', flag: force ? 'w' : 'wx' });
}
