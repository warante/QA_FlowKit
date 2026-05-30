export function normalizeColumn(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function splitMarkdownRow(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
  return trimmed
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

export function isSeparatorRow(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

export function rowValues(header, cells) {
  return Object.fromEntries(header.map((column, index) => [normalizeColumn(column), cells[index]]));
}

export function parseMarkdownTable(content, { label = 'Markdown table', requiredColumns = [] } = {}) {
  const lines = String(content || '')
    .replace(/\r/g, '')
    .split('\n');
  const errors = [];
  const tableLines = [];

  for (let index = 0; index < lines.length; index += 1) {
    const cells = splitMarkdownRow(lines[index]);
    if (!cells) continue;
    tableLines.push({ line: index + 1, cells });
  }

  if (tableLines.length === 0) {
    return { errors: [`${label} must contain a Markdown table.`], rows: [], header: [] };
  }
  if (tableLines.length === 1) {
    return { errors: [`${label} is missing a separator row and data rows.`], rows: [], header: tableLines[0].cells };
  }

  const header = tableLines[0].cells;
  const separatorLine = tableLines[1];
  const normalizedHeader = header.map(normalizeColumn);

  if (!isSeparatorRow(separatorLine.cells)) {
    errors.push(`Line ${separatorLine.line}: ${label} must have a Markdown separator row after the header.`);
  }
  if (separatorLine.cells.length !== header.length) {
    errors.push(
      `Line ${separatorLine.line}: separator has ${separatorLine.cells.length} cell(s), expected ${header.length}.`
    );
  }

  for (const column of requiredColumns) {
    if (!normalizedHeader.includes(normalizeColumn(column))) {
      errors.push(`${label} is missing required column "${column}".`);
    }
  }

  const rows = [];
  for (const row of tableLines.slice(2)) {
    if (row.cells.length !== header.length) {
      errors.push(`Line ${row.line}: row has ${row.cells.length} cell(s), expected ${header.length}.`);
      continue;
    }
    if (row.cells.every((cell) => cell.trim() === '')) {
      errors.push(`Line ${row.line}: row is empty.`);
      continue;
    }

    rows.push({
      line: row.line,
      cells: row.cells,
      values: rowValues(header, row.cells)
    });
  }

  return { errors, rows, header };
}
