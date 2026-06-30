#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { cliPath, installPackTarball, node, repoRoot, resolvePackTarball, run } from './lib/ci-helpers.mjs';

function argument(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

const requestedSpec = argument('--package-spec', process.env.QA_FLOWKIT_PACKAGE_SPEC || 'local');
const reportPath = argument('--report', process.env.QA_FLOWKIT_COMPATIBILITY_REPORT || '');

function validatePackageSpec(value) {
  if (value === 'local') return value;
  if (/^qa-flowkit@(?:beta|rc|latest)$/.test(value)) return value;
  if (/^qa-flowkit@\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value)) return value;
  throw new Error(
    `Unsupported package spec "${value}". Use local, qa-flowkit@rc, qa-flowkit@beta, qa-flowkit@latest or an exact version.`
  );
}

function extraInitArgsForExample(example) {
  if (example.preset === 'maestro-karate-mobile') {
    return ['--set', 'automation.mobile.appId=com.example.qaflowkit'];
  }
  return [];
}

function validateManifest(manifest) {
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.examples) || manifest.examples.length === 0) {
    throw new Error('examples/compatibility.json must use schemaVersion 1 and define at least one example.');
  }

  const ids = new Set();
  for (const example of manifest.examples) {
    if (!/^[a-z0-9-]+$/.test(example.id || '')) {
      throw new Error(`Invalid example id in compatibility manifest: ${example.id || '(missing)'}`);
    }
    if (ids.has(example.id)) throw new Error(`Duplicate example id in compatibility manifest: ${example.id}`);
    ids.add(example.id);
    if (!/^examples\/[a-z0-9-]+$/.test(example.path || '')) {
      throw new Error(`Example path must be a direct child of examples/: ${example.path || '(missing)'}`);
    }
    if (!/^[a-z0-9-]+$/.test(example.preset || '')) {
      throw new Error(`Invalid preset for ${example.id}: ${example.preset || '(missing)'}`);
    }
  }
}

async function filesUnder(directory) {
  const files = [];

  async function visit(current) {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
      } else {
        files.push(absolutePath);
      }
    }
  }

  await visit(directory);
  return files;
}

async function hasExampleEntry(exampleRoot, compactRel, legacyRel) {
  for (const rel of [compactRel, legacyRel]) {
    try {
      await fs.stat(path.join(exampleRoot, rel));
      return rel;
    } catch {
      // try next layout
    }
  }
  return null;
}

async function verifyCanonicalExampleSources(manifest) {
  const trackedOrNew = new Set(
    run('git', ['ls-files', '--', 'examples'], { cwd: repoRoot })
      .stdout.split(/\r?\n/)
      .filter(Boolean)
      .map((file) => file.replaceAll('\\', '/'))
  );
  for (const file of run('git', ['ls-files', '--others', '--exclude-standard', '--', 'examples'], { cwd: repoRoot })
    .stdout.split(/\r?\n/)
    .filter(Boolean)
    .map((item) => item.replaceAll('\\', '/'))) {
    trackedOrNew.add(file);
  }

  for (const example of manifest.examples) {
    const exampleRoot = path.join(repoRoot, example.path);
    const requiredPairs = [
      ['.qa-ai/qa-ai.config.yaml', 'qa-ai.config.yaml'],
      ['.qa-ai/output', 'qa-ai-output'],
      ['.qa-ai/features', 'features']
    ];
    if (example.preset !== 'manual-only') {
      requiredPairs.push(['.qa-ai/tests', 'tests']);
    }

    for (const [compactRel, legacyRel] of requiredPairs) {
      const resolvedRel = await hasExampleEntry(exampleRoot, compactRel, legacyRel);
      if (!resolvedRel) {
        throw new Error(
          `Canonical example source is missing: ${example.path}/${compactRel} (compact) or ${example.path}/${legacyRel} (legacy)`
        );
      }

      const absolutePath = path.join(exampleRoot, resolvedRel);
      const stats = await fs.stat(absolutePath);
      const files = stats.isDirectory() ? await filesUnder(absolutePath) : [absolutePath];
      if (files.length === 0) {
        throw new Error(`Canonical example source is empty: ${example.path}/${resolvedRel}`);
      }

      for (const file of files) {
        const relativePath = path.relative(repoRoot, file).replaceAll(path.sep, '/');
        if (!trackedOrNew.has(relativePath)) {
          throw new Error(`Canonical example source is not tracked or staged by Git: ${relativePath}`);
        }
      }
    }
  }
}

async function packageToInstall(packageSpec, tempRoot, npmCache) {
  if (packageSpec !== 'local') return packageSpec;

  const packDir = path.join(tempRoot, 'pack');
  const { tarball } = await resolvePackTarball({ packDir, npmCache });
  return tarball;
}

async function writeReport(report) {
  if (!reportPath) return;
  const absolutePath = path.resolve(repoRoot, reportPath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

async function main() {
  const packageSpec = validatePackageSpec(requestedSpec);
  const manifest = JSON.parse(await fs.readFile(path.join(repoRoot, 'examples', 'compatibility.json'), 'utf8'));
  validateManifest(manifest);
  await verifyCanonicalExampleSources(manifest);
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-flowkit-channel-compatibility-'));
  const npmCache = path.join(tempRoot, 'npm-cache');
  const cliRoot = path.join(tempRoot, 'cli');
  const results = [];

  try {
    await fs.mkdir(npmCache, { recursive: true });
    const installSpec = await packageToInstall(packageSpec, tempRoot, npmCache);
    await fs.mkdir(cliRoot, { recursive: true });
    installPackTarball(cliRoot, installSpec, { npmCache });

    const cli = cliPath(cliRoot);
    const installedVersion = run(node, [cli, 'version'], { cwd: repoRoot }).stdout.trim();

    for (const example of manifest.examples) {
      const targetRoot = path.join(tempRoot, 'targets', example.id);
      await fs.cp(path.join(repoRoot, example.path), targetRoot, { recursive: true });

      const startedAt = Date.now();
      run(
        node,
        [
          cli,
          'init',
          '--preset',
          example.preset,
          ...extraInitArgsForExample(example),
          '--no-adapters',
          '--skip-doctor'
        ],
        { cwd: targetRoot }
      );
      run(node, [cli, 'validate-target', '--allow-empty', '--allow-missing', '--no-strict-doctor'], {
        cwd: targetRoot
      });
      const result = {
        example: example.id,
        preset: example.preset,
        status: 'passed',
        durationMs: Date.now() - startedAt
      };
      results.push(result);
      console.log(`[PASS] ${example.id} (${result.durationMs}ms)`);
    }

    const report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      packageSpec,
      installedVersion,
      platform: process.platform,
      nodeVersion: process.version,
      results
    };
    await writeReport(report);
    console.log(`Example compatibility passed for ${packageSpec} (${installedVersion}).`);
  } catch (error) {
    await writeReport({
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      packageSpec,
      platform: process.platform,
      nodeVersion: process.version,
      results,
      status: 'failed',
      error: String(error?.message || error)
    });
    throw error;
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
