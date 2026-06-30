import { normalizeColumn } from './markdown-table.mjs';
import { normalizeLineEndings } from './utils.mjs';

const DEFAULT_SECTION_ALIASES = {
  'proposed tests': ['pruebas propuestas'],
  'coverage obligations': ['obligaciones de cobertura'],
  'security review': ['revision de seguridad', 'revisión de seguridad'],
  'residual coverage gaps': ['brechas de cobertura residual'],
  'non-functional requirements': ['requisitos no funcionales'],
  'non-functional coverage': ['cobertura no funcional'],
  'non-functional traceability': ['trazabilidad no funcional']
};

function normalizeLines(content) {
  return normalizeLineEndings(content).split('\n');
}

/**
 * Extract markdown body after a ## heading (with optional bilingual aliases).
 * @param {string} content
 * @param {string} heading - heading text without leading #
 * @param {{ aliases?: Record<string, string[]>, exactMatch?: boolean }} [options]
 */
export function extractMarkdownSection(content, heading, options = {}) {
  const lines = normalizeLines(content);
  const aliases = { ...DEFAULT_SECTION_ALIASES, ...(options.aliases || {}) };

  if (options.exactMatch) {
    const start = lines.findIndex((line) => line.trim().toLowerCase() === String(heading).toLowerCase());
    if (start === -1) return '';
    const body = [];
    for (const line of lines.slice(start + 1)) {
      if (line.startsWith('## ')) break;
      body.push(line);
    }
    return body.join('\n');
  }

  const normalizedHeading = normalizeColumn(heading.replace(/^#+\s*/, ''));
  const acceptedHeadings = new Set([normalizedHeading, ...(aliases[normalizedHeading] || [])]);
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

/** Return content before the non-functional traceability section (functional matrix only). */
export function functionalMatrixContent(content) {
  const lines = normalizeLines(content);
  const nfrIndex = lines.findIndex((line) => {
    const match = line.trim().match(/^##\s+(.+)$/);
    if (!match) return false;
    const heading = normalizeColumn(match[1]);
    return heading === 'non-functional traceability' || heading === 'trazabilidad no funcional';
  });
  if (nfrIndex === -1) return content;
  return lines.slice(0, nfrIndex).join('\n');
}
