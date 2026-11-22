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

### Maintenance investigation by test and capability

TASK-P5-001 adds an `investigation` section to the existing JSON report, using the same command and options.
It joins exact canonical test IDs from capability navigation to supplied run summaries and current file-history rows.
Capability entries list their test IDs and distinct file paths; each test entry contains its locations,
`fileHistory`, `observation`, diagnostic `signals` and `classification: requires-review`.

The join is deliberately conservative:

- A duplicate ID, even in the same file, has `identity: ambiguous` and no attached `observation`.
  Its supplied execution ID remains in `ambiguousObservationIds`; resolve the identity before interpreting results.
- Scenarios without IDs remain in `missingTestIds`; orphan run IDs remain in `unmatchedObservationIds`.
  No fuzzy matching, renaming or deduplication is performed.
- `fileHistory.state` distinguishes `not-requested`, `unavailable`, `not-collected` and `observed`.
  Unknown counts stay `null`, not zero. Shallow and truncated histories retain explicit flags.
- Shared file counts are context, not per-scenario work. They are never summed into capability totals:
  two scenarios in the same file can share the same four change commits without representing eight changes.
- An absent results file differs from supplied results without a matching test.
  Mixed outcomes at one supplied revision remain an investigation signal, not confirmed flakiness.

For example, a renamed feature containing `TC-001` can retain two observed Git commits and a supplied run duration
in the same test row, while its current path stays intact. This does not establish that either commit repaired
the test, that its duration changed because of the rename, or that maintenance cost decreased.

Every investigation keeps `causesInferred: false` and `automaticActions: false`. Product evolution, fragile test code,
environment and data changes are possible causes to check against separate evidence, not classifications derived
from commit counts or pass/fail patterns. There is no test deletion, quarantine, people ranking or half-life estimate.
The output contains existing capability labels, paths and IDs; review/redact it before sharing.

Limits: regular input files below 2 MiB; at most 1000 features, 5000 directories and depth 50; at most 100 maintenance
files and 100 commits per file (truncation is explicit); Git calls have a five-second timeout; at most 10000 supplied
execution records. Unsafe paths, external links and malformed inputs fail with a redacted error.
Feature-tree linked entries are refused. Missing/shallow history and unmatched execution IDs stay explicit.
The index itself contains source titles and paths: review/redact it before sharing.

## Final acceptance

Use bilingual fixtures and deterministic regressions during implementation. After the implementation batch,
perform the independent semantic review and real pilots using approved consent/privacy rules.
Development fixture results do not replace those acceptance activities or the existing stable-release gates.

### Supplied comparative review evidence

TASK-P3-007 also has a standalone, optional read-only tool:

```bash
node .qa-ai/scripts/review-test-strategy.mjs --plan review-plan.json --json
node .qa-ai/scripts/review-test-strategy.mjs --plan review-plan.json --reviews review-records.json --json
```

This tool takes explicit local paths, not project configuration; it does not read a legacy root config.
It is not a new `qa-flowkit` subcommand, workflow phase or release gate. Templates live in
`.qa-ai/templates/strategy-review-plan.template.json` and `strategy-review-records.template.json`.
They must be filled manually and copied only to an approved local location. No files are written by the tool.

The plan names pseudonymous implementation-contributor IDs and up to 100 cases. Each case links one RF,
Criterion IDs and distinct baseline/candidate repository-relative text paths.
The first command hashes the plan and current artifacts and returns `pending-review` with no invented opinions.

Review records bind to `planSha256`. Each record requires:

- `caseId`, pseudonymous `reviewerId`, explicit boolean `independentFromImplementation`, and `reviewedAt` in ISO format
  with timezone (for example `2026-11-22T17:00:00+01:00`, hora peninsular española);
- `baselineSha256` and `candidateSha256` from the current packet;
- `dimensions` with exactly `ambiguity`, `oracleCorrectness`, `duplication`, `reviewRework`, `retainedValue`;
  each dimension has a `judgment` (`improved`, `equivalent`, `regressed`, `uncertain`) and nonempty `rationale`;
- `decision` (`retain`, `revise`, `defer`), its `rationale`, and at least one `evidence` entry with `path` and `sha256`
  for a separate existing review-notes file.

Compute a notes-file hash without changing it:

```bash
node --input-type=module -e "import fs from 'node:fs';import {createHash} from 'node:crypto';console.log(createHash('sha256').update(fs.readFileSync('review-notes.md')).digest('hex'))"
```

Use the same algorithm for raw bytes; formatting or line-ending changes invalidate previous hashes.
One record per reviewer/case is allowed; contributor/reviewer IDs are compared case-insensitively for independence
and duplicate detection. Unknown case IDs, extra fields and incomplete records are input errors.
Do not use names, email addresses, credentials or personal data. Human reviewers supply the judgments;
the tool does not generate them, verify identities or establish whether a rationale is true.

Changed plans, compared artifacts or notes produce `incomplete-evidence`. Copies of compared inputs cannot substitute
for separate review notes. Self-review or a missing independence attestation does not satisfy independent review.
Disagreeing eligible reviewers produce `conflicting-reviews` instead of an averaged score. `regressed` cannot be paired
with `retain`; `uncertain` remains `deferred`. Revisions and missing cases remain visible.

`recorded-retain` means supplied records are consistent, not that the software is accepted. Every report states
`acceptanceGranted: false`, `signaturesVerified: false` and `userProductivity: not-measured`.
Hashes are not signatures or trusted timestamps; reviewer independence is a supplied attestation requiring verification.
Reports contain pseudonymous reviewer IDs, relative paths, hashes and decisions, not source text or rationale bodies.
Keep the records and notes for human review rather than replacing them with the summary.

Limits: 500 supplied records; 20 notes references per record; 2000 characters per rationale; 2 MiB per input and
16 MiB total bytes read. Only `.md`, `.txt`, `.feature` and `.json` inputs inside the repository are supported;
`.git`, `node_modules`, `references`, environment-file paths and external links are refused. Sensitive-content
matches also refuse the input. Malformed/unsafe input exits nonzero with a redacted diagnostic; incomplete or conflicting
review evidence is reported as data and never grants approval.
