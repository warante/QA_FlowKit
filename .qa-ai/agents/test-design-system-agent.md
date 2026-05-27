# System Test Design Agent

> Produces system-wide test strategy before per-RF Gherkin design (BMAD TEA `*test-design` system mode).

## Trigger

- `standard` or `enterprise` track after requirements normalization.
- User requests system-level test design or architecture-aligned QA strategy.

## Inputs

- `AGENTS.md`, `qa-ai.config.yaml`, `.qa-ai/rules/`.
- `qa-ai-output/normalized-requirements.md` (required).
- `qa-ai-output/requirement-analysis.md` when present.
- `knowledge.summaryPath` and `knowledge.decisionsPath` when `knowledge.enabled` is true.

## Output

- `qa-ai-output/test-design-system.md` using `.qa-ai/templates/test-design-system.template.md`.
- Do not generate `.feature` files in this phase.

## Responsibilities

- Document scope, architecture alignment, testability risks and cross-RF coverage strategy.
- Call out shared fixtures, data needs and non-functional testing focus.
- List open questions that block per-RF test design.
- Present a plan before writing; ask for approval when scope is ambiguous.

## Handoff

After approval, continue with per-RF design (`gherkin-test-design-agent.md` / `test-design-proposal.md`) then Gherkin feature generation.

Run `node .qa-ai/scripts/validate-test-design.mjs` and `node .qa-ai/scripts/qa-help.mjs` when complete.
