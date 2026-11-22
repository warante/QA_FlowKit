import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { collectStrategyReviewEvidence, STRATEGY_REVIEW_DIMENSIONS } from '../../lib/strategy-review-evidence.mjs';
import { withTempWorkspace, repoRoot } from './_shared.mjs';

const sha = (value) => createHash('sha256').update(value).digest('hex');
const write = (root, name, value) => fs.writeFile(path.join(root, name), JSON.stringify(value, null, 2));
async function fixture(tmp) {
  await fs.writeFile(path.join(tmp, 'baseline.md'), 'Synthetic baseline: outcome unclear.');
  await fs.writeFile(path.join(tmp, 'candidate.md'), 'Ejemplo sintético: resultado rechazado y sin efecto lateral.');
  await fs.writeFile(path.join(tmp, 'notes.md'), 'Synthetic review notes, not actual human acceptance.');
  const plan = {
    version: 1,
    kind: 'strategy-review-plan',
    implementationContributors: ['author-1'],
    cases: [
      {
        id: 'CASE-001',
        rf: 'RF-101',
        criterionIds: ['CR-RF-101-01'],
        baseline: 'baseline.md',
        candidate: 'candidate.md'
      }
    ]
  };
  await write(tmp, 'plan.json', plan);
  const packet = await collectStrategyReviewEvidence(tmp, { plan: 'plan.json' });
  const review = {
    caseId: 'CASE-001',
    reviewerId: 'reviewer-1',
    independentFromImplementation: true,
    reviewedAt: new Date(Date.now() - 60000).toISOString(),
    baselineSha256: packet.cases[0].baseline.sha256,
    candidateSha256: packet.cases[0].candidate.sha256,
    dimensions: Object.fromEntries(
      STRATEGY_REVIEW_DIMENSIONS.map((key) => [
        key,
        { judgment: 'improved', rationale: 'Constructed synthetic judgment for a development test.' }
      ])
    ),
    decision: 'retain',
    rationale: 'Synthetic retain, not a real approval.',
    evidence: [{ path: 'notes.md', sha256: sha(await fs.readFile(path.join(tmp, 'notes.md'))) }]
  };
  const records = { version: 1, kind: 'strategy-review-records', planSha256: packet.planSha256, reviews: [review] };
  await write(tmp, 'reviews.json', records);
  return { plan, packet, review, records };
}
const collect = (tmp) => collectStrategyReviewEvidence(tmp, { plan: 'plan.json', reviews: 'reviews.json' });

test('strategy review preparation is read-only, hash-bound and pending without invented opinions', async () => {
  await withTempWorkspace('qa-review-prepare-', async (tmp) => {
    const { packet } = await fixture(tmp);
    const before = await fs.readdir(tmp);
    const report = await collectStrategyReviewEvidence(tmp, { plan: 'plan.json' });
    assert.deepEqual(report, packet);
    assert.equal(report.status, 'pending-review');
    assert.equal(report.suppliedReviews, 0);
    assert.equal(report.acceptanceGranted, false);
    assert.equal(report.signaturesVerified, false);
    assert.equal(report.cases[0].rf, 'RF-101');
    assert.deepEqual(report.cases[0].criterionIds, ['CR-RF-101-01']);
    assert.equal(report.cases[0].candidate.sha256, sha(await fs.readFile(path.join(tmp, 'candidate.md'))));
    assert.deepEqual(await fs.readdir(tmp), before);
    assert.ok(!JSON.stringify(report).includes('resultado rechazado'));
  });
});

test('complete supplied records are recorded-retain, not independent identity verification or approval', async () => {
  await withTempWorkspace('qa-review-recorded-', async (tmp) => {
    await fixture(tmp);
    const report = await collect(tmp);
    assert.equal(report.status, 'recorded-retain');
    assert.equal(report.acceptanceGranted, false);
    assert.equal(report.userProductivity, 'not-measured');
    assert.match(report.independence, /not-identity-verification/);
    assert.deepEqual(report.cases[0].eligibleReviewers, ['reviewer-1']);
    assert.ok(!JSON.stringify(report).includes('Constructed synthetic judgment'));
  });
});

test('review hashes detect changed source, evidence and evaluation plan without silently accepting old reviews', async () => {
  for (const [file, code] of [
    ['candidate.md', 'REVIEW_ARTIFACT_STALE'],
    ['notes.md', 'REVIEW_EVIDENCE_STALE'],
    ['plan.json', 'REVIEW_PLAN_STALE']
  ]) {
    await withTempWorkspace('qa-review-stale-', async (tmp) => {
      await fixture(tmp);
      await fs.appendFile(path.join(tmp, file), '\n');
      const report = await collect(tmp);
      assert.equal(report.status, 'incomplete-evidence');
      assert.ok(report.issues.some((issue) => issue.code === code));
      assert.equal(report.cases[0].eligibleReviewers.length, 0);
    });
  }
});

test('self-review, case variants of author IDs and missing independence attestation do not satisfy review', async () => {
  for (const mutation of [
    { reviewerId: 'author-1' },
    { reviewerId: 'AUTHOR-1' },
    { independentFromImplementation: false }
  ]) {
    await withTempWorkspace('qa-review-self-', async (tmp) => {
      const { records, review } = await fixture(tmp);
      records.reviews = [{ ...review, ...mutation }];
      await write(tmp, 'reviews.json', records);
      const report = await collect(tmp);
      assert.equal(report.status, 'incomplete-evidence');
      assert.ok(report.issues.some((issue) => issue.code === 'REVIEW_INDEPENDENCE_NOT_ATTESTED'));
    });
  }
});

test('uncertainty, revision and deferral remain visible and cannot become acceptance', async () => {
  for (const [decision, judgment, expected] of [
    ['revise', 'regressed', 'revisions-requested'],
    ['defer', 'equivalent', 'deferred'],
    ['retain', 'uncertain', 'deferred'],
    ['retain', 'equivalent', 'recorded-retain']
  ]) {
    await withTempWorkspace('qa-review-decisions-', async (tmp) => {
      const { records, review } = await fixture(tmp);
      review.decision = decision;
      review.dimensions.oracleCorrectness.judgment = judgment;
      await write(tmp, 'reviews.json', records);
      const report = await collect(tmp);
      assert.equal(report.status, expected);
      assert.equal(report.acceptanceGranted, false);
    });
  }
});

test('retain with a recorded regression is rejected as inconsistent evidence', async () => {
  await withTempWorkspace('qa-review-regression-', async (tmp) => {
    const { records, review } = await fixture(tmp);
    review.dimensions.ambiguity.judgment = 'regressed';
    await write(tmp, 'reviews.json', records);
    const report = await collect(tmp);
    assert.ok(report.issues.some((issue) => issue.code === 'REVIEW_DECISION_CONTRADICTS_REGRESSION'));
    assert.equal(report.status, 'incomplete-evidence');
  });
});

test('conflicting reviewers are surfaced instead of averaged, including decision-only disagreement', async () => {
  for (const dimensionConflict of [true, false]) {
    await withTempWorkspace('qa-review-conflict-', async (tmp) => {
      const { records, review } = await fixture(tmp);
      const other = globalThis.structuredClone(review);
      other.reviewerId = 'reviewer-2';
      if (dimensionConflict) other.dimensions.oracleCorrectness.judgment = 'equivalent';
      else other.decision = 'revise';
      records.reviews.push(other);
      await write(tmp, 'reviews.json', records);
      const report = await collect(tmp);
      assert.equal(report.status, 'conflicting-reviews');
      assert.deepEqual(report.cases[0].eligibleReviewers, ['reviewer-1', 'reviewer-2']);
      assert.equal(report.cases[0].decisionConflict, !dimensionConflict);
      if (dimensionConflict) assert.deepEqual(report.cases[0].disagreements, ['oracleCorrectness']);
    });
  }
});

test('copied input content cannot be the sole review evidence, even under a different path', async () => {
  await withTempWorkspace('qa-review-evidence-', async (tmp) => {
    const { records, review } = await fixture(tmp);
    await fs.copyFile(path.join(tmp, 'candidate.md'), path.join(tmp, 'copy.md'));
    review.evidence = [{ path: 'copy.md', sha256: review.candidateSha256 }];
    await write(tmp, 'reviews.json', records);
    const report = await collect(tmp);
    assert.ok(report.issues.some((issue) => issue.code === 'REVIEW_EVIDENCE_IS_INPUT'));
  });
});

test('multi-case plans require evidence for every case; empty supplied reviews stay pending', async () => {
  await withTempWorkspace('qa-review-coverage-', async (tmp) => {
    const { plan, records } = await fixture(tmp);
    plan.cases.push({ ...plan.cases[0], id: 'CASE-002', rf: 'RF-102' });
    await write(tmp, 'plan.json', plan);
    const packet = await collectStrategyReviewEvidence(tmp, { plan: 'plan.json' });
    records.planSha256 = packet.planSha256;
    await write(tmp, 'reviews.json', records);
    assert.equal((await collect(tmp)).status, 'pending-review');
    records.reviews = [];
    await write(tmp, 'reviews.json', records);
    assert.equal((await collect(tmp)).suppliedReviews, 0);
  });
});

test('review input rejects unknown fields, duplicate reviewers/cases, missing dimensions and invalid dates', async () => {
  const mutations = [
    (r) => {
      r.extra = true;
    },
    (r) => {
      r.version = 2;
    },
    (r) => {
      r.reviews[0].caseId = 'UNKNOWN';
    },
    (r) => {
      r.reviews.push(globalThis.structuredClone(r.reviews[0]));
    },
    (r) => {
      r.reviews.push({ ...r.reviews[0], reviewerId: 'REVIEWER-1' });
    },
    (r) => {
      delete r.reviews[0].dimensions.ambiguity;
    },
    (r) => {
      r.reviews[0].dimensions.ambiguity.judgment = 'pass';
    },
    (r) => {
      r.reviews[0].reviewedAt = '2099-01-01T12:00:00+01:00';
    },
    (r) => {
      r.reviews[0].reviewedAt = '2026-02-30T12:00:00+01:00';
    },
    (r) => {
      r.reviews[0].reviewedAt = 'yesterday';
    },
    (r) => {
      r.reviews[0].rationale = '';
    },
    (r) => {
      r.reviews[0].evidence = [];
    },
    (r) => {
      r.reviews[0].evidence.push(globalThis.structuredClone(r.reviews[0].evidence[0]));
    },
    (r) => {
      r.reviews[0].baselineSha256 = 'a'.repeat(40);
    },
    (r) => {
      r.reviews[0].baselineSha256 += '\n';
    },
    (r) => {
      r.reviews[0].reviewerId = 'author-1\n';
    }
  ];
  await withTempWorkspace('qa-review-invalid-', async (tmp) => {
    const { records } = await fixture(tmp);
    for (const mutate of mutations) {
      const changed = globalThis.structuredClone(records);
      mutate(changed);
      await write(tmp, 'reviews.json', changed);
      await assert.rejects(collect(tmp), /INVALID_INPUT/);
    }
  });
});

test('plan input rejects unsafe paths, unknown fields, empty cases and duplicate author identifiers', async () => {
  await withTempWorkspace('qa-review-plan-', async (tmp) => {
    const { plan } = await fixture(tmp);
    const mutations = [
      (p) => {
        p.cases = [];
      },
      (p) => {
        p.cases.push(p.cases[0]);
      },
      (p) => {
        p.implementationContributors.push('AUTHOR-1');
      },
      (p) => {
        p.cases[0].candidate = p.cases[0].baseline;
      },
      (p) => {
        p.extra = 'ignored?';
      }
    ];
    for (const unsafe of [
      '../outside.md',
      'C:/outside.md',
      '\\\\server\\file.md',
      '.git/config',
      'references/book.txt',
      '.env.json',
      'node_modules/input.md',
      './candidate.md',
      'candidate.md/../candidate.md'
    ]) {
      mutations.push((p) => {
        p.cases[0].candidate = unsafe;
      });
    }
    for (const mutate of mutations) {
      const changed = globalThis.structuredClone(plan);
      mutate(changed);
      await write(tmp, 'plan.json', changed);
      await assert.rejects(collectStrategyReviewEvidence(tmp, { plan: 'plan.json' }), /INVALID_INPUT/);
    }
  });
});

test('review reader refuses oversized, external-linked and sensitive inputs without exposing contents', async () => {
  await withTempWorkspace('qa-review-security-', async (tmp) => {
    await fixture(tmp);
    await fs.writeFile(path.join(tmp, 'candidate.md'), 'x'.repeat(2 * 1024 * 1024 + 1));
    await assert.rejects(collect(tmp), /INVALID_INPUT/);
    const sensitive = ['Bearer', 'a'.repeat(30)].join(' ');
    await fs.writeFile(path.join(tmp, 'candidate.md'), sensitive);
    await assert.rejects(collect(tmp), (error) => !error.message.includes(sensitive));
    await withTempWorkspace('qa-review-outside-', async (outside) => {
      await fs.writeFile(path.join(outside, 'input.md'), 'outside');
      await fs.symlink(outside, path.join(tmp, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
      const { plan } = await fixture(tmp);
      plan.cases[0].candidate = 'linked/input.md';
      await write(tmp, 'plan.json', plan);
      await assert.rejects(collect(tmp), /inside/);
    });
  });
});

test('review CLI provides preparation, human summary and redacted input errors without writing files', async () => {
  await withTempWorkspace('qa-review-cli-', async (tmp) => {
    await fixture(tmp);
    const script = path.join(repoRoot, '.qa-ai/scripts/review-test-strategy.mjs');
    const run = (args) => spawnSync(process.execPath, [script, ...args], { cwd: tmp, encoding: 'utf8' });
    assert.equal(run(['--help']).status, 0);
    assert.equal(run(['--plan']).status, 1);
    assert.equal(run(['--bad']).status, 1);
    assert.equal(run(['--json=false']).status, 1);
    assert.equal(JSON.parse(run(['--plan', 'missing.json', '--json']).stderr).code, 'STRATEGY_REVIEW_INPUT_ERROR');
    const packet = run(['--plan', 'plan.json', '--json']);
    assert.equal(packet.status, 0);
    assert.equal(JSON.parse(packet.stdout).status, 'pending-review');
    assert.match(run(['--plan', 'plan.json', '--reviews', 'reviews.json']).stdout, /No workflow acceptance granted/);
  });
});
