# Epic 18 - Security, Agent Compatibility and CI Trust

**Status:** Done
**Milestone:** M5
**Accountable:** Security engineer
**Contributors:** Engineering lead, QA automation engineer, developer experience engineer, release engineer, technical writer

## Objective

Make security boundaries and compatibility claims precise, test the guarantees QA FlowKit actually provides and avoid
implying enforcement that depends on the host agent.

## TASK-073 - Publish the threat model

**Owner:** Security engineer
**Depends on:** Epic 17 contract inventory
**Status:** Done

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

Implementation evidence:

- Threat model published: `docs/qa-ai/threat-model.md` (assets, trust boundaries, control layers, abuse cases,
  threat-to-verification mapping, residual risks).
- Linked from `SECURITY.md`, `docs/qa-ai/architecture.md`, `docs/qa-ai/agent-harness-architecture.md`, `README.md`,
  `README.es.md` and `AGENTS.md`.
- Automated doc checks: `npm run test:threat-model`.
- Human review completed by maintainer on 2026-06-25.
- Validation passed: `npm run docs:check`, `npm run test:doc-consistency`, `npm run contracts:check`,
  `npm run test:threat-model`, `npm run format:check`, `npm run lint`, `node .github/scripts/verify-npm-pack.mjs` and
  `git diff --check`.

## TASK-074 - Expand adversarial and failure-path testing

**Owner:** QA automation engineer
**Depends on:** TASK-073
**Status:** Done

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

Implementation evidence:

- Added adversarial E2E runner: `.github/scripts/run-adversarial-failure-validation.mjs`.
- Added unit checks: `.github/scripts/test-adversarial-failure.mjs` (`npm run test:adversarial-failure`).
- Added npm script and CI validation path: `npm run test:e2e-adversarial`, matrix job `adversarial-failure` on
  Ubuntu/Windows × Node 20/22, included in `npm run validate:oss-extraction`.
- Covered repository path traversal, symlink/junction repository escapes, secret-like artifact redaction, malformed workflow
  contracts, corrupt active-run state and unsafe clean manifest entries.
- Hardened path resolution for existing symlink/junction targets in `.qa-ai/scripts/lib/utils.mjs`.
- Hardened secret diagnostics so scanner excerpts and validation output redact matched values.
- Added harness regression coverage for symlink/junction escapes and redaction behavior.
- Added troubleshooting for recoverable corrupt active state and rejected linked paths.
- Validation passed: `npm run test:e2e-adversarial`, `node .qa-ai/scripts/test-harness.mjs` and
  `node .qa-ai/scripts/test-validators.mjs`.

## TASK-075 - Define and verify adapter support levels

**Owner:** Developer experience engineer
**Depends on:** Epic 15 examples, Epic 17 contract freeze
**Status:** Done

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

Implementation evidence:

- Added adapter support manifest: `docs/qa-ai/adapter-support.v1.json`.
- Added adapter support verification: `.github/scripts/verify-adapter-support.mjs`.
- Added npm script and CI validation path: `npm run test:adapter-support`, included in `npm run validate:oss-extraction`.
- Documented support levels and current adapter inventory in `docs/qa-ai/agent-compatibility.md`.
- Current support labels are conservative: `generic`, `claude` and `opencode` are `cli-smoke-verified`; `codex`,
  `cline`, `continue`, `aider`, `goose` and `gemini` are `template-verified`; no adapter is advertised as
  `host-e2e-verified` without fresh current-release host evidence.
- Verification checks adapter template inventory, support levels, dates, version range, evidence paths and shared
  `command-interaction.md` guidance.
- CI job `adapter-support` runs `npm run test:adapter-support`.
- Validation passed: `npm run test:adapter-support`.

## TASK-076 - Harden CI observability and required checks

**Owner:** Release engineer
**Depends on:** TASK-074, TASK-075
**Status:** Done

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

Implementation evidence:

- Added required check manifest: `docs/qa-ai/required-checks.v1.json`.
- Added required check verification: `.github/scripts/verify-required-checks.mjs`.
- Added npm script and CI validation path: `npm run test:required-checks`, included in `npm run validate:oss-extraction`.
- Added CI jobs `adapter-support` (E2E-07 inventory) and `adversarial-failure` (E2E-08 matrix).
- Added CI documentation and triage guide: `docs/qa-ai/ci-observability.md`.
- Added workflow-level concurrency and job timeouts to `.github/workflows/ci.yml`; added a CodeQL timeout in
  `.github/workflows/codeql.yml`.
- Documented branch protection contexts: `Validate starter`, `Coverage` and `Analyze JavaScript`.
- Updated contributor/release guidance to keep workflow changes synchronized with the required-check manifest.
- Validation passed: `npm run test:required-checks`.

## TASK-077 - Complete pre-RC security and dependency review

**Owner:** Security engineer
**Depends on:** TASK-073 through TASK-076
**Status:** Done

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

Implementation evidence:

- Added security readiness summary: `docs/qa-ai/security-readiness.md`.
- Updated threat model to point at the pre-RC security/dependency review and remaining human-maintainer checks.
- Reviewed runtime/dev dependency posture: no production dependencies; dev-only toolchain recorded.
- Confirmed Dependabot configuration: GitHub alerts, security updates, malware alerts and grouped security updates
  enabled; weekly version updates for npm (root and `examples/playwright-full`) and GitHub Actions in
  `.github/dependabot.yml` with two-day cooldown aligned to `.npmrc` release-age policy.
- Confirmed audit threshold and CodeQL workflow/config documentation.
- Recorded accepted residual risks with owner and review date.
- Validation passed: `npm audit --audit-level=low`, `npm ls --depth=0`, `npm run test:required-checks`,
  `npm run test:adapter-support` and `node .github/scripts/verify-npm-pack.mjs`.

Pre-RC maintainer checks still required outside local repository files:

- Confirm GitHub Security has no untriaged high or critical alerts.
- Confirm branch protection requires `Validate starter`, `Coverage` and `Analyze JavaScript`.
- Confirm npm Trusted Publishing for `release-please.yml`, or explicitly retain `NPM_TOKEN` fallback temporarily.

## Epic exit criteria

- M5 gate passes.
- E2E-07 and E2E-08 pass at their declared automation level.
- Security and compatibility documentation match tested reality.

Epic closure evidence (2026-06-25):

| Task     | Key deliverable                                                          | Verification                                                 |
| -------- | ------------------------------------------------------------------------ | ------------------------------------------------------------ |
| TASK-073 | `docs/qa-ai/threat-model.md` + control layers + threat-to-test mapping   | `npm run test:threat-model`                                  |
| TASK-074 | `.github/scripts/run-adversarial-failure-validation.mjs` (E2E-08)        | `npm run test:e2e-adversarial`, CI job `adversarial-failure` |
| TASK-075 | `docs/qa-ai/adapter-support.v1.json` + support matrix                    | `npm run test:adapter-support`, CI job `adapter-support`     |
| TASK-076 | `docs/qa-ai/required-checks.v1.json` + `ci-observability.md`             | `npm run test:required-checks`                               |
| TASK-077 | `docs/qa-ai/security-readiness.md` + release checklist security sign-off | `npm audit --audit-level=low`, human pre-RC checklist        |

Full local gate before RC:

```bash
npm ci
npm run lint
npm run format:check
npm run validate:oss-extraction
node .github/scripts/verify-npm-pack.mjs
npm run test:threat-model
npm run test:e2e-adversarial
npm run test:adapter-support
npm run test:required-checks
```
