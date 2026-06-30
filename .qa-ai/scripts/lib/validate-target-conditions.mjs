import { usesKarate } from './automation-framework.mjs';
import { usesMaestro } from './mobile-automation.mjs';
import { getConfigValue, pathExists, resolveRepoPath, ARTIFACT_PATHS } from './utils.mjs';

/**
 * Evaluate declarative target-validator inclusion rules from VALIDATOR_REGISTRY.targetWhen.
 * @param {object} entry
 * @param {object} context
 * @returns {Promise<boolean>}
 */
export async function shouldIncludeTargetValidator(entry, context) {
  const when = entry?.targetWhen;
  if (!when) return true;

  const { config, args, track, coverageMode, qualityMode, syncMode, externalIntakeEnabled, cwd } = context;

  if (when.skipFlag && args[when.skipFlag]) return false;
  if (when.tracks && !when.tracks.includes(track)) return false;
  if (when.tracksExclude && when.tracksExclude.includes(track)) return false;
  if (when.syncMode && syncMode !== when.syncMode) return false;
  if (when.externalIntake && !externalIntakeEnabled) return false;
  if (when.configMode) {
    const mode = String(getConfigValue(config, when.configMode, 'off')).toLowerCase();
    if (when.configModeNot === 'off' && mode === 'off') return false;
    if (when.configModeIs && mode !== when.configModeIs) return false;
  }
  if (when.qualityModeNotOff && qualityMode === 'off') return false;
  if (when.coverageModeNotOff && coverageMode === 'off') return false;
  if (when.usesKarate && !usesKarate(config)) return false;
  if (when.usesMaestro && !usesMaestro(config)) return false;
  if (when.executionPaths) {
    const hasResults = getConfigValue(config, 'execution.resultsPaths', []).length > 0;
    const hasEval = getConfigValue(config, 'execution.evalResultsPaths', []).length > 0;
    if (!hasResults && !hasEval) return false;
  }
  if (when.artifactExists) {
    const exists = await pathExists(
      resolveRepoPath(cwd, ARTIFACT_PATHS[when.artifactExists], {
        label: `${when.artifactExists} check`,
        allowRoot: true
      })
    );
    if (!exists) return false;
  }
  if (when.enterpriseTrack && track !== 'enterprise') return false;
  if (when.designTracks && !when.designTracks.includes(track)) return false;

  return true;
}
