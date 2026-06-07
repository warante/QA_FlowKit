#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npmExecPath = process.env.npm_execpath || '';
const node = process.execPath;

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
    `Unsupported package spec "${value}". Use local, qa-flowkit@beta, qa-flowkit@rc, qa-flowkit@latest or an exact version.`
  );
}

function run(command, args, { cwd, env = {} } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    env: {
      ...process.env,
      npm_config_audit: 'false',
      npm_config_fund: 'false',
      npm_config_update_notifier: 'false',
      ...env
    }
  });
  if (result.status !== 0) {
    throw new Error(
      [`Command failed: ${command} ${args.join(' ')}`, result.error?.message, result.stdout, result.stderr]
        .filter(Boolean)
        .join('\n')
    );
  }
  return result;
}

function runNpm(args, options) {
  if (npmExecPath) return run(node, [npmExecPath, ...args], options);
  return run(npmCommand, args, options);
}

function cliPath(cliRoot) {
  return path.join(cliRoot, 'node_modules', 'qa-flowkit', 'bin', 'qa-flowkit.mjs');
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

async function verifyCanonicalExampleSources(manifest) {
  const tracked = new Set(
    run('git', ['ls-files', '--', 'examples'], { cwd: repoRoot })
      .stdout.split(/\r?\n/)
      .filter(Boolean)
      .map((file) => file.replaceAll('\\', '/'))
  );

  for (const example of manifest.examples) {
    const exampleRoot = path.join(repoRoot, example.path);
    const requiredEntries = ['qa-ai.config.yaml', 'features', 'qa-ai-output'];
    if (example.preset !== 'manual-only') requiredEntries.push('tests');

    for (const entry of requiredEntries) {
      const absolutePath = path.join(exampleRoot, entry);
      let stats;
      try {
        stats = await fs.stat(absolutePath);
      } catch {
        throw new Error(`Canonical example source is missing: ${example.path}/${entry}`);
      }

      const files = stats.isDirectory() ? await filesUnder(absolutePath) : [absolutePath];
      if (files.length === 0) {
        throw new Error(`Canonical example source is empty: ${example.path}/${entry}`);
      }

      for (const file of files) {
        const relativePath = path.relative(repoRoot, file).replaceAll(path.sep, '/');
        if (!tracked.has(relativePath)) {
          throw new Error(`Canonical example source is not tracked by Git: ${relativePath}`);
        }
      }
    }
  }
}

async function packageToInstall(packageSpec, tempRoot, npmCache) {
  if (packageSpec !== 'local') return packageSpec;

  const packDir = path.join(tempRoot, 'pack');
  await fs.mkdir(packDir, { recursive: true });
  const pack = runNpm(['pack', '--pack-destination', packDir, '--json'], {
    cwd: repoRoot,
    env: { npm_config_cache: npmCache }
  });
  const packInfo = JSON.parse(pack.stdout)[0];
  return path.join(packDir, packInfo.filename);
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
    runNpm(['install', '--prefix', cliRoot, '--ignore-scripts', '--package-lock=false', '--no-save', installSpec], {
      cwd: repoRoot,
      env: { npm_config_cache: npmCache }
    });

    const cli = cliPath(cliRoot);
    const installedVersion = run(node, [cli, 'version'], { cwd: repoRoot }).stdout.trim();

    for (const example of manifest.examples) {
      const targetRoot = path.join(tempRoot, 'targets', example.id);
      await fs.cp(path.join(repoRoot, example.path), targetRoot, { recursive: true });

      const startedAt = Date.now();
      run(node, [cli, 'init', '--preset', example.preset, '--no-adapters', '--skip-doctor'], { cwd: targetRoot });
      run(node, [cli, 'validate-target'], { cwd: targetRoot });
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
