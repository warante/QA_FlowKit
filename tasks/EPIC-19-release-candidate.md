# Epic 19 - 1.0 Release Candidate and Readiness

**Status:** In progress
**Milestone:** M6
**Accountable:** Release engineer
**Contributors:** All profiles; final approval by product manager, engineering lead, QA lead, security engineer and maintainer

## Objective

Create, validate and soak a `1.0.0` release candidate using the same automation and package contents intended for the
stable release.

## TASK-078 - Complete the 1.0 readiness audit

**Owner:** QA lead
**Depends on:** Epics 13-18

**Status:** In validation

Subtasks:

- Review every epic exit criterion and linked evidence.
- Confirm no unresolved P0/P1 defects and classify P2/P3 items.
- Verify public scope claims against implementation.
- Check English/Spanish documentation parity.
- Run [REVIEW-CHECKLIST.md](REVIEW-CHECKLIST.md) independently twice.

Validation:

- Full local validation suite.
- Full CI and CodeQL green on the candidate commit.
- Manual install and migration walkthrough by someone outside the implementation authors.

Documentation:

- Record the readiness audit, open-risk register and evidence links.
- Update roadmap/task statuses after the decision.

Acceptance:

- Cross-functional go/no-go record is approved for RC creation.

Implementation evidence:

- Readiness audit: `docs/qa-ai/readiness-audit.md` and `docs/qa-ai/readiness-audit.v1.json`.
- Open risk register: `docs/qa-ai/open-risk-register.v1.json`.
- Verification: `npm run test:readiness-audit`, `npm run test:readiness-audit:unit`, included in
  `npm run validate:oss-extraction`.
- Engineering REVIEW-CHECKLIST pass recorded on 2026-06-25 (`PASS_WITH_ACTIONS`).
- Pending human gates: independent checklist pass, non-author migration walkthrough, cross-functional sign-offs in
  `readiness-audit.v1.json`, maintainer security settings per `security-readiness.md`.

## TASK-079 - Rehearse stable release configuration

**Owner:** Release engineer
**Depends on:** TASK-078

**Status:** In validation

Subtasks:

- Prepare and review the release-please transition from `beta` to an `rc` prerelease policy.
- Define the release-please-native mechanism that selects `1.0.0-rc.N` without manually editing package versions.
- Prepare the separate `rc` to stable policy change, but do not merge it before RC approval.
- Verify RC versions resolve to the `rc` dist-tag and stable `1.0.0` resolves to `latest` in safe dry runs.
- Confirm npm Trusted Publishing settings with a human maintainer.
- Rehearse failure recovery before and after GitHub Release creation.
- Verify no local publish or manual tag step is required.

Tests:

- Implement E2E-09 against an RC or disposable package name/environment where available.
- Test post-publish retry behavior and packed install verification.

Documentation:

- Update release checklist with exact beta-to-RC and RC-to-stable procedures, including rollback limitations.

Acceptance:

- Release configuration review shows RC semver would publish to `rc`, then stable semver would publish to `latest`
  exactly once after a separately approved configuration change.

Implementation evidence:

- Prepared policies: `.release-please-config.rc.json` (rc) and `.release-please-config.stable.json` (latest); active
  `.release-please-config.json` remains **beta** until RC transition PR.
- Dist-tag helper: `.github/scripts/lib/npm-dist-tag.mjs` (parity with publish workflow bash).
- Policy verification: `.github/scripts/verify-release-policy.mjs`, `npm run test:release-policy`.
- E2E-09 dry-run: `.github/scripts/run-release-dry-run-validation.mjs`, CI job `release-dry-run`,
  `npm run test:e2e-release-dry-run`.
- Documentation: `docs/qa-ai/beta-to-rc-release.md`, updates to `release-checklist.md`.
- `run-release-please.mjs` supports `RELEASE_PLEASE_CONFIG_FILE` for RC rehearsal.
- Validation passed: `npm run test:release-policy`, `npm run test:release-policy:unit`,
  `npm run test:e2e-release-dry-run`.
- Pending human gate: confirm npm Trusted Publishing for `release-please.yml` (see `security-readiness.md`).

## TASK-080 - Publish and validate `1.0.0-rc`

**Owner:** Release engineer
**Depends on:** TASK-079
**Status:** In validation (automation ready; live publish pending maintainer merge of RC config)

Subtasks:

- Use release-please to create the RC release; do not manually bump or publish.
- Verify npm provenance, dist-tag, GitHub Release and changelog.
- Run clean install, update and primary workflow scenarios from the published package.
- Open a dedicated RC feedback issue/discussion with a structured template.

Documentation:

- Publish RC release notes, migration guide and known limitations.
- Point examples and CI canaries to the RC intentionally.

Acceptance:

- Published RC passes E2E-01 through E2E-09 as applicable.

**Evidence (source repo):**

- Post-publish validator: `.github/scripts/run-rc-post-publish-validation.mjs` (`--version` / `--local-simulation`).
- Unit tests: `.github/scripts/test-rc-post-publish.mjs` → `npm run test:rc-post-publish:unit`.
- Local rehearsal: `npm run test:rc-post-publish -- --local-simulation` (included in `validate:oss-extraction`).
- Workflows: `release-please.yml` (automatic RC path), `rc-post-publish.yml` (`workflow_dispatch`).
- Docs: `docs/qa-ai/rc-known-limitations.md`, `docs/qa-ai/rc-release-notes.template.md`, `beta-to-1.0-migration.md` (`@rc`).
- Feedback: `.github/ISSUE_TEMPLATE/rc-feedback.yml`.
- **Pending human:** merge `.release-please-config.rc.json`, merge Release PR, run example-compatibility with `rc`, open RC feedback issue.

## TASK-081 - Run the RC soak and defect closure

**Owner:** Product manager
**Depends on:** TASK-080
**Status:** In validation (soak tracking automation ready; awaiting first published RC start)

Subtasks:

- Soak for at least 14 calendar days unless a longer window is selected.
- Monitor installation, update, example and pilot repositories.
- Triage reports within the agreed project cadence.
- Restart the soak clock for any fix that changes a frozen public contract.
- Produce final known-issues and risk-acceptance list.

Validation:

- Nightly/scheduled example checks stay green.
- At least one clean install and one supported beta update are repeated near the end of soak.

Documentation:

- Update RC notes, troubleshooting and migration docs for every accepted fix.

Acceptance:

- No unresolved P0/P1 issue.
- No contract-changing fix has landed without a completed renewed soak.

**Evidence (source repo):**

- Soak state artifact: `docs/qa-ai/rc-soak-status.v1.json`.
- Verification script: `.github/scripts/verify-rc-soak-status.mjs` → `npm run test:rc-soak`.
- Unit tests: `.github/scripts/test-rc-soak-status.mjs` → `npm run test:rc-soak:unit`.
- Documentation: `docs/qa-ai/beta-to-rc-release.md` (TASK-081 checklist), `docs/qa-ai/release-checklist.md` (`rc` dist-tag convention).
- Included in `npm run validate:oss-extraction`.
- **Pending human:** start soak after first `1.0.0-rc.N`, keep issue triage cadence, record near-end clean-install/update reruns, finalize sign-offs.

## TASK-082 - Approve stable release

**Owner:** Maintainer
**Depends on:** TASK-081
**Status:** In validation (approval record ready; awaiting completed soak and sign-offs)

Subtasks:

- Review product, engineering, QA, security and release sign-offs.
- Confirm all human-only repository/npm settings.
- Approve the stable release-please configuration PR.
- Record the final release decision and accepted risks.

Documentation:

- Store the signed go/no-go decision and accepted risks in the release issue or maintained release record.
- Update the RC known-issues document with the final disposition.

Acceptance:

- M6 gate passes and Epic 20 is unblocked.

**Evidence (source repo):**

- Approval record: `docs/qa-ai/stable-release-approval.v1.json`, `docs/qa-ai/stable-release-approval.md`.
- Verification: `.github/scripts/verify-stable-release-approval.mjs` → `npm run test:stable-release-approval`.
- Unit tests: `.github/scripts/test-stable-release-approval.mjs` → `npm run test:stable-release-approval:unit`.
- Included in `npm run validate:oss-extraction`.
- **Pending human:** complete TASK-081 soak, confirm security/npm settings, record sign-offs, set `approved` + `epic20Unblocked`.

## Epic exit criteria

- RC is published and completes the soak.
- Stable release configuration and evidence are approved.
- No required work remains outside Epic 20 launch execution.
