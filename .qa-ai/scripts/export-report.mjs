#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { resolveGlobs } from './lib/glob.mjs';
import { parseJUnitXml, parseCucumberJson, extractTestIds } from './lib/execution-results.mjs';
import { parseMarkdownTable, normalizeColumn } from './lib/markdown-table.mjs';
import {
  getConfigValue,
  loadQaAiConfig,
  parseArgs,
  pathExists,
  readText,
  resolveRepoPath,
  toPosixPath,
  ensureDir,
  relativeTo,
  manifestEntry,
  recordManifestEntries
} from './lib/utils.mjs';
import { normalizeLanguage, normalizeId } from './lib/gherkin-validate.mjs';
import { parse as parseGherkin } from './lib/gherkin-parser.mjs';

const args = parseArgs(process.argv);
const cwd = process.cwd();

function escapeXml(unsafe) {
  if (unsafe === undefined || unsafe === null) return '';
  return String(unsafe)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

let uuidCounter = 0;
function getUuid(caseId, seed) {
  if (seed) {
    const input = `${seed}-${caseId}-${uuidCounter++}`;
    const hash = crypto.createHash('sha256').update(input).digest('hex');
    return [hash.slice(0, 8), hash.slice(8, 12), hash.slice(12, 16), hash.slice(16, 20), hash.slice(20, 32)].join('-');
  }
  return crypto.randomUUID();
}

function getTimestamp(fixedTimestamp) {
  if (fixedTimestamp) {
    if (/^\d+$/.test(fixedTimestamp)) return Number(fixedTimestamp);
    const parsed = Date.parse(fixedTimestamp);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
}

function buildCucumberJson(allCases, language) {
  const featuresMap = new Map();

  for (const c of allCases) {
    const featureFile = c.featureFile;
    if (!featuresMap.has(featureFile)) {
      featuresMap.set(featureFile, {
        uri: featureFile,
        id: path.basename(featureFile, '.feature').toLowerCase().replace(/\s+/g, '-'),
        name: c.featureTitle || path.basename(featureFile, '.feature'),
        keyword: language === 'es' ? 'Característica' : 'Feature',
        line: 1,
        elements: []
      });
    }

    const featureObj = featuresMap.get(featureFile);
    const scenarioId = `${featureObj.id};${c.scenarioName.toLowerCase().replace(/\s+/g, '-')}`;

    const tags = [];
    if (c.rf) tags.push({ name: `@rf:${c.rf}` });
    if (c.caseIdRaw) tags.push({ name: `@id:${c.caseIdRaw}` });
    if (c.priority) tags.push({ name: `@priority:${c.priority}` });
    if (c.type) tags.push({ name: `@type:${c.type}` });
    if (c.tags) {
      for (const t of c.tags) {
        if (!tags.some((existing) => existing.name === t.tag)) {
          tags.push({ name: t.tag });
        }
      }
    }

    const steps = [];
    const stepCount = c.steps.length;

    let stepStatus = 'skipped';
    if (c.status === 'passed') stepStatus = 'passed';
    else if (c.status === 'failed') stepStatus = 'failed';
    else if (c.status === 'skipped') stepStatus = 'skipped';
    else if (c.status === 'unknown') stepStatus = 'unknown';

    const totalDurationNs = (c.durationMs || 0) * 1000000;
    const stepDurationNs = stepCount > 0 ? Math.round(totalDurationNs / stepCount) : 0;

    c.steps.forEach((step, index) => {
      let resultStatus = stepStatus;
      let errorMessage = undefined;

      if (c.status === 'failed') {
        if (index === 0) {
          resultStatus = 'failed';
          errorMessage = c.message || 'Failed';
        } else {
          resultStatus = 'skipped';
        }
      }

      steps.push({
        keyword: step.keyword,
        name: step.name,
        line: step.line,
        result: {
          status: resultStatus,
          duration: resultStatus === 'skipped' ? 0 : stepDurationNs,
          ...(errorMessage ? { error_message: errorMessage } : {})
        }
      });
    });

    featureObj.elements.push({
      id: scenarioId,
      name: c.scenarioName,
      type: 'scenario',
      keyword: language === 'es' ? 'Escenario' : 'Scenario',
      line: c.scenarioLine || 2,
      tags: tags.map((t) => ({ name: t.name, line: (c.scenarioLine || 2) - 1 })),
      steps
    });
  }

  return Array.from(featuresMap.values());
}

async function writeAllureReport(allCases, outDir, fixedTimestamp, uuidSeed) {
  const writtenFiles = [];
  const startTimestamp = getTimestamp(fixedTimestamp);

  for (const c of allCases) {
    const uuid = getUuid(c.caseIdRaw || c.scenarioName, uuidSeed);
    const historyId = crypto
      .createHash('md5')
      .update(c.caseIdRaw || c.scenarioName)
      .digest('hex');
    const stopTime = startTimestamp;
    const startTime = startTimestamp - (c.durationMs || 0);

    let status = 'skipped';
    if (c.status === 'passed') status = 'passed';
    else if (c.status === 'failed') status = 'failed';
    else if (c.status === 'skipped') status = 'skipped';
    else if (c.status === 'unknown') status = 'unknown';

    const allureSteps = [];
    const stepCount = c.steps.length;
    const stepDurationMs = stepCount > 0 ? Math.round((c.durationMs || 0) / stepCount) : 0;

    c.steps.forEach((step, index) => {
      let stepStatus = status;
      let errorMessage = undefined;

      if (c.status === 'failed') {
        if (index === 0) {
          stepStatus = 'failed';
          errorMessage = c.message;
        } else {
          stepStatus = 'skipped';
        }
      }

      allureSteps.push({
        name: `${step.keyword}${step.name}`,
        status: stepStatus,
        statusDetails: errorMessage ? { message: errorMessage } : undefined,
        start: startTime + index * stepDurationMs,
        stop: startTime + (index + 1) * stepDurationMs
      });
    });

    const labels = [
      { name: 'feature', value: c.featureTitle || 'Untitled Feature' },
      { name: 'story', value: c.scenarioName },
      { name: 'framework', value: 'qa-flowkit' },
      { name: 'language', value: 'javascript' }
    ];

    if (c.rf) labels.push({ name: 'requirement', value: c.rf });
    if (c.priority) labels.push({ name: 'priority', value: c.priority });
    if (c.type) labels.push({ name: 'type', value: c.type });

    if (c.tags) {
      for (const t of c.tags) {
        labels.push({ name: 'tag', value: t.tag.replace(/^@/, '') });
      }
    }

    const allureObj = {
      uuid,
      historyId,
      fullName: `${c.featureFile}:${c.scenarioName}`,
      name: c.scenarioName,
      status,
      statusDetails: c.status === 'failed' ? { message: c.message || 'Failed' } : undefined,
      steps: allureSteps,
      labels,
      start: startTime,
      stop: stopTime
    };

    const filePath = path.join(outDir, `${uuid}-result.json`);
    await fs.writeFile(filePath, JSON.stringify(allureObj, null, 2), 'utf8');
    writtenFiles.push(filePath);
  }

  return writtenFiles;
}

function buildJunitXml(allCases) {
  const suites = {};

  for (const c of allCases) {
    const rf = c.rf || 'unlinked';
    if (!suites[rf]) {
      suites[rf] = {
        name: rf,
        tests: 0,
        failures: 0,
        skipped: 0,
        errors: 0,
        time: 0,
        cases: []
      };
    }

    const suite = suites[rf];
    suite.tests += 1;
    if (c.status === 'failed') suite.failures += 1;
    if (c.status === 'skipped') suite.skipped += 1;
    suite.time += (c.durationMs || 0) / 1000;
    suite.cases.push(c);
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<testsuites>\n';
  for (const suite of Object.values(suites)) {
    xml += `  <testsuite name="${escapeXml(suite.name)}" tests="${suite.tests}" failures="${suite.failures}" skipped="${suite.skipped}" errors="${suite.errors}" time="${suite.time.toFixed(3)}">\n`;
    for (const c of suite.cases) {
      const timeSec = ((c.durationMs || 0) / 1000).toFixed(3);
      xml += `    <testcase name="${escapeXml(c.scenarioName)}" classname="${escapeXml(c.featureFile)}" time="${timeSec}">\n`;
      if (c.status === 'failed') {
        const cleanMessage = String(c.message || 'Failed').replaceAll(']]>', ']]&gt;');
        xml += `      <failure message="${escapeXml(c.message || 'Failed')}"><![CDATA[${cleanMessage}]]></failure>\n`;
      } else if (c.status === 'skipped') {
        xml += `      <skipped message="Skipped" />\n`;
      }
      xml += `    </testcase>\n`;
    }
    xml += `  </testsuite>\n`;
  }
  xml += '</testsuites>\n';

  return xml;
}

export async function exportReport(cwd, options = {}) {
  const format = options.format;
  if (!format) {
    throw new Error('Missing required argument --format. Supported formats: cucumber-json, allure, junit-xml.');
  }
  if (!['cucumber-json', 'allure', 'junit-xml'].includes(format)) {
    throw new Error(`Unsupported format: "${format}". Supported formats: cucumber-json, allure, junit-xml.`);
  }

  const rawOut = options.out || `qa-ai-output/reports/${format}`;
  const outDir = resolveRepoPath(cwd, rawOut, { label: 'out' });

  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};

  const language = normalizeLanguage(getConfigValue(config, 'gherkin.language', 'en'));

  const resultsPaths = getConfigValue(config, 'execution.resultsPaths', []);
  const resultsMap = new Map();

  if (resultsPaths.length > 0) {
    const executionFiles = await resolveGlobs(cwd, resultsPaths);
    const parsedCases = [];

    for (const file of executionFiles) {
      const filename = path.basename(file);
      const ext = path.extname(file).toLowerCase();
      const text = await fs.readFile(file, 'utf8');

      if (ext === '.xml') {
        const res = parseJUnitXml(text, filename);
        parsedCases.push(...res.cases);
      } else if (ext === '.json') {
        const res = parseCucumberJson(text, filename);
        parsedCases.push(...res.cases);
      }
    }

    for (const c of parsedCases) {
      const matchedIds = extractTestIds(c);
      for (const id of matchedIds) {
        const current = resultsMap.get(id) || [];
        current.push(c);
        resultsMap.set(id, current);
      }
    }
  }

  const matrixPath =
    options.matrixPath || getConfigValue(config, 'traceability.matrixPath', 'qa-ai-output/traceability-matrix.md');
  const matrixAbsPath = resolveRepoPath(cwd, matrixPath, { label: 'traceability matrix' });
  if (!(await pathExists(matrixAbsPath))) {
    throw new Error(`Traceability matrix file not found at: ${matrixPath}`);
  }

  const matrixContent = await readText(matrixAbsPath);
  const table = parseMarkdownTable(matrixContent, {
    label: 'Traceability matrix',
    requiredColumns: [
      'Requirement Source',
      'RF',
      'Feature File',
      'Test Management Case ID',
      'Type',
      'Priority',
      'Automation Status'
    ]
  });

  if (table.errors.length > 0) {
    throw new Error(`Traceability matrix parse error: ${table.errors.join(', ')}`);
  }

  const allCases = [];
  for (const row of table.rows) {
    const rf = String(row.values[normalizeColumn('RF')] || '').trim();
    const caseIdRaw = String(row.values[normalizeColumn('Test Management Case ID')] || '').trim();
    const featureFile = String(row.values[normalizeColumn('Feature File')] || '').trim();
    const type = String(row.values[normalizeColumn('Type')] || '')
      .trim()
      .toLowerCase();
    const priority = String(row.values[normalizeColumn('Priority')] || '')
      .trim()
      .toLowerCase();
    const autoStatus = String(row.values[normalizeColumn('Automation Status')] || '')
      .trim()
      .toLowerCase();

    const caseId = normalizeId(caseIdRaw);
    const runResults = resultsMap.get(caseId) || [];

    let finalStatus = 'skipped';
    let message = '';
    let durationMs = 0;

    if (resultsPaths.length > 0 && runResults.length > 0) {
      let hasPassed = false;
      let hasFailed = false;
      let hasSkipped = false;

      for (const run of runResults) {
        if (run.status === 'failed') {
          hasFailed = true;
          message = run.message || 'Test failed';
        } else if (run.status === 'skipped') {
          hasSkipped = true;
        } else if (run.status === 'passed') {
          hasPassed = true;
        }
        durationMs += run.durationMs || 0;
      }

      if (hasFailed) {
        finalStatus = 'failed';
      } else if (hasPassed) {
        finalStatus = 'passed';
      } else if (hasSkipped) {
        finalStatus = 'skipped';
      } else {
        finalStatus = 'unknown';
      }
    }

    const steps = [];
    let featureTitle = '';
    let scenarioName = '';
    let scenarioLine = 0;
    let parsedTags = [];

    if (featureFile) {
      const featureAbsPath = resolveRepoPath(cwd, featureFile, { label: 'feature file' });
      if (await pathExists(featureAbsPath)) {
        const content = await fs.readFile(featureAbsPath, 'utf8');
        const ast = parseGherkin(content, language);
        featureTitle = ast.feature?.name || '';

        let scenario = null;
        const findScenario = (node) => {
          if (node.type === 'Scenario') {
            scenario = node;
            return;
          }
          if (node.children) {
            for (const child of node.children) {
              findScenario(child);
              if (scenario) return;
            }
          }
        };
        if (ast.feature) {
          findScenario(ast.feature);
        }

        scenarioName = scenario?.name || '';
        scenarioLine = scenario?.line || 0;

        const collectTags = (node) => {
          const result = [];
          if (node.tags) {
            for (const t of node.tags) {
              result.push({ line: t.line, tag: t.name });
            }
          }
          if (node.children) {
            for (const child of node.children) {
              result.push(...collectTags(child));
            }
          }
          return result;
        };
        parsedTags = ast.feature ? collectTags(ast.feature) : [];

        if (scenario && scenario.steps) {
          for (const step of scenario.steps) {
            steps.push({
              keyword: step.keyword,
              name: step.text,
              line: step.line
            });
          }
        }
      }
    }

    allCases.push({
      rf,
      caseIdRaw,
      caseId,
      featureFile,
      type,
      priority,
      autoStatus,
      status: finalStatus,
      message,
      durationMs,
      steps,
      featureTitle,
      scenarioName,
      scenarioLine,
      tags: parsedTags
    });
  }

  await ensureDir(outDir);

  const writtenFiles = [];
  const fixedTimestamp = options.fixedTimestamp;
  const uuidSeed = options.fixedUuid;

  if (format === 'cucumber-json') {
    const data = buildCucumberJson(allCases, language, fixedTimestamp, uuidSeed);
    const filePath = path.join(outDir, 'cucumber.json');
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    writtenFiles.push(filePath);
  } else if (format === 'allure') {
    const allureFiles = await writeAllureReport(allCases, outDir, fixedTimestamp, uuidSeed, cwd);
    writtenFiles.push(...allureFiles);
  } else if (format === 'junit-xml') {
    const data = buildJunitXml(allCases);
    const filePath = path.join(outDir, 'junit.xml');
    await fs.writeFile(filePath, data, 'utf8');
    writtenFiles.push(filePath);
  }

  const manifestEntries = [];
  manifestEntries.push({
    path: relativeTo(cwd, outDir),
    type: 'dir',
    category: 'generated',
    source: 'export-report'
  });
  for (const f of writtenFiles) {
    manifestEntries.push(await manifestEntry(cwd, f, { type: 'file', category: 'generated', source: 'export-report' }));
  }
  await recordManifestEntries(cwd, manifestEntries);

  return {
    format,
    outDir: relativeTo(cwd, outDir),
    totalCases: allCases.length,
    exportedFiles: writtenFiles.map((f) => relativeTo(cwd, f))
  };
}

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/export-report.mjs [options]

Options:
  --format <format>    Format to export: cucumber-json, allure, junit-xml (required)
  --out <dir>          Override the output directory
  --json               Output structured JSON summary
  --fixed-timestamp    Inject a fixed timestamp for determinism
  --fixed-uuid         Inject a seed for deterministic UUID generation
  --help               Show this help
`);
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = Boolean(args.json);

  try {
    const res = await exportReport(cwd, {
      format: args.format,
      out: args.out,
      fixedTimestamp: args['fixed-timestamp'] || process.env.QA_FLOWKIT_EXPORT_TIMESTAMP,
      fixedUuid: args['fixed-uuid'] || process.env.QA_FLOWKIT_EXPORT_UUID
    });

    if (jsonMode) {
      console.log(JSON.stringify({ ok: true, ...res }, null, 2));
    } else {
      console.log(`[PASS] Successfully exported report in ${res.format} format.`);
      console.log(`Output directory: ${res.outDir}`);
      console.log(`Total test cases processed: ${res.totalCases}`);
      console.log(`Exported files:`);
      for (const f of res.exportedFiles) {
        console.log(`  - ${f}`);
      }
    }
  } catch (err) {
    if (jsonMode) {
      console.log(JSON.stringify({ ok: false, errors: [err.message] }, null, 2));
    } else {
      console.error(`[FAIL] Export failed: ${err.message}`);
    }
    process.exit(1);
  }
}

if (import.meta.url === `file:///${toPosixPath(process.argv[1])}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
