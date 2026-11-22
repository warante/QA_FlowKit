# Outcome-first test strategy

These additive, agent-guided techniques enrich existing artifacts. They do not add a workflow phase,
mandatory output, Gherkin type or semantic release gate. Existing projects remain valid without the optional sections.

## Clarify before generating

In normalized requirements, optionally use:

| Criterion ID | Example  | Counter-example | Question                    | Decision owner | Decision | Status |
| ------------ | -------- | --------------- | --------------------------- | -------------- | -------- | ------ |
| CR-RF-101-01 | 11 items | 10 items        | What happens at exactly 10? | Product owner  | pending  | open   |

Keep the corresponding canonical criterion `pending-decision`. Discussion prompts are not new source requirements.
Use `resolved` only after recording the approved decision and its source. Do not invent an owner, answer or approval.

English example: "What happens after a repeated request?" is open-ended; "Should it be rejected?" presupposes an outcome.
Spanish example: "¿Qué ocurre al repetir la solicitud?" no presupone una respuesta; "¿Debe rechazarse?" sí la sugiere.

## Start from an observable result

Use optional `## Outcome checks` in the existing proposal (template included). Establish the observable outcome,
authoritative observation source and oracle first; then the smallest action and context needed to exercise it.
Review both input and output partitions. A valid input domain can still produce several distinct rejection states.

Example: contrast an order that qualifies for free delivery with one that does not, instead of checking many
equivalent eligible orders. Do not copy a mathematical rule as the only "concrete" example.

For asynchronous prohibited effects, set `Asynchronous: yes` and `Prohibited effect: yes`, then document alternative
behavior, correlation, approved observation window and authoritative terminal state.
A UI error is not sufficient evidence that an independent payment worker never charged the account.
No bounded observation proves all possible future absence; state the actual contract and remaining uncertainty.

Ejemplo: una solicitud rechazada muestra un motivo y termina en estado de rechazo en el registro autoritativo,
identificada por su ID de correlación. Ver solo el mensaje de error no demuestra que no haya cobros en segundo plano.

## Redesign manual journeys for automation

Use optional `## Automation redesign` in the existing feasibility report:

| Test ID | Criterion IDs | Purpose                  | Redesign                                     | Execution layer                   | Oracle                  | Data isolation         | Synchronization                                | Retained manual exploration  | Blocker                        |
| ------- | ------------- | ------------------------ | -------------------------------------------- | --------------------------------- | ----------------------- | ---------------------- | ---------------------------------------------- | ---------------------------- | ------------------------------ |
| TC-001  | CR-RF-101-01  | Reject duplicate request | Split decision, notification and UI feedback | API for decision; UI for feedback | Approved terminal state | Unique request per run | Wait on correlated state with approved timeout | Clarity of recovery guidance | Missing sandbox until provided |

This remains a proposal, not permission to change tests. Keep unsupported framework hooks as blockers.
Use service/API checks when appropriate, but do not move UI-specific behavior out of UI testing.
Retain human exploration and subjective assessment instead of automating them mechanically.

Ejemplo: separar la regla de duplicidad, la notificación y el mensaje visual; mantener la exploración de usabilidad.
No convertir el recorrido manual completo en una secuencia frágil de clics.

## Keep benefit separate from implementation

Use optional `## Benefit evaluation` in system design with user segment, behavior change, baseline, target,
observation method, control, approval and status. Unknown measurements stay `unknown`.
Targets are proposals until `Approval: approved`; `Status: measured` needs real evidence.
Do not interpret passing fixture checks as user productivity. Reuse the project's approved pilot protocol.

QUPER-style utility/differentiation/saturation ranges can guide discussion. They are not executable assertions:
an approved performance test still needs an operation, metric, threshold, load, environment and observation window.

## Cross-capability risks and current behavior

Use optional ACC `## Capability coverage` rows inside system design to connect capabilities, components,
quality attributes, RFs, existing risk/evidence references and trust assumptions. Do not duplicate the underlying
risk register or traceability matrix. Prefer focused capability charters for recovery across multiple features.

Example: request recovery spans submission, queue processing, status views and notifications; a separate happy-path
test for each screen may miss an inconsistent final state.

The derived capability index groups exact normalized Feature titles. It preserves every file, scenario, ID and RF,
including conflicts and duplicates. It is not semantic deduplication. Review create/reuse/update candidates manually;
do not rename files, delete history or replace canonical RF/CA/TC mappings.

## Read-only analysis

Run in an initialized target repository:

```bash
node .qa-ai/scripts/analyze-test-strategy.mjs --json
node .qa-ai/scripts/analyze-test-strategy.mjs --maintenance --results observations.json --json
```

This is a packaged standalone script, not a new `qa-flowkit` CLI subcommand. It reads only local inputs and writes
to stdout/stderr; it does not execute tests, fetch Git history, modify files, quarantine tests or send telemetry.
Missing sections remain compatible; populated optional rows receive advisory structural findings.
It does not assess whether the business interpretation, approval claim or oracle is actually true.
Run the usual validators separately; zero advisories is not a release PASS.

`--results` accepts a repository-relative JSON array, for example:

```json
[
  { "testId": "TC-001", "runId": "run-1", "status": "passed", "durationMs": 150, "sourceRevision": "abcdef1234567" },
  { "testId": "TC-001", "runId": "run-2", "status": "failed", "durationMs": 200, "sourceRevision": "abcdef1234567" }
]
```

Allowed statuses are `passed`, `failed`, `skipped`. `durationMs` and hexadecimal `sourceRevision` are optional.
Each test/run pair must be unique. Mixed outcomes at the same supplied revision are an investigation signal,
not confirmed flakiness: data, configuration, environment and other runtime context may differ.
Records without revisions cannot establish same-revision instability.

Maintenance reads the current repository's local Git history, following file renames. `changeCommits` counts commits
including initial creation, not developer effort, elapsed half-life or blame. Correlate it with product changes and
run evidence before classifying a cause. Author names, emails and commit messages are not collected.

Limits: regular input files below 2 MiB; at most 1000 features, 5000 directories and depth 50; at most 100 maintenance
files and 100 commits per file (truncation is explicit); Git calls have a five-second timeout; at most 10000 supplied
execution records. Unsafe paths, external links and malformed inputs fail with a redacted error.
Feature-tree linked entries are refused. Missing/shallow history and unmatched execution IDs stay explicit.
The index itself contains source titles and paths: review/redact it before sharing.

## Final acceptance

Use bilingual fixtures and deterministic regressions during implementation. After the implementation batch,
perform the independent semantic review and real pilots using approved consent/privacy rules.
Development fixture results do not replace those acceptance activities or the existing stable-release gates.
