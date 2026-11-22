#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { repoRoot } from './lib/ci-helpers.mjs';
import { reviewStrategySections } from '../../.qa-ai/scripts/lib/test-strategy-analysis.mjs';

const fixturePath = path.join(repoRoot, 'test/fixtures/strategy-design/cases.json');
const dataset = JSON.parse(await fs.readFile(fixturePath, 'utf8'));
assert.equal(dataset.kind, 'synthetic-structural-evaluation');
const markdown = (section, row) => {
  const keys = Object.keys(row);
  return `## ${section}\n| ${keys.join(' | ')} |\n| ${keys.map(() => '---').join(' | ')} |\n| ${Object.values(row).join(' | ')} |`;
};
const ids = new Set();
const cases = dataset.cases.map((item) => {
  assert.ok(!ids.has(item.id), 'Fixture IDs must be unique.');
  ids.add(item.id);
  assert.ok(['en', 'es'].includes(item.language));
  const baseline = reviewStrategySections({ [item.artifact]: markdown(item.section, item.baseline) });
  const candidate = reviewStrategySections({ [item.artifact]: markdown(item.section, item.candidate) });
  assert.ok(
    baseline.findings.some((f) => f.code === item.expectedBaselineCode),
    item.id
  );
  assert.equal(candidate.findings.length, 0, item.id);
  assert.equal(candidate.semanticCorrectnessVerified, false);
  return {
    id: item.id,
    language: item.language,
    baselineStructuralFindings: baseline.findings.length,
    candidateStructuralFindings: candidate.findings.length
  };
});
assert.deepEqual(new Set(cases.map((item) => item.language)), new Set(['en', 'es']));
const contrastCase = dataset.cases.find((item) => item.section === 'outcome checks');
assert.ok(contrastCase);
const misleading = reviewStrategySections({
  proposal: markdown('outcome checks', {
    ...contrastCase.candidate,
    Oracle: 'Always capture rejected payments; intentionally incorrect fixture oracle'
  })
});
assert.equal(misleading.findings.length, 0);
assert.equal(misleading.semanticCorrectnessVerified, false);
console.log(
  JSON.stringify(
    {
      kind: dataset.kind,
      cases,
      result: 'structural-fixture-expectations-met',
      semanticQuality: 'not-evaluated',
      humanReview: 'deferred-to-final-acceptance',
      userProductivity: 'not-measured',
      counterproductiveExample: 'Populated but incorrect oracle passes structural checks; independent review required.',
      limitations: [
        'Synthetic candidates are constructed examples, not model runs or user observations.',
        'Populated cells can be semantically wrong; these checks only exercise structural diagnostics.',
        'Independent review, counterproductive examples and real pilots remain required before usefulness claims.'
      ]
    },
    null,
    2
  )
);
