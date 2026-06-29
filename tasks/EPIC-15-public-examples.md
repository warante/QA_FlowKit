# Epic 15 - Public Reference Repositories

**Status:** In progress
**Milestone:** M2
**Accountable:** Developer relations
**Technical owner:** QA automation engineer
**Contributors:** CLI/framework engineer, technical writer, release engineer, security engineer

## Objective

Turn internal fixtures into realistic, reproducible examples that demonstrate the complete workflow and can be
used for evaluation, regression testing and adopter templates.

## TASK-059 - Publish the manual-only quick reference

**Owner:** QA automation engineer
**Depends on:** TASK-056

**Status:** In validation

Subtasks:

- Promote the golden-target concept into a public, human-readable repository or first-class example directory.
- Include requirement input, decisions, Gherkin, traceability, PR summary and validation evidence.
- Include clean setup and reset instructions.
- Avoid generated noise that obscures the workflow.

Tests and CI:

- Run strict target validation on every PR.
- Test clean installation using the packed package, not only source-relative scripts.
- Cover Ubuntu and Windows.

Documentation:

- Add a guided walkthrough and architecture notes.
- Link from README, getting started and examples index.

Acceptance:

- A clean clone passes without allow flags or private prerequisites.

## TASK-060 - Publish the Playwright UI + API standard reference

**Owner:** QA automation engineer
**Depends on:** TASK-059

**Status:** In validation

Subtasks:

- Create a small deterministic local application.
- Include UI and API test examples aligned with the generated feasibility and implementation plans.
- Use Playwright Test and its request context for both UI and API automation.
- Demonstrate a resumable standard harness run.
- Include test-management and Jira proposal artifacts without external writes.
- Keep application test execution local, deterministic and independent from external services.

Tests and CI:

- Implement E2E-02 on Ubuntu and Windows.
- Run UI headless, API tests, FlowKit validators and strict target validation.
- Verify failure screenshots/logs do not expose environment secrets.

Documentation:

- Add a complete workflow narrative from RF to PR.
- Document why the stack is representative rather than mandatory.

Acceptance:

- Clean clone, install, QA FlowKit validation and application tests all pass in CI.

## TASK-060M - Publish the Maestro + Karate mobile reference

**Owner:** QA automation engineer
**Depends on:** TASK-059

**Status:** In validation

Subtasks:

- Create a mobile-oriented repository using Maestro for app UI flows and Karate for API coverage.
- Include application ID configuration, reusable Maestro subflows and platform-neutral test data.
- Keep Karate API execution local and deterministic.
- Separate structural CI verification from emulator/device host execution.
- Include proposal-only test-management and issue artifacts without external writes.

Tests and CI:

- Implement E2E-03M structural validation on Ubuntu and Windows.
- Execute Karate API tests in CI.
- Validate Maestro flow syntax, paths, secret handling and traceability in ordinary CI.
- Provide a signed/manual host-E2E checklist for Android emulator and iOS simulator execution.

Documentation:

- Add setup instructions for Maestro CLI, Java, app binary, application ID and connected device.
- Publish the exact distinction between structurally verified and host-E2E verified support.

Acceptance:

- Clean clone, packed QA FlowKit install, strict target validation and Karate API tests pass in CI.
- Maestro flows pass structural validation; host execution evidence is recorded without overstating CI coverage.

## TASK-061 - Harden the Karate reference

**Owner:** QA automation engineer
**Depends on:** TASK-059

**Status:** In validation

Subtasks:

- Turn the existing Karate fixture into a documented reference path.
- Demonstrate the separation between design Gherkin and executable Karate features.
- Add deterministic API and UI or clearly scoped UI placeholder behavior.
- Remove ambiguity around required Karate runtime prerequisites.

Tests and CI:

- Implement E2E-03 on Ubuntu and Windows.
- Run both feature validators and the executable Karate suite.

Documentation:

- Update the Karate getting-started path, troubleshooting and examples index.

Acceptance:

- The reference validates both FlowKit design artifacts and executable Karate behavior.

## TASK-062 - Add example maintenance and compatibility policy

**Owner:** Release engineer
**Depends on:** TASK-059, TASK-060, TASK-060M and TASK-061

**Status:** In validation

Subtasks:

- Define which FlowKit versions each example tracks.
- Add scheduled update validation against `@rc` and later `latest`.
- Define dependency update ownership and failure triage.
- Add a compatibility badge/table based on actual CI results.

Documentation:

- Document example lifecycle, support status and contribution process.

Acceptance:

- Example drift produces a visible CI failure with a named owner and triage path.

## Epic exit criteria

- Manual, Playwright, Karate and mobile examples are reproducible at their declared support level.
- E2E-02, E2E-03 and E2E-03M are green.
- No example requires credentials or an external service.

## Implementation evidence

- Public example index: `examples/README.md`.
- Manual-only reference: `examples/manual-only/`.
- Packed-package runner: `.github/scripts/run-manual-example-validation.mjs`.
- Local command: `npm run test:e2e-manual-example`.
- Playwright UI/API reference and runner: `examples/playwright-full/` and
  `.github/scripts/run-playwright-example-validation.mjs`.
- E2E-02 runner starts, resumes and completes a `standard` harness run before executing Playwright UI/API tests.
- Karate reference and runner: `examples/karate-full/` and `.github/scripts/run-karate-example-validation.mjs`.
- Maestro + Karate reference and runner: `examples/maestro-karate-mobile/` and
  `.github/scripts/run-mobile-example-validation.mjs`.
- CI matrix: Ubuntu and Windows on Node.js 20 and 22 in `.github/workflows/ci.yml`.
- Maintenance and compatibility rules: `docs/qa-ai/example-repos.md`.
- Machine-readable compatibility inventory: `examples/compatibility.json`.
- Local/source compatibility command: `npm run test:example-compatibility`.
- Scheduled and manually dispatched npm-channel matrix: `.github/workflows/example-compatibility.yml`.
- Channel lifecycle and automation table: `examples/README.md`.
- Remaining validation: hosted CI evidence for the new runtime jobs, actual Maestro emulator/device-host evidence
  and the first scheduled `@rc` compatibility result.
