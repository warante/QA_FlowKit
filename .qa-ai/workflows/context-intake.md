# QA Context Intake Workflow

Use this workflow when the user provides a repository-local folder that documents how QA works for their team.

## Purpose

Convert QA working-practice documentation into a proposed QA FlowKit configuration and durable local guidance for future agents.

## Supported Input

The MVP supports one repository-local folder:

```bash
node .qa-ai/scripts/init.mjs --qa-context qa-ai-knowledge
```

The folder may contain Markdown, text, YAML, JSON or other readable local documentation. Do not read files outside the repository. Do not read secrets.

## Required Steps

1. Read `AGENTS.md`, `.qa-ai/rules/`, `.qa-ai/agents/README.md` and this workflow.
2. Load `.qa-ai/agents/qa-context-intake-agent.md`.
3. Inspect the QA context folder structure and read only relevant documentation.
4. Summarize explicit QA practices and separate them from inferred practices.
5. Recommend init defaults:
   - `--interface-language`
   - `--gherkin-language`
   - `--preset`
   - `--requirements-source`
   - `--test-management-tool`
   - `--issue-tracker`
   - `--ui-framework`
   - `--api-framework`
   - `--adapters`
   - optional `--set key=value` overrides
6. Present the recommendation and ask for approval.
7. After approval, run `init.mjs` with `--qa-context <path>` plus the approved flags.
8. Write or update the configured local artifacts:
   - `.qa-ai/output/qa-knowledge-summary.md`
   - `.qa-ai/output/qa-init-decisions.md`
9. Run `node .qa-ai/scripts/doctor.mjs`.

## Artifact Expectations

`.qa-ai/output/qa-knowledge-summary.md` should contain:

- Source folder.
- Files reviewed.
- Explicit QA practices.
- Inferred QA practices.
- Pending decisions.
- Workflow adaptations future agents must follow.

`.qa-ai/output/qa-init-decisions.md` should contain:

- Approved init command.
- Reasoning for selected defaults.
- Explicit user approvals.
- Deferred decisions.

## Safety

- Do not perform external writes.
- Do not store secrets in generated artifacts.
- Do not overwrite existing artifacts unless the user approves `--force` behavior.
- If the context conflicts with `.qa-ai/rules/`, keep `.qa-ai/rules/` as the governing safety layer and document the conflict.
