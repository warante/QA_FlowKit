#!/usr/bin/env node
import { collectTestStrategy } from './lib/test-strategy-report.mjs';
import { parseArgs } from './lib/utils.mjs';

const args = parseArgs(process.argv);
async function main() {
  const allowed = new Set(['_', 'json', 'maintenance', 'results', 'help']);
  if (
    Object.keys(args).some((key) => !allowed.has(key)) ||
    args._.length ||
    ['json', 'maintenance', 'help'].some((key) => args[key] !== undefined && args[key] !== true) ||
    (args.results !== undefined && typeof args.results !== 'string')
  ) {
    throw new Error('Use --json, --maintenance, --results <repo-relative JSON path> or --help.');
  }
  if (args.help) {
    console.log(
      'Usage: node .qa-ai/scripts/analyze-test-strategy.mjs [--json] [--maintenance] [--results <path>]\nRead-only advisory analysis. No release gate, writes, telemetry or automatic test changes.'
    );
    return;
  }
  const report = await collectTestStrategy(process.cwd(), { maintenance: args.maintenance, results: args.results });
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(
      `Strategy analysis (advisory): ${report.review.findings.length} finding(s), ${report.navigation.capabilities.length} capability group(s).`
    );
    for (const group of report.navigation.capabilities) {
      console.log(
        `- ${group.capability}: ${group.tests.map((test) => `${test.testIds.join(', ') || '(no ID)'} [${test.path}:${test.line}]`).join('; ')}`
      );
    }
    for (const finding of report.review.findings)
      console.log(`- ${finding.code}: ${finding.section}, row ${finding.row ?? '-'} (${finding.fields.join(', ')})`);
    for (const limitation of report.limitations) console.log(`- ${limitation}`);
    console.log('Use --json for full maintenance, observations and missing-input details.');
  }
}
main().catch(() => {
  // Artifact text and Git errors can contain credentials; return a bounded diagnostic without raw stderr.
  if (args.json) console.error(JSON.stringify({ ok: false, code: 'STRATEGY_ANALYSIS_INPUT_ERROR' }));
  else
    console.error(
      'Strategy analysis could not read valid local inputs. Check options, modern config, repository paths and documented size/record limits.'
    );
  process.exitCode = 1;
});
