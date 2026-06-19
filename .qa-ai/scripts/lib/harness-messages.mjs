import { getConfigValue } from './utils.mjs';

export const BLOCKER_TYPES = ['approval', 'rf', 'validation', 'modification', 'missing-inputs'];

function languageTag(lang) {
  return String(lang || 'en')
    .toLowerCase()
    .startsWith('es')
    ? 'es'
    : 'en';
}

function phaseName(blocker) {
  return blocker.phaseName || blocker.phaseId || 'the active phase';
}

function listPaths(paths = []) {
  const clean = paths.filter(Boolean);
  if (clean.length === 0) return '';
  return clean.join(', ');
}

export function interfaceLanguage(config) {
  return getConfigValue(config, 'project.interfaceLanguage', getConfigValue(config, 'project.defaultLanguage', 'en'));
}

export function renderBlocker(blocker, lang = 'en') {
  const language = languageTag(lang);
  const gate = blocker.gate || '<gate>';
  const phase = phaseName(blocker);
  const paths = listPaths(blocker.paths || blocker.missing || blocker.missingInputs || blocker.missingOutputs || []);

  if (language === 'es') {
    if (blocker.type === 'approval') {
      return `Bloqueado ${phase}: falta aprobar la puerta "${gate}". Ejecuta: npx qa-flowkit run approve ${gate}`;
    }
    if (blocker.type === 'rf') {
      return `Bloqueado ${phase}: falta registrar el RF oficial antes de continuar. Ejecuta: npx qa-flowkit run set-rf RF-123`;
    }
    if (blocker.type === 'validation') {
      return `Bloqueado ${phase}: se agotaron los intentos de validacion. Corrige los artefactos y ejecuta: npx qa-flowkit run retry`;
    }
    if (blocker.type === 'modification') {
      const suffix = paths ? ` Archivos modificados: ${paths}.` : '';
      return `Bloqueado ${phase}: se modificaron salidas existentes y hace falta aprobacion especifica.${suffix} Ejecuta: npx qa-flowkit run approve ${gate}`;
    }
    if (blocker.type === 'missing-inputs') {
      const suffix = paths ? ` Entradas faltantes: ${paths}.` : '';
      return `Bloqueado ${phase}: faltan entradas requeridas para validar la fase.${suffix} Crea esas entradas y ejecuta: npx qa-flowkit run check`;
    }
    return `Bloqueado ${phase}: ${blocker.message || 'hay un bloqueo pendiente'}. Revisa el estado con: npx qa-flowkit run status`;
  }

  if (blocker.type === 'approval') {
    return `Blocked ${phase}: approval gate "${gate}" is required. Run: npx qa-flowkit run approve ${gate}`;
  }
  if (blocker.type === 'rf') {
    return `Blocked ${phase}: the official RF ID must be recorded before continuing. Run: npx qa-flowkit run set-rf RF-123`;
  }
  if (blocker.type === 'validation') {
    return `Blocked ${phase}: validation attempts have been exhausted. Fix the artifacts, then run: npx qa-flowkit run retry`;
  }
  if (blocker.type === 'modification') {
    const suffix = paths ? ` Modified files: ${paths}.` : '';
    return `Blocked ${phase}: existing outputs changed and scoped approval is required.${suffix} Run: npx qa-flowkit run approve ${gate}`;
  }
  if (blocker.type === 'missing-inputs') {
    const suffix = paths ? ` Missing inputs: ${paths}.` : '';
    return `Blocked ${phase}: required inputs are missing for this phase.${suffix} Create those inputs, then run: npx qa-flowkit run check`;
  }
  return `Blocked ${phase}: ${blocker.message || 'a blocker is pending'}. Check status with: npx qa-flowkit run status`;
}

export function renderBlockers(blockers = [], lang = 'en') {
  return blockers.map((blocker) => renderBlocker(blocker, lang));
}
