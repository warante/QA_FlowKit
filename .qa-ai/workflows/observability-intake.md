# Observability Intake Workflow

Run after the PR summary or release gate when `observability.enabled` is `true`. Optional phase, not blockable by track.

## Prerequisites

- `.qa-ai/qa-ai.config.yaml` has `observability.sourcePaths` and `observability.intakePath` configured.
- Local observability source files exist at configured paths (incident reports, log excerpts, metric exports).

## Steps

1. Read `AGENTS.md`, `.qa-ai/qa-ai.config.yaml` and `.qa-ai/agents/production-observability-intake-agent.md`.
2. Scan configured `observability.sourcePaths` for incident reports, logs and metrics.
3. Normalize each signal: extract date, area, severity and description.
4. Map signals to RF IDs and test IDs from the traceability matrix.
5. Identify coverage gaps: signals without corresponding tests.
6. Propose new test cases or risk adjustments based on production signals.
7. Write `.qa-ai/output/observability-intake.md` with signals and proposed actions.
8. Optionally write `.qa-ai/output/production-signal-analysis.md` with gap analysis.
9. Run `node .qa-ai/scripts/validate-observability-intake.mjs`.
10. Fix validation errors until the artifact passes.

## Safety

- Never connect to external monitoring services, APM tools or log aggregators.
- Never include PII, credentials or session identifiers in signal extracts.
- Only read files within configured source paths.
- Proposed changes to test cases or risk scores are suggestions only; do not modify artifacts directly.
