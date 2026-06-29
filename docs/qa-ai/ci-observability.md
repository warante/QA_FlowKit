# CI Observability

QA FlowKit keeps CI check names, owners, timeouts and branch-protection expectations in
[`required-checks.v1.json`](required-checks.v1.json). The manifest is verified by `npm run test:required-checks` and is
included in `npm run validate:oss-extraction` (full suite = `validate:core` + `validate:e2e`).

## Validate suites

| npm script                        | When to use                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------ |
| `npm run validate:core`           | CI `Validate starter` / matrix `Validate` after scenario E2E jobs pass         |
| `npm run validate:e2e`            | Local or release rehearsal of scenario E2E scripts (also run as named CI jobs) |
| `npm run validate:oss-extraction` | Full maintainer gate before release (`core` + `e2e`)                           |
| `npm run validate:timing`         | Benchmark `core` vs `e2e` durations locally                                    |

Command lists live in [`.github/scripts/lib/validate-suite-commands.mjs`](../../.github/scripts/lib/validate-suite-commands.mjs).

### Timing baseline (2026-06-29)

Measured against GitHub Actions run `28377918309` (pre-split `main`) and local Windows Node 22:

| Target                                            | Before (`validate:oss-extraction`) | After (`validate:core`)                         |
| ------------------------------------------------- | ---------------------------------- | ----------------------------------------------- |
| CI `Validate starter` (ubuntu, run `28377918309`) | 118s wall                          | core only; scenario E2E jobs are `needs:`       |
| CI `Validate` matrix (windows, Node 22)           | 832s wall                          | core only on the same OS/Node matrix            |
| Local Windows (`npm run validate:timing`)         | core+e2e ≈ 4m 18s                  | core 2m 10s · e2e 2m 8s (37+38 steps)           |
| Estimated PR savings (4 validate jobs)            | four embedded full suites          | ~8m 33s less duplicated E2E per PR (local est.) |

Per PR, the split removes **four** embedded E2E re-executions (`Validate starter` + three matrix `Validate` jobs) that duplicated scenario jobs already listed in `needs:`.

Reproduce locally:

```bash
npm run validate:timing
```

## Branch Protection

Require these GitHub check contexts before merging release-bound branches:

| Check context        | Owner                  | Why it gates release-bound branches                                        |
| -------------------- | ---------------------- | -------------------------------------------------------------------------- |
| `Validate starter`   | release engineer       | Canonical package, docs, contracts and smoke gate after scenario E2E jobs. |
| `Coverage`           | QA automation engineer | Validator and harness coverage cannot silently regress.                    |
| `Analyze JavaScript` | security engineer      | CodeQL must remain green before release-bound changes land.                |

Matrix and scenario jobs remain separately named for diagnostics, but branch protection should use the stable aggregate
contexts above unless repository rules require stricter per-scenario protection.

## Required Check Inventory

| Workflow     | Job                           | Check name                                                              | Owner                         | Timeout | Required |
| ------------ | ----------------------------- | ----------------------------------------------------------------------- | ----------------------------- | ------- | -------- |
| `ci.yml`     | `npm-pack`                    | `npm pack allowlist`                                                    | release engineer              | 10m     | no       |
| `ci.yml`     | `adapter-parity`              | `adapter template parity`                                               | developer experience engineer | 10m     | no       |
| `ci.yml`     | `adapter-support`             | `adapter support inventory`                                             | developer experience engineer | 10m     | no       |
| `ci.yml`     | `claude-plugin`               | `Claude plugin`                                                         | developer experience engineer | 10m     | no       |
| `ci.yml`     | `golden-target`               | `golden target validate-target`                                         | QA automation engineer        | 15m     | no       |
| `ci.yml`     | `karate-target`               | `karate target validate-target`                                         | QA automation engineer        | 15m     | no       |
| `ci.yml`     | `karate-example`              | `Karate example (${{ matrix.os }})`                                     | QA automation engineer        | 20m     | no       |
| `ci.yml`     | `playwright-example`          | `Playwright example (${{ matrix.os }})`                                 | QA automation engineer        | 20m     | no       |
| `ci.yml`     | `mobile-example`              | `Maestro + Karate mobile example (${{ matrix.os }})`                    | QA automation engineer        | 20m     | no       |
| `ci.yml`     | `quick-path`                  | `Quick path (${{ matrix.os }}, Node ${{ matrix.node }})`                | QA automation engineer        | 10m     | no       |
| `ci.yml`     | `manual-example`              | `Manual example (${{ matrix.os }}, Node ${{ matrix.node }})`            | QA automation engineer        | 10m     | no       |
| `ci.yml`     | `update-migration`            | `Update migration (${{ matrix.os }}, Node ${{ matrix.node }})`          | release engineer              | 15m     | no       |
| `ci.yml`     | `clean-install`               | `Clean install (${{ matrix.os }}, Node ${{ matrix.node }})`             | release engineer              | 15m     | no       |
| `ci.yml`     | `adversarial-failure`         | `Adversarial failure paths (${{ matrix.os }}, Node ${{ matrix.node }})` | QA automation engineer        | 15m     | no       |
| `ci.yml`     | `release-dry-run`             | `Release dry-run (E2E-09)`                                              | release engineer              | 15m     | no       |
| `ci.yml`     | `stable-config-rehearsal`     | `Stable config rehearsal (TASK-083)`                                    | release engineer              | 15m     | no       |
| `ci.yml`     | `stable-release-pr-rehearsal` | `Stable Release PR rehearsal (TASK-084)`                                | release engineer              | 15m     | no       |
| `ci.yml`     | `validate-starter`            | `Validate starter`                                                      | release engineer              | 20m     | yes      |
| `ci.yml`     | `coverage`                    | `Coverage`                                                              | QA automation engineer        | 15m     | yes      |
| `ci.yml`     | `validate`                    | `Validate (${{ matrix.os }}, Node ${{ matrix.node }})`                  | release engineer              | 20m     | no       |
| `codeql.yml` | `analyze`                     | `Analyze JavaScript`                                                    | security engineer             | 15m     | yes      |

## Scheduled Checks

Workflow: `rc-post-publish.yml`

Job: `validate-rc`

Check name:

```text
RC post-publish (${{ inputs.version }})
```

Owner: release engineer

Timeout: 20m

Workflow: `stable-post-publish.yml`

Job: `validate-stable`

Check name:

```text
Stable post-publish (${{ inputs.version }})
```

Owner: release engineer

Timeout: 20m

Workflow: `example-compatibility.yml`

Job: `validate-examples`

Check name:

```text
Examples (${{ matrix.os }}, Node ${{ matrix.node }}, ${{ inputs.channel || 'rc' }})
```

Owner: release engineer

Timeout: 15m

Artifact:

```text
example-compatibility-${{ matrix.os }}-node-${{ matrix.node }}-${{ inputs.channel || 'rc' }}
```

## Failure Triage

Use the first failing named step or job as the routing signal:

- `npm pack allowlist`: inspect tarball contents and update `.github/scripts/verify-npm-pack.mjs` only when the package
  contract intentionally changes.
- `adapter template parity`: edit `.qa-ai/adapters/*`, then regenerate root adapter copies.
- `Claude plugin`: run `node .github/scripts/build-claude-plugin.mjs --check` locally and inspect generated plugin drift.
- `golden target validate-target` or `karate target validate-target`: inspect target fixture validation output.
- Example jobs: compare OS/runtime output first; the packed package install path is part of the scenario.
- `Validate starter`: route by failing step name: docs, contracts, adapter support, validators, harness, hooks or smoke (`validate:core` only; E2E already ran in prerequisite jobs).
- `Product demo (TASK-057)`: run `npm run test:product-demo`; replay with `npm run test:e2e-quick` if fixture drift is suspected.
- `Coverage`: add focused tests for the changed validator/harness path or intentionally update the coverage policy.
- `Analyze JavaScript`: inspect the CodeQL alert or action failure in GitHub Security.
- Scheduled example compatibility: download `compatibility-report.json` from the artifact and compare channel, OS and Node.
- `RC post-publish`: inspect dist-tag `rc`, clean install smoke and oldest-supported-beta update path in `run-rc-post-publish-validation.mjs`.
- `Stable config rehearsal (TASK-083)`: inspect prepared stable policy, `latest` dist-tag mapping and pack smoke in `run-stable-config-rehearsal.mjs`.
- `Stable Release PR rehearsal (TASK-084)`: inspect release PR review paths, notes template links and publish workflow in `run-stable-release-pr-rehearsal.mjs`.
- `Stable post-publish`: inspect dist-tag `latest`, pack allowlist, clean install and beta update in `run-stable-post-publish-validation.mjs`.
- `Stable announcement (TASK-086)`: run `npm run test:stable-announcement`; after publish flip README per `stable-public-entrypoints.v1.json`.

Do not add retries unless the failure depends on a proven external service flake. Local deterministic checks should fail
fast and keep the original logs.
