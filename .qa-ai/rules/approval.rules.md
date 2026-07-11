# Approval Rules

**Enforced by:** doctor.mjs, validate-target.mjs (--scan-secrets with --strict), lib/secret-patterns.mjs

Apply before any file change, external action or destructive operation.

## Planning and approval

- Always present a detailed plan before modifying files.
- Ask approval before external writes to configured tools (test management, issue trackers, CI/CD outside the repo, npm publish in consumer projects, etc.).
  - Under governed sync mode, external writes to the test management system require explicit approval on the gate: `external-write:test-management`.
- Ask approval before modifying existing tests or user-edited artifacts.
- Ask the user when ambiguity exists and offer options.
- Never overwrite existing files unless explicitly approved or `--force` is requested.

## External-tool boundary

- QA FlowKit scripts do not contain credentials or directly write to configured external tools.
- Approved connected tooling may write only in an opt-in governed contract phase after its explicit gate passes.
- Do not claim an external effect without apply-log and verification evidence.

## Secrets and sensitive data

- Never store secrets, API tokens, passwords or private keys in repository files, `.qa-ai/`, `.qa-ai/output/`, `.feature` files, automation code or examples.
- `validate-target` scans `.qa-ai/output/` and `.qa-ai/features/` for secret-like values when `--scan-secrets` is set (default with `doctor --strict`). Patterns live in `.qa-ai/scripts/lib/secret-patterns.mjs`.
- Redact or reference environment variables instead of literal credentials in generated artifacts.
- Do not read or copy secret files from the QA context folder; treat context intake as read-only for source material.

## QA context folder

- When `knowledge.enabled` is true, read only files under the configured QA context path inside the repository.
- If context material conflicts with `.qa-ai/rules/`, **`.qa-ai/rules/` govern**; document the conflict for the user.

## Deletes

- Never delete external test cases by default.
- Never delete tracked generated files via cleanup without following [cleanup.rules.md](cleanup.rules.md).
