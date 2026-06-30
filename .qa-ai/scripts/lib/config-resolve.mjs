import { normalizeQaTrack } from './harness-contract.mjs';
import { interfaceLanguage } from './harness-messages.mjs';
import { getConfigValue, loadQaAiConfig } from './utils.mjs';

/**
 * @param {string} cwd
 * @returns {Promise<{
 *   ok: boolean,
 *   configPath: string,
 *   source: string,
 *   dualConfig: boolean,
 *   interfaceLanguage: string,
 *   gherkinLanguage: string,
 *   qaTrack: string,
 *   aiTestingEnabled: boolean
 * }>}
 */
export async function resolveProjectConfigSummary(cwd) {
  const configInfo = await loadQaAiConfig(cwd);

  if (!configInfo.exists) {
    return {
      ok: false,
      configPath: configInfo.relPath || '.qa-ai/qa-ai.config.yaml',
      source: configInfo.source || 'missing',
      dualConfig: Boolean(configInfo.dualConfig),
      interfaceLanguage: 'en',
      gherkinLanguage: 'en',
      qaTrack: 'standard',
      aiTestingEnabled: false
    };
  }

  const config = configInfo.data;
  return {
    ok: true,
    configPath: configInfo.relPath,
    source: configInfo.source,
    dualConfig: Boolean(configInfo.dualConfig),
    interfaceLanguage: interfaceLanguage(config),
    gherkinLanguage: getConfigValue(config, 'gherkin.language', 'en'),
    qaTrack: normalizeQaTrack(getConfigValue(config, 'project.qaTrack', 'standard')),
    aiTestingEnabled: Boolean(getConfigValue(config, 'aiTesting.enabled', false))
  };
}

export function formatProjectConfigSummary(summary) {
  if (!summary.ok) {
    return `Config missing (${summary.configPath}). Interface language: en (default). Gherkin: en (default). Track: standard (default). aiTesting.enabled: false.`;
  }
  const interfaceLabel = summary.interfaceLanguage === 'es' ? 'Spanish' : 'English';
  return `Config resolved (${summary.configPath}). Interface language: ${interfaceLabel} (${summary.interfaceLanguage}). Gherkin: ${summary.gherkinLanguage}. Track: ${summary.qaTrack}. aiTesting.enabled: ${summary.aiTestingEnabled}.`;
}
