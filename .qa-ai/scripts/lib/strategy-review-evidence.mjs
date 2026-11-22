import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { resolveRepoPath } from './utils.mjs';
import { scanTextForSecrets } from './secret-patterns.mjs';

export const STRATEGY_REVIEW_DIMENSIONS = [
  'ambiguity',
  'oracleCorrectness',
  'duplication',
  'reviewRework',
  'retainedValue'
];
const judgments = ['improved', 'equivalent', 'regressed', 'uncertain'];
const decisions = ['retain', 'revise', 'defer'];
const identifier = (value) =>
  typeof value === 'string' && value.trim() === value && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(value);
const digest = (value) => createHash('sha256').update(value).digest('hex');
const validHash = (value) => typeof value === 'string' && value.length === 64 && /^[a-f0-9]{64}$/.test(value);
const text = (value) => typeof value === 'string' && value.trim().length > 0 && value.length <= 2000;
const validDate = (value, now) => {
  if (
    typeof value !== 'string' ||
    value.trim() !== value ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    Date.parse(value) > now + 300000
  )
    return false;
  const day = value.slice(0, 10);
  return (
    new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day &&
    Number(value.slice(11, 13)) < 24 &&
    Number(value.slice(14, 16)) < 60 &&
    Number(value.slice(17, 19)) < 60
  );
};

function requireInput(condition) {
  if (!condition) throw new Error('STRATEGY_REVIEW_INVALID_INPUT');
}

function exactKeys(value, keys) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function safeRelative(value) {
  requireInput(
    typeof value === 'string' &&
      value.length <= 500 &&
      !path.isAbsolute(value) &&
      !path.win32.isAbsolute(value) &&
      !/[\\:]/.test(value) &&
      ![...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) &&
      value
        .split('/')
        .every(
          (part) =>
            part &&
            part !== '.' &&
            part !== '..' &&
            !['.git', 'node_modules', 'references'].includes(part.toLowerCase()) &&
            !part.toLowerCase().startsWith('.env')
        ) &&
      /\.(?:md|txt|feature|json)$/i.test(value)
  );
  return value;
}

function validatePlan(plan) {
  requireInput(
    exactKeys(plan, ['version', 'kind', 'implementationContributors', 'cases']) &&
      plan.version === 1 &&
      plan.kind === 'strategy-review-plan' &&
      Array.isArray(plan.implementationContributors) &&
      plan.implementationContributors.length > 0 &&
      plan.implementationContributors.length <= 100 &&
      plan.implementationContributors.every(identifier) &&
      new Set(plan.implementationContributors.map((id) => id.toLowerCase())).size ===
        plan.implementationContributors.length &&
      Array.isArray(plan.cases) &&
      plan.cases.length > 0 &&
      plan.cases.length <= 100
  );
  const ids = new Set();
  for (const item of plan.cases) {
    requireInput(
      exactKeys(item, ['id', 'rf', 'criterionIds', 'baseline', 'candidate']) &&
        identifier(item.id) &&
        !ids.has(item.id) &&
        typeof item.rf === 'string' &&
        item.rf.trim() === item.rf &&
        /^RF-[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(item.rf) &&
        Array.isArray(item.criterionIds) &&
        item.criterionIds.length > 0 &&
        item.criterionIds.length <= 100 &&
        item.criterionIds.every(identifier) &&
        new Set(item.criterionIds).size === item.criterionIds.length
    );
    ids.add(item.id);
    safeRelative(item.baseline);
    safeRelative(item.candidate);
    requireInput(item.baseline !== item.candidate);
  }
}

function validateReviews(data, knownIds, now) {
  requireInput(
    exactKeys(data, ['version', 'kind', 'planSha256', 'reviews']) &&
      data.version === 1 &&
      data.kind === 'strategy-review-records' &&
      validHash(data.planSha256) &&
      Array.isArray(data.reviews) &&
      data.reviews.length <= 500
  );
  const pairs = new Set();
  for (const review of data.reviews) {
    requireInput(
      exactKeys(review, [
        'caseId',
        'reviewerId',
        'independentFromImplementation',
        'reviewedAt',
        'baselineSha256',
        'candidateSha256',
        'dimensions',
        'decision',
        'rationale',
        'evidence'
      ]) &&
        knownIds.has(review.caseId) &&
        identifier(review.reviewerId) &&
        typeof review.independentFromImplementation === 'boolean' &&
        validHash(review.baselineSha256) &&
        validHash(review.candidateSha256) &&
        decisions.includes(review.decision) &&
        text(review.rationale) &&
        exactKeys(review.dimensions, STRATEGY_REVIEW_DIMENSIONS) &&
        validDate(review.reviewedAt, now) &&
        Array.isArray(review.evidence) &&
        review.evidence.length > 0 &&
        review.evidence.length <= 20
    );
    const pair = `${review.caseId}\0${review.reviewerId.toLowerCase()}`;
    requireInput(!pairs.has(pair));
    pairs.add(pair);
    for (const dimension of Object.values(review.dimensions)) {
      requireInput(
        exactKeys(dimension, ['judgment', 'rationale']) &&
          judgments.includes(dimension.judgment) &&
          text(dimension.rationale)
      );
    }
    const paths = new Set();
    for (const evidence of review.evidence) {
      requireInput(exactKeys(evidence, ['path', 'sha256']) && validHash(evidence.sha256));
      safeRelative(evidence.path);
      requireInput(!paths.has(evidence.path));
      paths.add(evidence.path);
    }
  }
}

/** Consume supplied review evidence, never generate human opinions or grant workflow approval. */
export async function collectStrategyReviewEvidence(cwd, { plan: planPath, reviews: reviewPath = null } = {}) {
  cwd = path.resolve(cwd);
  const cache = new Map();
  let bytesRead = 0;
  const read = async (relative) => {
    safeRelative(relative);
    if (cache.has(relative)) return cache.get(relative);
    const target = resolveRepoPath(cwd, relative, { label: 'strategy review input' });
    const stat = await fs.stat(target);
    requireInput(stat.isFile() && stat.size <= 2 * 1024 * 1024);
    const buffer = await fs.readFile(target);
    bytesRead += buffer.length;
    requireInput(buffer.length <= 2 * 1024 * 1024 && bytesRead <= 16 * 1024 * 1024);
    const content = buffer.toString('utf8');
    requireInput(scanTextForSecrets(content).length === 0);
    const result = { sha256: digest(buffer), content };
    cache.set(relative, result);
    return result;
  };
  const planFile = await read(planPath);
  const plan = JSON.parse(planFile.content);
  validatePlan(plan);
  const packet = [];
  for (const item of plan.cases) {
    packet.push({
      id: item.id,
      rf: item.rf,
      criterionIds: item.criterionIds,
      baseline: { path: item.baseline, sha256: (await read(item.baseline)).sha256 },
      candidate: { path: item.candidate, sha256: (await read(item.candidate)).sha256 }
    });
  }
  const records = reviewPath
    ? JSON.parse((await read(reviewPath)).content)
    : {
        version: 1,
        kind: 'strategy-review-records',
        planSha256: planFile.sha256,
        reviews: []
      };
  validateReviews(records, new Set(packet.map((item) => item.id)), Date.now());
  const inputHashes = new Set([
    planFile.sha256,
    ...packet.flatMap((item) => [item.baseline.sha256, item.candidate.sha256])
  ]);
  if (reviewPath) inputHashes.add((await read(reviewPath)).sha256);
  const issues = [];
  const eligible = new Map(packet.map((item) => [item.id, []]));
  if (records.planSha256 !== planFile.sha256) issues.push({ code: 'REVIEW_PLAN_STALE' });
  for (const review of records.reviews) {
    const item = packet.find((entry) => entry.id === review.caseId);
    const codes = [];
    if (review.baselineSha256 !== item.baseline.sha256 || review.candidateSha256 !== item.candidate.sha256)
      codes.push('REVIEW_ARTIFACT_STALE');
    if (
      !review.independentFromImplementation ||
      plan.implementationContributors.some((id) => id.toLowerCase() === review.reviewerId.toLowerCase())
    )
      codes.push('REVIEW_INDEPENDENCE_NOT_ATTESTED');
    for (const evidence of review.evidence) {
      const actualHash = (await read(evidence.path)).sha256;
      if (actualHash !== evidence.sha256) codes.push('REVIEW_EVIDENCE_STALE');
      if (inputHashes.has(actualHash)) codes.push('REVIEW_EVIDENCE_IS_INPUT');
    }
    if (
      review.decision === 'retain' &&
      Object.values(review.dimensions).some((dimension) => dimension.judgment === 'regressed')
    )
      codes.push('REVIEW_DECISION_CONTRADICTS_REGRESSION');
    for (const code of new Set(codes)) issues.push({ code, caseId: item.id, reviewerId: review.reviewerId });
    if (!codes.length && records.planSha256 === planFile.sha256) eligible.get(item.id).push(review);
  }
  const cases = packet.map((item) => {
    const valid = eligible.get(item.id);
    const disagreements = STRATEGY_REVIEW_DIMENSIONS.filter(
      (dimension) => new Set(valid.map((review) => review.dimensions[dimension].judgment)).size > 1
    );
    const decisionConflict = new Set(valid.map((review) => review.decision)).size > 1;
    let status = 'pending-review';
    if (valid.length) {
      status =
        decisionConflict || disagreements.length
          ? 'conflicting-reviews'
          : valid.some((review) => review.decision === 'revise')
            ? 'revisions-requested'
            : valid.some(
                  (review) =>
                    review.decision === 'defer' ||
                    Object.values(review.dimensions).some((dimension) => dimension.judgment === 'uncertain')
                )
              ? 'deferred'
              : 'recorded-retain';
    }
    return {
      ...item,
      status,
      eligibleReviewers: valid.map((review) => review.reviewerId).sort(),
      decisions: valid.map((review) => ({
        reviewerId: review.reviewerId,
        decision: review.decision,
        reviewedAt: review.reviewedAt,
        evidence: review.evidence
      })),
      disagreements,
      decisionConflict
    };
  });
  const priority = ['conflicting-reviews', 'revisions-requested', 'pending-review', 'deferred'];
  const status = issues.length
    ? 'incomplete-evidence'
    : priority.find((value) => cases.some((item) => item.status === value)) || 'recorded-retain';
  return {
    version: 1,
    kind: 'strategy-review-evidence-report',
    readOnly: true,
    status,
    planSha256: planFile.sha256,
    dimensions: STRATEGY_REVIEW_DIMENSIONS,
    recordsSource: reviewPath ? { path: reviewPath, sha256: (await read(reviewPath)).sha256 } : null,
    suppliedReviews: records.reviews.length,
    cases,
    issues,
    acceptanceGranted: false,
    signaturesVerified: false,
    independence: 'supplied-attestation-not-identity-verification',
    userProductivity: 'not-measured',
    limitations: [
      'Hashes bind supplied records to bytes; they are not signatures or trusted timestamps.',
      'Reviewer identities, independence attestations and semantic judgments require human verification.',
      'recorded-retain means supplied records agree, not that a task, pilot, release or workflow is approved.',
      'Source contents and rationales are not echoed. Review identifiers and repository paths before sharing.'
    ]
  };
}
