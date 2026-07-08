# Execution Workflow

Run after automation implementation when `execution.mode` is `advisory` or `strict`. Skipped on quick track.

## Prerequisites

- `.qa-ai/output/traceability-matrix.md` exists.
- `qa-ai.config.yaml` has `execution.commands` configured.
- Automation test files exist in configured paths.

## Steps

### Planning

1. Read `AGENTS.md`, `qa-ai.config.yaml` and `.qa-ai/agents/execution-agent.md`.
2. Load the traceability matrix and test impact analysis when available.
3. Map configured commands to test IDs from traceability.
4. Write `.qa-ai/output/execution-plan.md` with the plan table.
5. Run `node .qa-ai/scripts/validate-execution-plan.mjs`.

### Execution

6. For each command in the plan:
   - Run the command using `npx qa-flowkit execute` (or the framework CLI).
   - Capture exit code, duration and result files.
   - Never execute commands not in the configuration.
7. Write `.qa-ai/output/execution-summary.md` with the summary table.
8. Write `.qa-ai/output/execution-results-index.md` when result files are produced.
9. Run `node .qa-ai/scripts/validate-execution-summary.mjs`.
10. If failures are detected, proceed to result analysis.

## Safety

- Commands execute with `shell: false` (no shell interpolation).
- Only commands from `execution.commands` configuration are allowed.
- Working directory is the repository root.
- Timeout is enforced per command from config.
- Never print API keys, tokens or passwords.
- Dry-run mode (`npx qa-flowkit execute --dry-run`) produces the plan without executing anything.
