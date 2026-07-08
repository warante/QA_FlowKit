# Environment Readiness Workflow

Run after test data planning when `environments.enabled` is `true`. Skipped on quick track.

## Prerequisites

- `qa-ai.config.yaml` has `environments.*` configured.
- Required tools, services and browsers are identified.

## Steps

1. Read `AGENTS.md`, `qa-ai.config.yaml` and `.qa-ai/agents/environment-readiness-agent.md`.
2. Read configured `environments.target` and required lists.
3. Check availability of each required variable, service, browser and mobile host.
4. Record check results with status, evidence and blocking flag.
5. Document remediation steps for every `fail` check.
6. Write `.qa-ai/output/environment-readiness.md` with the checks table.
7. Optionally write `.qa-ai/output/environment-health.json` for machine-readable status.
8. Run `node .qa-ai/scripts/validate-environment-readiness.mjs`.
9. Fix validation errors or block the workflow in strict mode when required + blocking checks fail.

## Safety

- Check environment variables by name only; never print their values.
- Do not run destructive commands (`rm`, `format`, `drop`, `delete`).
- Do not install packages or modify system configuration without user approval.
- Evidence paths must stay within the repository.
