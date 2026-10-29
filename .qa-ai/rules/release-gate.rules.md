# Release Gate Rules

**Enforced by:** validate-release-gate.mjs

Apply on the `enterprise` QA track before release or merge when `release.gatePath` is configured.

## When required

- `project.qaTrack` is `enterprise`.
- Artifact path defaults to `.qa-ai/output/release-gate.yaml` unless config overrides it.

## Decisions

- Allowed gate results: `PASS`, `CONCERNS`, `FAIL`, `WAIVED`.
- Document rationale and evidence for every non-`PASS` decision.
- `WAIVED` requires explicit user approval and a stated reason.

## Evidence

- List only **existing repository paths** in `evidence_paths`; do not invent files.
- Review at minimum: `.qa-ai/output/pr-summary.md`, `.qa-ai/output/traceability-matrix.md`, sync plan when present, and recent validator output the user provides.
- When `execution.provenance.mode` is `strict`, require a passing `execute --record-evidence` record for the current
  commit, clean source tree, configured environment and unmodified result files within the configured age limit.
  `--allow-missing` does not waive this policy. A provenance record is local evidence, not a signed attestation.

## Constraints

- Do not override a `FAIL` with `PASS` without user approval.
- Do not perform external deployments or production changes as part of the gate.
- Read [approval.rules.md](approval.rules.md) before updating the gate file.

## Validation

```bash
node .qa-ai/scripts/validate-release-gate.mjs
```
