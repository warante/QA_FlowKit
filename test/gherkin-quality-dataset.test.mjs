import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const datasetRoot = path.join(repoRoot, 'test', 'fixtures', 'gherkin-quality-dataset');
const goodRoot = path.join(datasetRoot, 'good');
const badRoot = path.join(datasetRoot, 'bad');
const validator = path.join(repoRoot, '.qa-ai', 'scripts', 'validate-features.mjs');
const dimensions = [
  'requirement-fidelity',
  'observability',
  'atomicity',
  'determinism',
  'data-independence',
  'ui-overspecification',
  'language-clarity'
];

async function listFiles(dir, predicate = () => true) {
  const results = [];
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && predicate(full)) results.push(full);
    }
  }
  await walk(dir);
  return results;
}

function rel(file) {
  return path.relative(repoRoot, file).replaceAll(path.sep, '/');
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function languageFor(file, expected = null) {
  if (expected?.language) return expected.language;
  return file.includes('-20') || file.includes('-40') ? 'es' : 'en';
}

function runFeatureValidator({ featureRoot, file, language, expectFailure = false }) {
  const result = spawnSync(
    process.execPath,
    [
      validator,
      '--path',
      path.relative(repoRoot, featureRoot).replaceAll(path.sep, '/'),
      '--file',
      rel(file),
      '--gherkin-language',
      language,
      '--no-duplicates'
    ],
    { cwd: repoRoot, encoding: 'utf8', shell: false }
  );
  const failed = result.status !== 0;
  if (expectFailure ? !failed : failed) {
    throw new Error(
      [
        `validate-features ${expectFailure ? 'should have failed' : 'failed'} for ${rel(file)}`,
        result.stdout,
        result.stderr
      ]
        .filter(Boolean)
        .join('\n')
    );
  }
  return `${result.stdout}\n${result.stderr}`;
}

function assertSidecarSchema(file, expected) {
  assert.ok(['en', 'es'].includes(expected.language), `${file}: language must be en or es`);
  assert.ok(Array.isArray(expected.rubricDimensions), `${file}: rubricDimensions must be an array`);
  assert.ok(Array.isArray(expected.structuralRules), `${file}: structuralRules must be an array`);
  for (const dimension of expected.rubricDimensions) {
    assert.ok(dimensions.includes(dimension), `${file}: unknown rubric dimension ${dimension}`);
  }
  for (const rule of expected.structuralRules) {
    assert.equal(typeof rule.rule, 'string', `${file}: structural rule needs rule`);
    assert.equal(typeof rule.messageIncludes, 'string', `${file}: structural rule needs messageIncludes`);
    assert.ok(rule.messageIncludes.trim(), `${file}: messageIncludes must not be empty`);
  }
}

test('gherkin quality dataset: minimum counts and language coverage', async () => {
  const goodFiles = await listFiles(goodRoot, (file) => file.endsWith('.feature'));
  const badFiles = await listFiles(badRoot, (file) => file.endsWith('.feature'));
  assert.ok(goodFiles.length >= 10, `expected at least 10 good files, got ${goodFiles.length}`);
  assert.ok(badFiles.length >= 15, `expected at least 15 bad files, got ${badFiles.length}`);

  const goodLanguages = new Set(goodFiles.map((file) => languageFor(path.basename(file))));
  const badSidecars = await Promise.all(badFiles.map((file) => readJson(file.replace(/\.feature$/, '.expected.json'))));
  const badLanguages = new Set(badSidecars.map((expected) => expected.language));
  assert.deepEqual([...goodLanguages].sort(), ['en', 'es']);
  assert.deepEqual([...badLanguages].sort(), ['en', 'es']);
});

test('gherkin quality dataset: good files pass structural validation', async () => {
  const goodFiles = await listFiles(goodRoot, (file) => file.endsWith('.feature'));
  for (const file of goodFiles) {
    runFeatureValidator({ featureRoot: goodRoot, file, language: languageFor(path.basename(file)) });
  }
});

test('gherkin quality dataset: sidecars are valid and cover rubric dimensions', async () => {
  const badFiles = await listFiles(badRoot, (file) => file.endsWith('.feature'));
  const counts = Object.fromEntries(dimensions.map((dimension) => [dimension, 0]));
  const structuralRules = new Set();

  for (const file of badFiles) {
    const sidecar = file.replace(/\.feature$/, '.expected.json');
    const expected = await readJson(sidecar);
    assertSidecarSchema(rel(sidecar), expected);
    for (const dimension of expected.rubricDimensions) counts[dimension] += 1;
    for (const rule of expected.structuralRules) structuralRules.add(rule.rule);
  }

  for (const [dimension, count] of Object.entries(counts)) {
    assert.ok(count >= 2, `${dimension} should appear in at least two bad sidecars, got ${count}`);
  }

  for (const required of [
    'required-tag',
    'acceptance-criteria',
    'scenario-count',
    'scenario-rf',
    'filename-rf',
    'spanish-language-header',
    'language-mismatch',
    'feature-count'
  ]) {
    assert.ok(structuralRules.has(required), `missing structural rule coverage: ${required}`);
  }
});

test('gherkin quality dataset: structurally labeled bad files fail with expected messages', async () => {
  const badFiles = await listFiles(badRoot, (file) => file.endsWith('.feature'));
  for (const file of badFiles) {
    const expected = await readJson(file.replace(/\.feature$/, '.expected.json'));
    if (expected.structuralRules.length === 0) continue;
    const output = runFeatureValidator({
      featureRoot: badRoot,
      file,
      language: expected.language,
      expectFailure: true
    });
    for (const rule of expected.structuralRules) {
      assert.ok(
        output.includes(rule.messageIncludes),
        `${rel(file)} expected validator output to include: ${rule.messageIncludes}\nActual:\n${output}`
      );
    }
  }
});

test('gherkin quality dataset: deliberate break of a good file is caught', async () => {
  const tempRoot = await fs.mkdtemp(path.join(repoRoot, '.tmp-qa-quality-dataset-'));
  try {
    const source = path.join(goodRoot, 'functional', 'RF-101-TC-001-login-success.feature');
    const targetRoot = path.join(tempRoot, 'features');
    const target = path.join(targetRoot, 'RF-101-TC-001-login-success.feature');
    await fs.mkdir(targetRoot, { recursive: true });
    const broken = (await fs.readFile(source, 'utf8')).replace(' @manual:false', '');
    await fs.writeFile(target, broken, 'utf8');
    const result = spawnSync(
      process.execPath,
      [validator, '--path', path.relative(repoRoot, targetRoot), '--file', path.relative(repoRoot, target)],
      { cwd: repoRoot, encoding: 'utf8', shell: false }
    );
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /Missing required tag value @manual:<value>/);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
