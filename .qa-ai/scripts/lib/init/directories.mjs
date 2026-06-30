import { DEFAULT_FEATURE_PATH } from '../artifact-paths.mjs';

/**
 * Feature type subfolders are created lazily when the first .feature file is written.
 */
export async function createFeatureFolders({ withFeatureFolders }) {
  if (!withFeatureFolders) {
    console.log('\nSkipping feature category folders (--no-feature-folders).');
    return;
  }

  console.log(
    `\nFeature category subfolders under ${DEFAULT_FEATURE_PATH}/ are created when the first .feature file is written.`
  );
}
