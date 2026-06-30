import { normalizeColumn, parseMarkdownTable, rowValues, splitMarkdownRow, isSeparatorRow } from './markdown-table.mjs';

const SECTION_ALIASES = {
  'proposed tests': ['pruebas propuestas'],
  'coverage obligations': ['obligaciones de cobertura'],
  'security review': ['revision de seguridad', 'revisión de seguridad'],
  'residual coverage gaps': ['brechas de cobertura residual'],
  'non-functional requirements': ['requisitos no funcionales'],
  'non-functional coverage': ['cobertura no funcional'],
  'non-functional traceability': ['trazabilidad no funcional']
};

export function extractSection(content, heading) {
  const lines = String(content || '')
    .replace(/\r/g, '')
    .split('\n');
  const normalizedHeading = normalizeColumn(heading.replace(/^#+\s*/, ''));
  const acceptedHeadings = new Set([normalizedHeading, ...(SECTION_ALIASES[normalizedHeading] || [])]);
  const start = lines.findIndex((line) => {
    const match = line.trim().match(/^##\s+(.+)$/);
    return match && acceptedHeadings.has(normalizeColumn(match[1]));
  });
  if (start === -1) return '';
  const endOffset = lines.slice(start + 1).findIndex((line) => /^##\s+/.test(line.trim()));
  const end = endOffset === -1 ? lines.length : start + 1 + endOffset;
  return lines
    .slice(start + 1, end)
    .join('\n')
    .trim();
}

export function parseSectionTable(content, heading, requiredColumns = []) {
  const section = extractSection(content, heading);
  if (!section) {
    return { exists: false, errors: [], rows: [], header: [] };
  }

  const parsed = parseMarkdownTable(section, { label: heading, requiredColumns });
  if (parsed.errors.length > 0) {
    return { exists: true, errors: parsed.errors, rows: [], header: [] };
  }

  return {
    exists: true,
    errors: [],
    rows: parsed.rows.map((row) => ({ line: row.line, values: row.values })),
    header: parsed.header
  };
}

/** @deprecated Prefer parseSectionTable; kept for callers that need raw row parsing. */
export function parseSectionTableLegacy(content, heading, requiredColumns = []) {
  const section = extractSection(content, heading);
  if (!section) {
    return { exists: false, errors: [], rows: [], header: [] };
  }

  const lines = section.split('\n');
  const tableLines = [];
  for (let index = 0; index < lines.length; index += 1) {
    const cells = splitMarkdownRow(lines[index]);
    if (cells) tableLines.push({ line: index + 1, cells });
  }
  if (tableLines.length < 2) {
    return { exists: true, errors: [`Section "${heading}" must contain a Markdown table.`], rows: [], header: [] };
  }

  const header = tableLines[0].cells;
  const normalizedHeader = header.map(normalizeColumn);
  const errors = [];
  if (!isSeparatorRow(tableLines[1].cells)) {
    errors.push(`Section "${heading}" must have a separator row after the header.`);
  }
  for (const column of requiredColumns) {
    if (!normalizedHeader.includes(normalizeColumn(column))) {
      errors.push(`Section "${heading}" is missing required column "${column}".`);
    }
  }

  const rows = tableLines.slice(2).flatMap((entry) => {
    if (entry.cells.length !== header.length || entry.cells.every((cell) => !cell.trim())) return [];
    return [{ line: entry.line, values: rowValues(header, entry.cells) }];
  });
  return { exists: true, errors, rows, header };
}
