# Epic 14 - First-Use Experience and Product Demonstration

**Status:** In progress
**Milestone:** M2
**Accountable:** Developer experience engineer
**Contributors:** Product manager, technical writer, developer relations, UX researcher, QA automation engineer

## Objective

Make the product understandable in 30 seconds and runnable in five minutes without removing the detailed reference
material advanced users need.

## TASK-055 - Redesign the README information architecture

**Owner:** Technical writer
**Depends on:** Epic 13

**Status:** In validation

Subtasks:

- Put problem, audience, outcome and limitations in the first screenful.
- Show the workflow with one concise diagram.
- Add a minimal install and first successful validation path.
- Explain quick, standard and enterprise tracks with selection guidance.
- Move command encyclopaedia, adapter details and maintenance instructions into linked docs.
- Keep English and Spanish structures aligned.

Validation:

- Target approximately 150-250 lines per root README unless usability testing justifies more.
- Run a 30-second comprehension test with at least three people unfamiliar with the project.
- Confirm all removed details remain reachable in documentation.

Documentation:

- Update both READMEs and the documentation index.
- Update internal links after moving sections.

Acceptance:

- At least 80% of evaluators can state what QA FlowKit does, who it is for and what it does not do after 30 seconds.

## TASK-056 - Build a deterministic five-minute quick path

**Owner:** Developer experience engineer
**Depends on:** TASK-055

**Status:** In validation

Subtasks:

- Define one small, public RF and expected generated artifacts.
- Provide exact commands for `init`, `run`, validation and result inspection.
- Ensure the path works without Jira, TestRail or external credentials.
- Include expected outputs and one intentional validator failure/fix.
- Provide PowerShell and POSIX command variants where syntax differs.

Tests:

- Automate the non-agent CLI portion as E2E-01.
- Add a fixture for the expected final target state.
- Measure clean execution time on supported environments.

CI:

- Run the deterministic path on Ubuntu and Windows with Node 20/22.

Documentation:

- Update `docs/qa-ai/getting-started.md` and terminal transcripts.
- Link the path prominently from both READMEs.

Acceptance:

- A new evaluator reaches a passing target validation in five minutes excluding package download time and agent response latency.

## TASK-057 - Produce a short public demo

**Owner:** Developer relations
**Depends on:** TASK-056

**Status:** In validation (static demo, script, transcript and verifier ready; recorded capture pending)

Subtasks:

- Script a demo covering requirement, generated artifacts, validator feedback, correction and PR summary.
- Record a two-minute-or-shorter terminal demo or animated capture.
- Publish the exact source fixture and commands used for the recording.
- Add alt text, captions/transcript and a static fallback.

Validation:

- Re-run the script from a clean clone before publication.
- Product manager verifies the demo does not imply external writes or model execution.
- Security review confirms no private data or credentials are visible.

Documentation:

- Embed or link the demo near the top of both READMEs.
- Add the transcript and reproduction instructions to `docs/qa-ai/`.

Acceptance:

- Demo output is reproducible from the documented commit/tag.

**Evidence (source repo):**

- Demo hub: `docs/qa-ai/demo.md`, `docs/qa-ai/demo.v1.json` (`status: static_ready`).
- Recording script: `docs/qa-ai/demo-script.md`.
- Transcript and captions: `docs/qa-ai/demo-transcript.md`.
- Fixtures and E2E: `test/fixtures/quick-path/`, `npm run test:e2e-quick`.
- Verification: `.github/scripts/verify-product-demo.mjs` → `npm run test:product-demo`.
- Unit tests: `.github/scripts/test-product-demo.mjs`.
- README embed table: `README.md`, `README.es.md`.
- Included in `npm run validate:oss-extraction`.
- **Pending human:** terminal recording, PM/security review, optional README video embed when `recordedMedia` is published.

## TASK-058 - Validate onboarding usability

**Owner:** UX researcher
**Depends on:** TASK-055 through TASK-057

**Status:** Planned

Subtasks:

- Define evaluator tasks and success criteria.
- Test with at least five participants representing manual QA, automation QA and engineering enablement.
- Record time to understanding, setup completion, help requests and abandonment points.
- Prioritize findings by severity and frequency.
- Resolve all onboarding P0/P1 findings before closing M2.

Documentation:

- Publish an anonymized usability findings summary.
- Convert accepted findings into issues/tasks with owners.

Acceptance:

- At least four of five evaluators complete the quick path without synchronous maintainer assistance.
- No unresolved P0/P1 onboarding issue remains.

## Epic exit criteria

- README, quick path and demo use the same RF and terminology.
- E2E-01 is green in CI.
- Usability evidence satisfies M2 requirements.

## Implementation evidence

- Concise product entry points: `README.md` and `README.es.md` (approximately 220 lines each).
- Detailed command material moved to `docs/qa-ai/cli-reference.md`.
- RF-101 source and expected artifacts: `test/fixtures/quick-path/`.
- E2E-01 runner: `.github/scripts/run-quick-path-validation.mjs`.
- CI matrix: Ubuntu and Windows on Node.js 20 and 22 in `.github/workflows/ci.yml`.
- Guided path and intentional failure: `docs/qa-ai/getting-started.md`.
- Reproducible static demo: `docs/qa-ai/demo.md`, `docs/qa-ai/demo-script.md`, `docs/qa-ai/demo-transcript.md`.
- Demo verification: `npm run test:product-demo`.
- Remaining validation: recorded terminal capture, external 30-second comprehension study and five-participant usability study.
