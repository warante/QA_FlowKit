export const ACTIVE_CONFIG = '.release-please-config.json';
export const STABLE_CONFIG = '.release-please-config.stable.json';

export function packageKeys(config) {
  return Object.keys(config.packages || {}).sort();
}

export function isActiveStablePolicy(config) {
  return config.prerelease === false && config['prerelease-type'] === undefined;
}

export function isPreparedStablePolicy(config) {
  return isActiveStablePolicy(config);
}

export function normalizeConfigForComparison(config) {
  const copy = JSON.parse(JSON.stringify(config));
  delete copy.prerelease;
  delete copy['prerelease-type'];
  return copy;
}

export function configsMatchForStableMerge(active, prepared) {
  return (
    isActiveStablePolicy(active) &&
    isPreparedStablePolicy(prepared) &&
    JSON.stringify(normalizeConfigForComparison(active)) === JSON.stringify(normalizeConfigForComparison(prepared))
  );
}
