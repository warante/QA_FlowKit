#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarizePilotRecord, validatePilotRecord } from './lib/pilot-metrics.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

const inputPath = path.resolve(repoRoot, argument('--input', 'docs/qa-ai/pilot-records'));
const outputPath = argument('--output', '');

async function listJsonFiles(target) {
  const stat = await fs.stat(target);
  if (stat.isFile()) return [target];
  const entries = await fs.readdir(target, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(target, entry.name))
    .sort();
}

function formatValue(value, suffix = '') {
  return Number.isFinite(value) ? `${Math.round(value * 100) / 100}${suffix}` : 'unavailable';
}

function markdownReport(summaries) {
  const lines = [
    '# Pilot Metrics Summary',
    '',
    'Generated from anonymized pilot records. Missing measurements remain unavailable and are not converted to zero.',
    '',
    '| Pilot | Track | Completeness | Design delta | Gherkin delta | Rework delta | Coverage baseline | Coverage assisted | P0/P1 |',
    '| ----- | ----- | ------------ | ------------ | ------------- | ------------ | ----------------- | ----------------- | ----- |'
  ];

  for (const summary of summaries) {
    lines.push(
      `| ${summary.pilotId} | ${summary.track} | ${summary.measurementCompleteness} | ${formatValue(summary.metrics.requirementToDesignMinutes.absoluteDelta, ' min')} | ${formatValue(summary.metrics.timeToValidGherkinMinutes.absoluteDelta, ' min')} | ${formatValue(summary.metrics.reworkMinutes.absoluteDelta, ' min')} | ${formatValue(summary.metrics.acceptanceCriteriaCoverage.baseline, '%')} | ${formatValue(summary.metrics.acceptanceCriteriaCoverage.assisted, '%')} | ${summary.issueCounts.P0}/${summary.issueCounts.P1} |`
    );
  }

  lines.push('', '## Limitations', '');
  for (const summary of summaries) {
    lines.push(`### ${summary.pilotId}`, '');
    if (summary.limitations.length === 0) lines.push('- None recorded.');
    else for (const limitation of summary.limitations) lines.push(`- ${limitation}`);
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

async function main() {
  const files = await listJsonFiles(inputPath);
  if (files.length === 0) throw new Error(`No pilot JSON records found at ${inputPath}`);

  const summaries = [];
  const errors = [];
  for (const file of files) {
    const record = JSON.parse(await fs.readFile(file, 'utf8'));
    const relative = path.relative(repoRoot, file).replaceAll(path.sep, '/');
    errors.push(...validatePilotRecord(record, relative));
    summaries.push(summarizePilotRecord(record));
  }
  if (errors.length > 0) {
    for (const error of errors) console.error(`[FAIL] ${error}`);
    process.exit(1);
  }

  const report = markdownReport(summaries);
  if (outputPath) {
    const absoluteOutput = path.resolve(repoRoot, outputPath);
    await fs.mkdir(path.dirname(absoluteOutput), { recursive: true });
    await fs.writeFile(absoluteOutput, report, 'utf8');
  }
  console.log(report.trimEnd());
  console.log(`\nValidated ${summaries.length} pilot record(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
