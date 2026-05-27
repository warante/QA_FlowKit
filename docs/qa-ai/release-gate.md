# Release Quality Gate

Formal go/no-go record inspired by BMAD Test Architect (TEA) `*trace` gate decisions: `PASS`, `CONCERNS`, `FAIL`, `WAIVED`.

## When to use

- `project.qaTrack: enterprise` in `qa-ai.config.yaml`
- Regulated or audit-sensitive releases
- When the team needs a single YAML artifact with evidence paths and residual risk

Quick and standard tracks do not require a release gate file.

## Commands

```bash
node .qa-ai/scripts/validate-release-gate.mjs
npm run qa:validate-release-gate
```

Agent command (after adapter sync):

```text
/qa-gate
```

Enterprise target validation includes the release gate:

```bash
node .qa-ai/scripts/validate-target.mjs
```

Use `--skip-release-gate` or `--allow-missing` only for incomplete repositories.

## Artifact

Default path: `qa-ai-output/release-gate.yaml`

Template: `.qa-ai/templates/release-gate.template.yaml`

| Field | Purpose |
|---|---|
| `decision` | `PASS`, `CONCERNS`, `FAIL`, `WAIVED`, or draft `PENDING` |
| `approver` | Required for `WAIVED` |
| `coverage_summary` | Human-readable validation and coverage summary |
| `open_risks` | List of risks; required for `CONCERNS` and `FAIL` |
| `evidence_paths` | Repository-relative paths that exist on disk |
| `waived_reason` | Required for `WAIVED` |

## Workflow

1. Complete the QA workflow through PR summary.
2. Run `validate-target.mjs`.
3. Load `.qa-ai/agents/release-gate-agent.md` or `/qa-gate`.
4. Update the gate file and validate.
5. Run `/qa-help` to confirm completion.

## See also

- [QA help and tracks](qa-help.md)
- [Workflow](workflow.md)
