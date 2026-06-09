import path from 'node:path';

const sequencePattern = /^\s*-\s+([A-Za-z][A-Za-z0-9]*):?/;
const runFlowPattern = /^\s*-\s+runFlow:\s*["']?([^"'#\s]+)["']?\s*$/;

export function validateMaestroFlowContent(content, filePath) {
  const errors = [];
  const warnings = [];
  const text = String(content || '').replace(/\r/g, '');
  const lines = text.split('\n');
  const significant = lines.map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
  const separatorIndex = significant.indexOf('---');

  if (significant.length === 0) {
    return { ok: false, errors: ['Maestro flow is empty.'], warnings, referencedFlows: [] };
  }
  if (!significant[0].startsWith('appId:')) {
    errors.push('Maestro flow must start with appId front matter.');
  }
  if (separatorIndex < 1) {
    errors.push('Maestro flow must include a --- separator after front matter.');
  }

  const commandLines = separatorIndex >= 0 ? significant.slice(separatorIndex + 1) : [];
  const commands = commandLines.map((line) => line.match(sequencePattern)?.[1]).filter(Boolean);
  if (commands.length === 0) {
    errors.push('Maestro flow must contain at least one sequence command.');
  }
  if (!commands.includes('assertVisible') && !commands.includes('assertNotVisible')) {
    warnings.push('Maestro flow has no visible-state assertion.');
  }

  const referencedFlows = [];
  for (const line of lines) {
    const match = line.match(runFlowPattern);
    if (!match) continue;
    const normalized = match[1].replace(/\\/g, '/');
    if (path.posix.isAbsolute(normalized) || normalized.split('/').includes('..')) {
      errors.push(`runFlow target must stay inside the mobile test root: ${normalized}`);
    } else {
      referencedFlows.push(normalized);
    }
  }

  if (!String(filePath).endsWith('.yaml') && !String(filePath).endsWith('.yml')) {
    errors.push('Maestro flow files must use .yaml or .yml.');
  }

  return { ok: errors.length === 0, errors, warnings, referencedFlows };
}
