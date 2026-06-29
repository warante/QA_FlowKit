import path from 'node:path';
import { FEATURE_SUBFOLDERS } from '../feature-layout.mjs';
import { ensureDir, getConfigValue, manifestEntry, resolveRepoPath, writeFileSafe } from '../utils.mjs';

export async function createFeatureFolders({ cwd, withFeatureFolders, config, manifestEntries, dirResults, writes }) {
  if (!withFeatureFolders) {
    console.log('\nSkipping feature category folders. Use init without --no-feature-folders to create them.');
    return;
  }

  const featureRoot = getConfigValue(config, 'gherkin.featurePath', 'features');
  for (const subfolder of FEATURE_SUBFOLDERS) {
    const folder = resolveRepoPath(cwd, path.join(featureRoot, subfolder), {
      label: `feature category folder "${subfolder}"`
    });
    const dirResult = await ensureDir(folder);
    dirResults.push(dirResult);
    if (dirResult.created) {
      manifestEntries.push(
        await manifestEntry(cwd, dirResult.path, {
          type: 'dir',
          category: 'generated',
          source: 'init'
        })
      );
    }

    const keepResult = await writeFileSafe(path.join(folder, '.gitkeep'), '', { force: false });
    writes.push(keepResult);
    if (keepResult.written) {
      manifestEntries.push(
        await manifestEntry(cwd, keepResult.path, {
          type: 'file',
          category: 'generated',
          source: 'init'
        })
      );
    }
  }
}
