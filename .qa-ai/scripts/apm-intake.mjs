#!/usr/bin/env node
import { createDatadogConnector } from './lib/apm-connectors/datadog.mjs';
import { createNewRelicConnector } from './lib/apm-connectors/newrelic.mjs';
import {
  getConfigValue,
  loadQaAiConfig,
  logHeader,
  parseArgs,
  pathExists,
  readText,
  resolveRepoPath
} from './lib/utils.mjs';
import { parseMarkdownTable, normalizeColumn } from './lib/markdown-table.mjs';
import { functionalMatrixContent } from './lib/markdown-section.mjs';
import { normalizeId } from './lib/gherkin-validate.mjs';
import fs from 'node:fs/promises';

const args = parseArgs(process.argv);
const cwd = process.cwd();

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/apm-intake.mjs [options]

Options:
  --connector <name>       APM connector to use (datadog, newrelic)
  --credentials <file>     Path to credentials JSON file
  --lookback <days>        Days to look back (default: 7)
  --matrix-path <file>     Override traceability matrix path
  --output <file>          Write intake report to file
  --json                   Output structured JSON format
  --help                   Show this help

Fetches signals from APM systems and maps them to RFs via traceability matrix.
`);
}

const CONNECTORS = {
  datadog: createDatadogConnector,
  newrelic: createNewRelicConnector
};

function parseTraceabilityMatrix(content) {
  const table = parseMarkdownTable(functionalMatrixContent(content), {
    label: 'Traceability matrix',
    requiredColumns: ['RF', 'Feature File']
  });

  if (table.errors.length > 0) {
    return { rows: [], errors: table.errors };
  }

  const rows = [];
  for (const row of table.rows) {
    const rf = String(row.values[normalizeColumn('RF')] || '').trim();
    const featureFile = String(row.values[normalizeColumn('Feature File')] || '').trim();

    if (!rf) continue;

    rows.push({
      rfId: normalizeId(rf),
      featureFile,
      line: row.line
    });
  }

  return { rows, errors: [] };
}

function mapSignalsToRFs(signals, matrixRows) {
  const rfToFeatures = new Map();
  for (const row of matrixRows) {
    if (row.featureFile) {
      const normalized = row.featureFile.replace(/\\/g, '/').toLowerCase();
      if (!rfToFeatures.has(normalized)) {
        rfToFeatures.set(normalized, []);
      }
      rfToFeatures.get(normalized).push(row.rfId);
    }
  }

  const mappedSignals = [];
  const unmappedSignals = [];

  for (const signal of signals) {
    const area = (signal.area || '').toLowerCase();
    let found = false;

    for (const [featurePath, rfs] of rfToFeatures.entries()) {
      if (area.includes(featurePath) || featurePath.includes(area)) {
        for (const rf of rfs) {
          mappedSignals.push({
            ...signal,
            linkedRF: rf,
            gapType: 'potential-coverage-gap'
          });
        }
        found = true;
      }
    }

    if (!found) {
      unmappedSignals.push({
        ...signal,
        linkedRF: null,
        gapType: 'unmapped-signal'
      });
    }
  }

  return { mappedSignals, unmappedSignals };
}

function formatIntakeReport(signals, mappedSignals, unmappedSignals) {
  const lines = [];

  lines.push('# APM Signal Intake Report');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Total signals fetched: ${signals.length}`);
  lines.push(`- Signals mapped to RFs: ${mappedSignals.length}`);
  lines.push(`- Unmapped signals: ${unmappedSignals.length}`);
  lines.push('');

  if (mappedSignals.length > 0) {
    lines.push('## Mapped Signals');
    lines.push('');
    lines.push('| Signal ID | Source | Date | Area | Severity | Linked RF | Gap Type |');
    lines.push('| --------- | ------ | ---- | ---- | -------- | --------- | -------- |');
    for (const signal of mappedSignals) {
      lines.push(
        `| ${signal.id} | ${signal.source} | ${signal.date} | ${signal.area} | ${signal.severity} | ${signal.linkedRF} | ${signal.gapType} |`
      );
    }
  }

  if (unmappedSignals.length > 0) {
    lines.push('');
    lines.push('## Unmapped Signals');
    lines.push('');
    lines.push('> These signals could not be mapped to any RF in the traceability matrix.');
    lines.push('');
    lines.push('| Signal ID | Source | Date | Area | Severity | Description |');
    lines.push('| --------- | ------ | ---- | ---- | -------- | ----------- |');
    for (const signal of unmappedSignals) {
      lines.push(
        `| ${signal.id} | ${signal.source} | ${signal.date} | ${signal.area} | ${signal.severity} | ${signal.description.substring(0, 50)}... |`
      );
    }
  }

  return lines.join('\n');
}

async function loadCredentials(credentialsPath) {
  if (!credentialsPath) {
    throw new Error('Credentials file path is required. Use --credentials <file>');
  }

  const absPath = resolveRepoPath(cwd, credentialsPath, { label: 'credentials file' });
  if (!(await pathExists(absPath))) {
    throw new Error(`Credentials file not found at ${credentialsPath}`);
  }

  const content = await readText(absPath);
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse credentials file: ${error.message}`, { cause: error });
  }
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = Boolean(args.json);
  if (!jsonMode) {
    logHeader('QA AI APM signal intake');
  }

  const connectorName = args.connector || 'datadog';
  const createConnector = CONNECTORS[connectorName];

  if (!createConnector) {
    const error = `Unknown connector: ${connectorName}. Available: ${Object.keys(CONNECTORS).join(', ')}`;
    if (jsonMode) {
      console.log(JSON.stringify({ ok: false, error }, null, 2));
    } else {
      console.log(`[FAIL] ${error}`);
    }
    process.exit(1);
  }

  const credentials = await loadCredentials(args.credentials);
  const options = { lookbackDays: parseInt(args.lookback) || 7 };
  const connector = createConnector(credentials, options);

  let signals;
  try {
    signals = await connector.fetchSignals();
  } catch (error) {
    if (jsonMode) {
      console.log(JSON.stringify({ ok: false, error: error.message }, null, 2));
    } else {
      console.log(`[FAIL] Failed to fetch signals: ${error.message}`);
    }
    process.exit(1);
  }

  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};
  const matrixPath =
    args['matrix-path'] || getConfigValue(config, 'traceability.matrixPath', '.qa-ai/output/traceability-matrix.md');
  const matrixAbsPath = resolveRepoPath(cwd, matrixPath, { label: 'traceability matrix' });

  if (!(await pathExists(matrixAbsPath))) {
    const error = `Traceability matrix not found at ${matrixPath}`;
    if (jsonMode) {
      console.log(JSON.stringify({ ok: false, error }, null, 2));
    } else {
      console.log(`[FAIL] ${error}`);
    }
    process.exit(1);
  }

  const matrixContent = await readText(matrixAbsPath);
  const { rows: matrixRows, errors: matrixErrors } = parseTraceabilityMatrix(matrixContent);

  if (matrixErrors.length > 0) {
    if (jsonMode) {
      console.log(JSON.stringify({ ok: false, errors: matrixErrors }, null, 2));
    } else {
      for (const err of matrixErrors) console.log(`[FAIL] ${err}`);
    }
    process.exit(1);
  }

  const { mappedSignals, unmappedSignals } = mapSignalsToRFs(signals, matrixRows);

  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          connector: connectorName,
          totalSignals: signals.length,
          mappedSignals,
          unmappedSignals
        },
        null,
        2
      )
    );
    return;
  }

  console.log(`\nFetched ${signals.length} signal(s) from ${connectorName}`);
  console.log(`Mapped to RFs: ${mappedSignals.length}`);
  console.log(`Unmapped: ${unmappedSignals.length}`);

  const report = formatIntakeReport(signals, mappedSignals, unmappedSignals);

  if (args.output) {
    await fs.writeFile(args.output, report, 'utf8');
    console.log(`\nReport written to ${args.output}`);
  } else {
    console.log(`\n${report}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
