import { getConfigValue } from './utils.mjs';
import { slug } from './project-config.mjs';

export function isMaestroFramework(value) {
  return slug(value) === 'maestro';
}

export function usesMaestro(config) {
  return isMaestroFramework(getConfigValue(config, 'automation.mobile.framework', ''));
}

export function maestroFlowsPath(config) {
  return String(getConfigValue(config, 'automation.mobile.flowsPath', 'tests/maestro/flows')).replace(/\\/g, '/');
}
