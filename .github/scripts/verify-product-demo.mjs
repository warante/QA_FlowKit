#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEMO_FORBIDDEN_CLAIM_PATTERNS,
  DEMO_PUBLIC_PATHS,
  DEMO_REQUIRED_ARTIFACTS,
  DEMO_RF_ID,
  DEMO_SCRIPT_SECTIONS,
  DEMO_TRANSCRIPT_SECTIONS,
  DEMO_WORKFLOW_PHASES
} from './lib/product-demo.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ALLOWED_STATUS = new Set(['static_ready', 'recorded']);

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function pathExists(root, relativePath) {
  try {
    await fs.access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

function assertNoForbiddenClaims(content, label, errors) {
  for (const pattern of DEMO_FORBIDDEN_CLAIM_PATTERNS) {
    assert(!pattern.test(content), `${label} must not include unsupported claim matching ${pattern}`, errors);
  }
}

export async function verifyProductDemo({ root = repoRoot } = {}) {
  const errors = [];
  const recordPath = path.join(root, 'docs', 'qa-ai', 'demo.v1.json');
  const demoPath = path.join(root, 'docs', 'qa-ai', 'demo.md');
  const scriptPath = path.join(root, 'docs', 'qa-ai', 'demo-script.md');
  const transcriptPath = path.join(root, 'docs', 'qa-ai', 'demo-transcript.md');
  const packagePath = path.join(root, 'package.json');
  const readmePath = path.join(root, 'README.md');
  const readmeEsPath = path.join(root, 'README.es.md');
  const gettingStartedPath = path.join(root, 'docs', 'qa-ai', 'getting-started.md');

  const record = await readJson(recordPath);
  const packageJson = await readJson(packagePath);
  const demo = await fs.readFile(demoPath, 'utf8');
  const script = await fs.readFile(scriptPath, 'utf8');
  const transcript = await fs.readFile(transcriptPath, 'utf8');
  const readme = await fs.readFile(readmePath, 'utf8');
  const readmeEs = await fs.readFile(readmeEsPath, 'utf8');
  const gettingStarted = await fs.readFile(gettingStartedPath, 'utf8');

  assert(record.schemaVersion === 1, 'demo.v1.json schemaVersion must be 1', errors);
  assert(record.task === 'TASK-057', 'demo record task must be TASK-057', errors);
  assert(ALLOWED_STATUS.has(record.status), `invalid demo status: ${record.status}`, errors);
  assert(record.rfId === DEMO_RF_ID, `demo rfId must be ${DEMO_RF_ID}`, errors);
  assert(record.qaFlowKitVersion === packageJson.version, 'demo record version must match package.json', errors);
  assert(packageJson.scripts?.[record.npmScript], `package.json must define npm script ${record.npmScript}`, errors);
  assert(await pathExists(root, record.e2eRunner), `missing e2e runner ${record.e2eRunner}`, errors);

  for (const relativePath of DEMO_PUBLIC_PATHS) {
    assert(await pathExists(root, relativePath), `missing demo asset ${relativePath}`, errors);
  }

  for (const artifact of DEMO_REQUIRED_ARTIFACTS) {
    const fixturePath = path.join(record.fixtureRoot, 'expected', artifact);
    assert(await pathExists(root, fixturePath), `missing expected fixture ${fixturePath}`, errors);
  }

  for (const section of DEMO_SCRIPT_SECTIONS) {
    assert(script.includes(section), `demo-script.md missing section ${section}`, errors);
  }
  for (const section of DEMO_TRANSCRIPT_SECTIONS) {
    assert(transcript.includes(section), `demo-transcript.md missing section ${section}`, errors);
  }

  const demoCorpus = `${script}\n${demo}\n${transcript}`.toLowerCase();
  for (const phase of DEMO_WORKFLOW_PHASES) {
    assert(demoCorpus.includes(phase), `demo materials must mention phase ${phase}`, errors);
  }

  assert(demo.includes('demo-script.md'), 'demo.md must link recording script', errors);
  assert(demo.includes('demo-transcript.md'), 'demo.md must link transcript', errors);
  assert(demo.includes('demo.v1.json'), 'demo.md must link demo record', errors);
  assert(demo.includes(DEMO_RF_ID), 'demo.md must reference RF-101', errors);
  assert(demo.includes('test:e2e-quick'), 'demo.md must document npm replay command', errors);

  assert(readme.includes('docs/qa-ai/demo.md'), 'README.md must link static demo', errors);
  assert(readme.includes('docs/qa-ai/demo-script.md'), 'README.md must link demo script', errors);
  assert(readmeEs.includes('docs/qa-ai/demo.md'), 'README.es.md must link static demo', errors);
  assert(readmeEs.includes('docs/qa-ai/demo-script.md'), 'README.es.md must link demo script', errors);

  assert(gettingStarted.includes('demo.md'), 'getting-started.md must link demo.md', errors);
  assert(gettingStarted.includes('demo-script.md'), 'getting-started.md must link demo-script.md', errors);
  assert(gettingStarted.includes('demo-transcript.md'), 'getting-started.md must link demo-transcript.md', errors);

  assertNoForbiddenClaims(script, 'demo-script.md', errors);
  assertNoForbiddenClaims(transcript, 'demo-transcript.md', errors);
  assertNoForbiddenClaims(demo, 'demo.md', errors);

  if (record.status === 'recorded') {
    assert(
      record.recordedMedia?.url || record.recordedMedia?.path,
      'recorded status requires recordedMedia.url or recordedMedia.path',
      errors
    );
    assert(
      readme.includes(record.recordedMedia.url || record.recordedMedia.path),
      'README must embed recorded media',
      errors
    );
  }

  return { ok: errors.length === 0, errors, status: record.status };
}

async function main() {
  const result = await verifyProductDemo();
  if (!result.ok) {
    console.error('Product demo verification failed:\n');
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`Product demo verification passed (status=${result.status}).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
