# Release Quality Gate

Formal go/no-go record inspired by BMAD Test Architect (TEA) `*trace` gate decisions: `PASS`, `CONCERNS`, `FAIL`, `WAIVED`.

## When to use

- Regulated or audit-sensitive releases on an initialized **standard** workflow
- When the team needs a single YAML artifact with evidence paths and residual risk

Enable governance first (not part of init templates):

```text
/qa-enable-enterprise
```

That sets `project.qaTrack: enterprise` in `qa-ai.config.yaml`. Quick and standard tracks without this setting do not
require a release gate file.

## Commands

```bash
node .qa-ai/scripts/validate-release-gate.mjs
npm run qa:validate-release-gate
```

Agent commands (after adapter sync):

```text
/qa-enable-enterprise   # enable governance on standard (once per repository)
/qa-gate                # record the go/no-go decision
```

Enterprise target validation includes the release gate:

```bash
node .qa-ai/scripts/validate-target.mjs
```

Use `--skip-release-gate` or `--allow-missing` only for incomplete repositories.

## Artifact

Default path: `qa-ai-output/release-gate.yaml`

Template: `.qa-ai/templates/release-gate.template.yaml`

| Field                | Purpose                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------- |
| `decision`           | `PASS`, `CONCERNS`, `FAIL`, `WAIVED`, or draft `PENDING`                                |
| `approver`           | Required for `WAIVED`                                                                   |
| `coverage_summary`   | Human-readable validation and coverage summary                                          |
| `open_risks`         | List of risks; required for `CONCERNS` and `FAIL`                                       |
| `evidence_paths`     | Repository-relative paths that exist on disk                                            |
| `evidence.execution` | Optional list of repository-relative JUnit XML or Cucumber JSON execution result files. |
| `evidence.evals`     | Optional list of repository-relative AI eval JSON evidence files.                       |
| `waived_reason`      | Required for `WAIVED`                                                                   |

## Evidence Validation

When `execution.resultsPaths` is configured in `qa-ai.config.yaml` and the repository is set to `project.qaTrack: enterprise`:

1. The release gate validator automatically runs execution evidence checks when the `decision` is `PASS`.
2. Every automated test case listed in the traceability matrix must have a corresponding passed run inside the results files.
3. Tests marked as quarantined (e.g. `quarantined: true` in the mapping file) are excluded from failure status and only log warnings with their quarantine reason and reviewed date.
4. If any non-quarantined automated test fails, or if any automated test is missing results (unless `--allow-missing` is passed), the release gate validation fails.

When `aiTesting.enabled: true` and the traceability matrix contains AI-marked RFs:

1. Enterprise `PASS` also runs AI eval evidence checks. `WAIVED` keeps the existing human-approval behavior.
2. Each AI RF must have at least one linked eval case, either through `rfId` or by including the RF ID in the case name.
3. All linked eval cases must pass.
4. Statistical AI scenarios that declare `P% of N runs` require linked eval cases with numeric `score` and `threshold`, and the score must meet or exceed the threshold.

Example config:

```yaml
execution:
  resultsPaths:
    - reports/junit/*.xml
  evalResultsPaths:
    - reports/evals/*.json
```

Example gate evidence:

```yaml
evidence:
  execution:
    - reports/junit/results.xml
  evals:
    - reports/evals/promptfoo-results.json
```

## Workflow

1. Complete the QA workflow through PR summary.
2. Run `validate-target.mjs`.
3. Load `.qa-ai/agents/release-gate-agent.md` or `/qa-gate`.
4. Update the gate file and validate.
5. Run `/qa-help` to confirm completion.

## See also

- [QA help and tracks](qa-help.md)
- [Workflow](workflow.md)
