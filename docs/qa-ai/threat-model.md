# Threat Model

This document records the current QA FlowKit security boundary for the beta-to-`1.0.0` stabilization path. The initial
maintainer review for Epic 18 completed on 2026-06-25; remaining 1.0 work is tracked as adversarial testing, adapter
support labeling and pre-RC security sign-off.

## Scope

In scope:

- the npm CLI and copied `.qa-ai/` framework;
- generated target-repository configuration, adapters, state and QA artifacts;
- local validators, hooks, cleanup, update and harness commands;
- proposal-first external-tool artifacts for Jira, TestRail, Zephyr, Xray and similar systems;
- the source repository release, CI and npm packaging workflow.

Out of scope:

- model hosting, model selection and hidden model reasoning;
- a hostile or compromised agent host with unrestricted shell access;
- secrets managed by consumer repositories outside QA FlowKit;
- direct remote writes performed by host MCP tools or external CLIs after a user approves them;
- npmjs.com and GitHub repository administrative settings that require maintainer action.

## Assets

| Asset                             | Security goal                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| Source repository and npm package | Publish only reviewed framework contents with provenance and reproducible validation.          |
| Target repository files           | Keep generated writes inside the repo and avoid overwriting user-owned files without approval. |
| `qa-ai.config.yaml`               | Treat configured paths and custom validators as untrusted until validated.                     |
| `.qa-ai/state/`                   | Preserve run state, approval history and event logs without storing secrets or prompts.        |
| QA artifacts                      | Detect secret-like values and keep external sync artifacts proposal-first by default.          |
| External tools                    | Avoid holding credentials or performing writes from FlowKit scripts.                           |

## Trust Boundaries

| Boundary                                       | Current control                                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| User input and requirements into agent context | Untrusted-content scanner and rules requiring source analysis before design.                            |
| Configured paths into filesystem operations    | `resolveRepoPath` rejects absolute paths and repository escapes in framework scripts.                   |
| Existing files into generated updates          | Safe writes skip existing files unless `--force` or a scoped harness approval is used.                  |
| Harness run state into phase execution         | Workflow contract validates phase IDs, permissions, validators and output paths.                        |
| Agent edits into completion                    | Claude hooks can run post-edit validation and stop gates; hookless hosts rely on documented validation. |
| Local artifacts into external systems          | Proposal-first sync artifacts; governed apply requires an explicit recorded approval gate.              |
| Source repo into npm                           | CI validation, package allowlist, release-please and npm provenance in release workflows.               |

## Actors

| Actor                        | Assumption                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| Maintainer                   | Can change source code, repo settings and release configuration after review.                 |
| Contributor                  | Can propose code/docs changes through PRs but should not access secrets.                      |
| Target-repo user             | Runs CLI commands and approves local or external workflow gates intentionally.                |
| AI coding agent              | Reads and edits repository files; may make mistakes or follow malicious repository content.   |
| Malicious repository content | May attempt prompt injection, path traversal, unsafe validator config or secret exfiltration. |
| External service             | Jira/TestRail/etc. is treated as outside FlowKit's trust boundary.                            |

## Control Layers

QA FlowKit mixes four kinds of controls. Public docs must not describe one layer as if it were another.

| Layer                     | Provided by FlowKit                                                              | Verified by                                                                | Not guaranteed against                                        |
| ------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Harness enforcement       | Run gates, approvals, modify-existing blocks, validator ordering in `run check`  | `npm run test:e2e-quick`, harness tests in `test-harness.mjs`              | An agent with unrestricted shell that never calls the CLI     |
| Validator detection       | Exit codes, strict mode, path checks, secret-like scans, untrusted-content rules | `npm run validate:oss-extraction`, `npm run test:e2e-adversarial`, CI jobs | Hosts that skip validators or ignore non-zero exits           |
| Prompt and rule guidance  | `AGENTS.md`, `.qa-ai/rules/*.rules.md`, adapter command templates                | Adapter parity checks, `docs:check`, human review                          | Model or host behavior that ignores repository instructions   |
| Host and tool enforcement | Optional Claude hooks; user-approved MCP/tool execution outside FlowKit scripts  | Documented host setup; pilot evidence for selected adapters                | Any host tool the user approves without running FlowKit gates |

## Abuse Cases And Controls

| Abuse case                                                            | Current mitigation                                                                                             | Residual risk / 1.0 gap                                                                           |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Requirement text instructs an agent to ignore rules or reveal secrets | `validate-untrusted-content`, source-analysis rules and strict mode.                                           | Agent hosts can still expose content directly; users should run strict gates in CI.               |
| Config path escapes the repository                                    | Path resolution rejects absolute, escaping and symlink/junction-resolved paths in validators and harness code. | Existing-path races still depend on the local filesystem and CI timing.                           |
| `init` or adapter sync overwrites user files                          | Writes skip existing files by default; `--force` is explicit.                                                  | Real-host adapter verification levels need final labeling before 1.0.                             |
| Update loses user state                                               | `update` preserves `.qa-ai/state/` and config profiles.                                                        | Interrupted update recovery depends on external backups; dry-run documents rollback expectations. |
| Agent edits pre-existing phase outputs without approval               | Harness records baselines and requires `modify-existing:<phaseId>` approval when configured.                   | An unrestricted shell can bypass the harness; CI must remain the final gate.                      |
| External writes happen without review                                 | FlowKit scripts are proposal-first; governed sync requires `external-write:test-management` approval.          | Host MCP/tool execution is outside FlowKit and must be user-approved.                             |
| Secret-like values enter QA artifacts                                 | Strict target validation scans `qa-ai-output/` and `features/`; sync mapping rejects secret-like fields.       | Pattern scanners can miss novel secrets and can produce false positives.                          |
| Malicious custom validator runs arbitrary code                        | Custom validators must be repo-local, cannot shadow built-ins, and must pass `--self-test --json`.             | Custom validator code still executes as local Node.js; treat it as trusted repo code.             |
| Release package includes private or unexpected files                  | npm pack allowlist and smoke pack tests run locally and in CI/release workflows.                               | Maintainer must verify release workflow settings and npm Trusted Publishing.                      |
| Dependency or action vulnerability ships                              | CI runs `npm audit --audit-level=low`, CodeQL and dependency policy checks.                                    | Human security review and open advisory triage are required before RC.                            |

## Threat-To-Verification Mapping

| Abuse case (summary)            | Primary automated verification                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| Prompt injection in inputs      | `npm run test:e2e-adversarial`; `validate-untrusted-content` in `validate:oss-extraction`  |
| Config path escape              | `npm run test:e2e-adversarial`; path tests in `test-validators.mjs` / `test-harness.mjs`   |
| Unsafe overwrite on init/sync   | `npm run test:e2e-adversarial`; `npm run qa:smoke-npm`                                     |
| Update loses preserved state    | `npm run test:e2e-update-migration` (E2E-05)                                               |
| Unapproved phase modification   | Harness baseline tests in `test-harness.mjs`; `npm run test:e2e-quick`                     |
| Ungoverned external writes      | `validate-sync-*` validators; release-gate tests; proposal-first artifact checks           |
| Secret-like values in artifacts | `validate-target` / `secret-patterns` tests; golden target CI                              |
| Malicious custom validator      | `doctor` config checks; custom-validator tests in `test-validators.mjs`                    |
| Unexpected npm tarball contents | `node .github/scripts/verify-npm-pack.mjs`; `npm run test:e2e-clean-install` (E2E-06)      |
| Dependency or CI compromise     | `npm audit --audit-level=low`; CodeQL `Analyze JavaScript`; `npm run test:required-checks` |

Operational controls that cannot be fully automated from the repository alone are listed in
[`security-readiness.md`](security-readiness.md) (branch protection, npm Trusted Publishing, advisory triage).

## Verification

Current automated coverage includes:

- `npm run validate:oss-extraction`;
- `npm run test:e2e-adversarial` (E2E-08 failure paths);
- `npm run test:e2e-update-migration` (E2E-05 state preservation);
- `npm run test:e2e-clean-install` (E2E-06 packed install);
- `npm run test:cli-contracts`;
- `npm run contracts:check`;
- `npm run coverage:check`;
- `npm audit --audit-level=low`;
- `node .github/scripts/verify-npm-pack.mjs`;
- CI jobs for package allowlist, adapter parity, examples, source validation and CodeQL.

The pre-RC security and dependency review is summarized in [`security-readiness.md`](security-readiness.md). Before
stable `1.0.0`, maintainers must still verify repository settings that cannot be proven from local files, such as npm
Trusted Publishing, branch protection and untriaged GitHub Security alerts.

## Accepted Beta Limitations

- QA FlowKit is not a sandbox for a hostile agent or host shell.
- Hook enforcement is host-specific; Claude hooks are stronger than hookless adapter guidance.
- External write enforcement depends on the user and host tooling honoring the recorded approval gate.
- Private vulnerability reporting and npm Trusted Publishing require human-maintained repository/npm settings.
- Pilot and RC evidence must not be inferred from local tests alone.
