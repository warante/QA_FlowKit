# Epic 18 - Security, Agent Compatibility and CI Trust

**Status:** Planned
**Milestone:** M5
**Accountable:** Security engineer
**Contributors:** Engineering lead, QA automation engineer, developer experience engineer, release engineer, technical writer

## Objective

Make security boundaries and compatibility claims precise, test the guarantees QA FlowKit actually provides and avoid
implying enforcement that depends on the host agent.

## TASK-073 - Publish the threat model

**Owner:** Security engineer
**Depends on:** Epic 17 contract inventory

Subtasks:

- Identify assets, trust boundaries, actors and abuse cases.
- Cover unrestricted shell bypass, path traversal, overwrite, deletion, secret leakage, supply chain and external writes.
- Distinguish harness enforcement, validator detection, prompt guidance and host/tool enforcement.
- Define accepted residual risks for 1.0.

Documentation:

- Add `docs/qa-ai/threat-model.md`.
- Align `SECURITY.md`, architecture and harness documentation.

Validation:

- Structured security review with engineering and an independent reviewer.
- Map each mitigated threat to tests or operational controls.

Acceptance:

- Every security claim in public docs maps to an implemented control or an explicit limitation.

## TASK-074 - Expand adversarial and failure-path testing

**Owner:** QA automation engineer
**Depends on:** TASK-073

Subtasks:

- Test repository escapes, symlink/junction behavior where supported, unsafe config paths and path races.
- Test secret-like values in artifacts, approval notes and mappings.
- Test overwrite refusal, delete denial, malformed contracts, corrupted state and concurrent mutations.
- Verify logs and JSON errors do not expose sensitive content.

Tests and CI:

- Implement E2E-08 on Ubuntu and Windows.
- Add platform-specific tests for Windows paths and filesystem semantics.
- Keep deterministic fixtures and avoid real credentials.

Documentation:

- Add troubleshooting for recoverable corrupt state and rejected paths.
- Update the threat-control matrix.

Acceptance:

- All high-risk threats have automated regression coverage or a documented reason/manual control.

## TASK-075 - Define and verify adapter support levels

**Owner:** Developer experience engineer
**Depends on:** Epic 15 examples, Epic 17 contract freeze

Subtasks:

- Define support levels such as template-verified, CLI-smoke-verified and host-E2E-verified.
- Inventory Claude Code, OpenCode, Codex, Cline, Continue, Aider, Goose and Gemini CLI.
- Build a common interaction acceptance script.
- Run selected real-host E2E checks for the primary supported adapters.
- Label adapters accurately when host automation is unavailable.

Tests and CI:

- Expand E2E-07 content and bootstrap checks for every adapter.
- Preserve Claude/OpenCode root parity checks.
- Store signed manual evidence for host-only verification.

Documentation:

- Replace broad compatibility claims with the verified support matrix.
- Document host-specific limitations and fallback interaction behavior.

Acceptance:

- Every advertised adapter has a visible support level and current verification date/version range.

## TASK-076 - Harden CI observability and required checks

**Owner:** Release engineer
**Depends on:** TASK-074, TASK-075

Subtasks:

- Give each required scenario a stable, descriptive check name.
- Ensure failures retain concise artifacts/logs without secrets.
- Add timeouts, concurrency controls and retry only for proven external flakiness.
- Verify branch protection requires the intended checks.
- Add scheduled validation for examples and supported npm channels.

Documentation:

- Document required checks, ownership and failure triage.
- Update contributor and release checklists.

Validation:

- Deliberately fail each new check in a test branch or fixture.
- Human maintainer verifies branch protection settings.

Acceptance:

- A maintainer can identify scenario, platform and remediation path from every CI failure.

## TASK-077 - Complete pre-RC security and dependency review

**Owner:** Security engineer
**Depends on:** TASK-073 through TASK-076

Subtasks:

- Review runtime and development dependencies, action pins and package provenance.
- Confirm audit threshold and CodeQL configuration.
- Review npm lifecycle scripts and packed files.
- Triage open Dependabot and security findings.
- Record accepted residual risks with owner and review date.

Documentation:

- Publish a security readiness summary without exploitable detail.
- Update release checklist with final security sign-off.

Acceptance:

- No unresolved critical/high issue; medium risks require documented acceptance.

## Epic exit criteria

- M5 gate passes.
- E2E-07 and E2E-08 pass at their declared automation level.
- Security and compatibility documentation match tested reality.
