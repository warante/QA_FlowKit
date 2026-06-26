# Epic 13 - Product Baseline and Documentation Consistency

**Status:** Blocked
**Milestone:** M1
**Accountable:** Product manager
**Technical owner:** Engineering lead
**Contributors:** Technical writer, security engineer, release engineer, QA automation engineer

## Objective

Create one accurate product baseline before further promotion or contract freeze. Remove contradictions in version,
maturity, audit, support and security language, then prevent recurrence through automated checks.

## TASK-051 - Define product terminology and source-of-truth rules

**Owner:** Product manager
**Depends on:** None

**Status:** Done

Subtasks:

- Define lifecycle terms: prototype, MVP capability, Beta product, release candidate and Stable.
- Decide where exact versions are allowed and where docs must use npm badges, dist-tags or generic channel language.
- Define support claim levels for operating systems, Node versions, adapters, presets and external tools.
- Record which statements are product guarantees versus current implementation details.

Documentation:

- Add terminology and version-reference rules to `docs/qa-ai/stability-policy.md`.
- Update maintainer guidance in `CONTRIBUTING.md`.
- Link the policy from README and the 1.0 task index.

Validation:

- Technical writer and engineering lead review all definitions.
- Search the repository for conflicting lifecycle and exact-version language.

Acceptance:

- Every public claim has an identified source of truth and owner.

## TASK-052 - Correct current documentation inconsistencies

**Owner:** Technical writer
**Depends on:** TASK-051

**Status:** Done

Subtasks:

- Replace stale `0.5.0-beta.*` claims with the agreed source-of-truth pattern.
- Reconcile Beta product status with components still described as MVP.
- Make `SECURITY.md` match the actual `npm audit` threshold and CI conditions.
- Clarify that `--audit-level=low` is the enforced threshold.
- Review English and Spanish README content for semantic parity.
- Correct stale beta exit checklist items that are already complete.

Documentation:

- Update `README.md`, `README.es.md`, `SECURITY.md`, `ROADMAP.md`, stability policy and affected architecture guides.
- Add a short migration note only if a user-visible support claim changes.

Validation:

- Run link, spelling/format and consistency checks.
- Manually compare the first-use sections in both README languages.

Acceptance:

- No contradictory version, maturity, audit or release-channel claims remain.

## TASK-053 - Establish an actionable private vulnerability channel

**Owner:** Security engineer
**Depends on:** TASK-051

**Status:** Done

Subtasks:

- Select GitHub Private Vulnerability Reporting as the primary channel.
- Document a fallback private contact owned by maintainers if project policy permits one.
- Verify the issue-template security link reaches usable instructions.
- Define expected acknowledgement and triage targets without promising unsupported service levels.

Documentation:

- Rewrite the reporting section in `SECURITY.md`.
- Update `.github/ISSUE_TEMPLATE/config.yml` text if necessary.
- Add maintainer triage steps to the release/security documentation.

Validation:

- Human maintainer verifies the private reporting feature is enabled in repository settings.
- Security engineer performs a no-submit walkthrough.

Verification (2026-06-26):

- Maintainer enabled Private Vulnerability Reporting in repository settings.
- `gh api repos/warante/QA_FlowKit/private-vulnerability-reporting` returned `{"enabled":true}`.
- Public `/security/advisories` shows **Report a vulnerability** without requiring a public issue.

Acceptance:

- A reporter can identify a private path without opening a public issue.

## TASK-054 - Add documentation consistency checks

**Owner:** CLI/framework engineer
**Depends on:** TASK-051, TASK-052

**Status:** Done

Subtasks:

- Add a repository script that checks forbidden stale version literals in evergreen docs.
- Check documented CI commands against canonical package scripts and workflow audit level.
- Check lifecycle terminology in designated public files.
- Add local Markdown link validation without requiring external network access.
- Keep an explicit allowlist for changelog, migration and historical references.

Tests:

- Unit-test allowed historical references and rejected stale evergreen references.
- Add fixtures for broken links, command drift and inconsistent status terms.

CI:

- Run the consistency checker in `validate:oss-extraction`.
- Add a clearly named CI step so failures are discoverable.

Documentation:

- Document how to update the allowlist and resolve failures.
- Add the check to `AGENTS.md` and contributor validation commands if it becomes a separate command.

Acceptance:

- A deliberately stale README version, incorrect audit threshold and broken local link each fail CI.
- Historical changelog references continue to pass.

## Epic exit criteria

- TASK-051, TASK-052, TASK-053 and TASK-054 are Done.
- The automated validation matrix is green.
- M1 baseline complete; cross-functional sign-offs for stable `1.0.0` are recorded in `stable-release-approval.v1.json` (TASK-082).

## Implementation evidence

- Lifecycle, version-source and support-claim rules:
  `docs/qa-ai/stability-policy.md`.
- Corrected public claims: `README.md`, `README.es.md`, `SECURITY.md` and `CONTRIBUTING.md`.
- Private reporting entry point: `SECURITY.md` and `.github/ISSUE_TEMPLATE/config.yml`.
- Private reporting setting evidence: GitHub API `private-vulnerability-reporting` returned `{"enabled":true}` on 2026-06-26 (previously disabled on 2026-06-07).
- Automated checker: `.github/scripts/verify-documentation-consistency.mjs`.
- Unit coverage: `.github/scripts/test-documentation-consistency.mjs`.
- CI integration: named `Check documentation consistency` steps plus `validate:oss-extraction`.
