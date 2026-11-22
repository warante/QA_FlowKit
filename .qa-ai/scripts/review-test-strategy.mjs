#!/usr/bin/env node
import { parseArgs } from './lib/utils.mjs';
import { collectStrategyReviewEvidence } from './lib/strategy-review-evidence.mjs';

const args = parseArgs(process.argv);
async function main() {
  if (
    Object.keys(args).some((key) => !['_', 'plan', 'reviews', 'json', 'help'].includes(key)) ||
    args._.length ||
    ['json', 'help'].some((key) => args[key] !== undefined && args[key] !== true) ||
    (args.reviews !== undefined && typeof args.reviews !== 'string')
  )
    throw new Error('Invalid options.');
  if (args.help) {
    console.log(
      'Usage: node .qa-ai/scripts/review-test-strategy.mjs --plan <relative.json> [--reviews <relative.json>] [--json]\nRead-only preparation or validation of supplied review evidence. No approvals, publication or generated reviewer opinions.'
    );
    return;
  }
  if (typeof args.plan !== 'string') throw new Error('A review plan is required.');
  const report = await collectStrategyReviewEvidence(process.cwd(), { plan: args.plan, reviews: args.reviews });
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Strategy review evidence: ${report.status}`);
    console.log(
      `Cases: ${report.cases.length}; supplied reviews: ${report.suppliedReviews}; issues: ${report.issues.length}.`
    );
    console.log('No workflow acceptance granted; supplied reviewer identity/independence is not verified.');
    console.log('Use --json for current artifact hashes, per-case decisions and disagreement details.');
  }
}
main().catch(() => {
  const result = { ok: false, code: 'STRATEGY_REVIEW_INPUT_ERROR' };
  console.error(
    args.json
      ? JSON.stringify(result)
      : 'Review evidence could not be read safely. Check documented options, schema, paths, sizes and sensitive-data restrictions.'
  );
  process.exitCode = 1;
});
