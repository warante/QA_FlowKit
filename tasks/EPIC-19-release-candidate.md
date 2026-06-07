# Epic 19 - 1.0 Release Candidate and Readiness

**Status:** Planned
**Milestone:** M6
**Accountable:** Release engineer
**Contributors:** All profiles; final approval by product manager, engineering lead, QA lead, security engineer and maintainer

## Objective

Create, validate and soak a `1.0.0` release candidate using the same automation and package contents intended for the
stable release.

## TASK-078 - Complete the 1.0 readiness audit

**Owner:** QA lead
**Depends on:** Epics 13-18

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

## TASK-079 - Rehearse stable release configuration

**Owner:** Release engineer
**Depends on:** TASK-078

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

## TASK-080 - Publish and validate `1.0.0-rc`

**Owner:** Release engineer
**Depends on:** TASK-079

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

## TASK-081 - Run the RC soak and defect closure

**Owner:** Product manager
**Depends on:** TASK-080

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

## TASK-082 - Approve stable release

**Owner:** Maintainer
**Depends on:** TASK-081

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

## Epic exit criteria

- RC is published and completes the soak.
- Stable release configuration and evidence are approved.
- No required work remains outside Epic 20 launch execution.
