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
**Depends on:** TASK-082

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

## TASK-084 - Review and merge the `1.0.0` Release PR

**Owner:** Maintainer
**Depends on:** TASK-083

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

## TASK-085 - Perform post-publish verification

**Owner:** Release engineer
**Depends on:** TASK-084

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

## TASK-086 - Announce stable availability

**Owner:** Developer relations
**Depends on:** TASK-085

Subtasks:

- Update README status and installation guidance from beta to stable.
- Publish a concise announcement with demo, examples, migration guide and limitations.
- Notify pilot participants and invite structured feedback.
- Avoid unsupported productivity or security claims.

Documentation:

- Update documentation index, stability policy and release checklist for stable maintenance.

Acceptance:

- All public entry points use stable commands and accurate support claims.

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
