# Epic 20 - Stable 1.0 Release and Post-Release Verification

**Status:** Planned
**Milestone:** M7
**Accountable:** Maintainer
**Operational owner:** Release engineer
**Contributors:** Product manager, engineering lead, QA lead, security engineer, technical writer, developer relations

## Objective

Publish `1.0.0` through the canonical automated path, verify the public package and complete a controlled transition
from beta to stable support.

## TASK-083 - Merge the stable release configuration

**Owner:** Maintainer
**Depends on:** TASK-082 (`docs/qa-ai/stable-release-approval.v1.json` → `status: approved`, `epic20Unblocked: true`)
**Status:** In validation (stable policy prepared; merge pending TASK-082 + maintainer PR)

Subtasks:

- Merge the reviewed release-please stable policy change.
- Confirm prerelease settings are removed only as planned.
- Verify CI is green on `main`.
- Confirm no unrelated version or changelog edits were introduced manually.

Documentation:

- Update the release checklist only if rehearsal exposed a procedural difference.
- Link the merged stable-policy change from the release record.

Acceptance:

- Release Please is configured to propose `1.0.0` and publish stable semver to `latest`.

**Evidence (source repo):**

- Prepared policy: `.release-please-config.stable.json` (active remains rc until stable merge).
- Config record: `docs/qa-ai/stable-release-config.v1.json`, `docs/qa-ai/stable-release-config.md`.
- Verification: `.github/scripts/verify-stable-release-config.mjs` → `npm run test:stable-release-config`.
- Rehearsal: `.github/scripts/run-stable-config-rehearsal.mjs` → `npm run test:e2e-stable-config-rehearsal`.
- CI job: `stable-config-rehearsal` in `.github/workflows/ci.yml`.
- Helpers: `.github/scripts/lib/stable-release-config.mjs`.
- Included in `npm run validate:oss-extraction`.
- **Pending human:** TASK-082 approval, merge stable config PR, update record to `merged`, green CI on `main`.

## TASK-084 - Review and merge the `1.0.0` Release PR

**Owner:** Maintainer
**Depends on:** TASK-083
**Status:** In validation (review assets ready; awaiting release-please Release PR)

Subtasks:

- Review `package.json`, release manifest and generated changelog.
- Verify release notes describe migration, stable contracts, examples and limitations.
- Confirm package verification and full CI are green.
- Merge the Release PR; do not manually create a tag or run local publish.

Documentation:

- Review the generated changelog and GitHub Release text for factual accuracy.
- Ensure migration and known-limitations links point to the final stable documents.

Acceptance:

- Automated workflow creates one GitHub Release/tag and starts one npm publish.

**Evidence (source repo):**

- Release PR record: `docs/qa-ai/stable-release-pr.v1.json`, `docs/qa-ai/stable-release-pr.md`.
- Release notes template: `docs/qa-ai/stable-release-notes.template.md`.
- Verification: `.github/scripts/verify-stable-release-pr.mjs` → `npm run test:stable-release-pr`.
- Rehearsal: `.github/scripts/run-stable-release-pr-rehearsal.mjs` → `npm run test:e2e-stable-release-pr-rehearsal`.
- Helpers: `.github/scripts/lib/stable-release-pr.mjs`.
- CI job: `stable-release-pr-rehearsal` in `.github/workflows/ci.yml`.
- Included in `npm run validate:oss-extraction`.
- **Pending human:** merge TASK-083 config, review Release PR `chore: release 1.0.0`, merge PR, update record to `merged`.

## TASK-085 - Perform post-publish verification

**Owner:** Release engineer
**Depends on:** TASK-084
**Status:** In validation (automation ready; live stable publish pending)

Subtasks:

- Verify `npm view qa-flowkit version` and dist-tags.
- Verify npm provenance and packed file allowlist.
- Install from `latest` in clean Ubuntu and Windows environments.
- Run `version`, `init`, `doctor`, `run`, validators and `update`.
- Validate public examples against the published package.
- Confirm GitHub Release notes and npm metadata links.

Documentation:

- Record verification evidence in the release issue.
- Correct only factual documentation defects through normal PRs.

Acceptance:

- M7 gate passes; all post-publish checks succeed.

**Evidence (source repo):**

- Post-publish validator: `.github/scripts/run-stable-post-publish-validation.mjs` (`--version` / `--local-simulation`).
- Status record: `docs/qa-ai/stable-post-publish.v1.json`, `docs/qa-ai/stable-post-publish.md`.
- Unit tests: `.github/scripts/test-stable-post-publish.mjs` → `npm run test:stable-post-publish:unit`.
- Status verifier: `npm run test:stable-post-publish-status`.
- Workflows: `release-please.yml` (automatic stable path), `stable-post-publish.yml` (`workflow_dispatch`).
- Helpers: `.github/scripts/lib/stable-version.mjs`.
- Included in `npm run validate:oss-extraction`.
- **Pending human:** publish `1.0.0` to `latest`, run example-compatibility channel `latest`, update record to `completed`.

## TASK-086 - Announce stable availability

**Owner:** Developer relations
**Depends on:** TASK-085
**Status:** In validation (announcement assets ready; public README still Beta until publish)

Subtasks:

- Update README status and installation guidance from beta to stable.
- Publish a concise announcement with demo, examples, migration guide and limitations.
- Notify pilot participants and invite structured feedback.
- Avoid unsupported productivity or security claims.

Documentation:

- Update documentation index, stability policy and release checklist for stable maintenance.

Acceptance:

- All public entry points use stable commands and accurate support claims.

**Evidence (source repo):**

- Announcement record: `docs/qa-ai/stable-announcement.v1.json`, `docs/qa-ai/stable-announcement.md`.
- Template: `docs/qa-ai/stable-announcement.template.md`.
- Entrypoint flip list: `docs/qa-ai/stable-public-entrypoints.v1.json`.
- Stable policy text: `docs/qa-ai/stability-policy-stable.md`.
- Feedback: `.github/ISSUE_TEMPLATE/stable-feedback.yml`.
- Verification: `.github/scripts/verify-stable-announcement.mjs` → `npm run test:stable-announcement`.
- Unit tests: `.github/scripts/test-stable-announcement.mjs`.
- Included in `npm run validate:oss-extraction`.
- **Pending human:** TASK-085 complete, flip README/README.es/SECURITY per entrypoints manifest, publish announcement, set `status: published`.

## TASK-087 - Run the 30-day post-release review

**Owner:** Product manager
**Depends on:** TASK-086

Subtasks:

- Monitor install/update failures, issue volume, example CI and security reports.
- Compare adoption and support metrics with beta.
- Triage regressions and decide patch releases through normal release-please flow.
- Move deferred ideas into a post-1.0 roadmap without reopening the 1.0 scope.
- Archive completed 1.0 tasks with evidence links.

Documentation:

- Publish a 30-day retrospective and next roadmap revision.

Acceptance:

- Stable support ownership is explicit and follow-up work is prioritized.

## Epic exit criteria

- `qa-flowkit@1.0.0` is available on npm `latest`.
- Clean install and supported update paths are verified from the published package.
- Stable documentation and support processes are active.
