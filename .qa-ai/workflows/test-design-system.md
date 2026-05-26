# System Test Design Workflow

Use this workflow on `standard` and `enterprise` tracks **after** requirements normalization and **before** per-RF test design proposals and `.feature` files.

## Inputs

- `qa-ai-output/normalized-requirements.md`
- Optional: architecture docs, ADRs or diagrams referenced in requirements

## Steps

1. Read `AGENTS.md`, `qa-ai.config.yaml`, `.qa-ai/rules/` and `.qa-ai/agents/test-design-system-agent.md`.
2. Produce or update `qa-ai-output/test-design-system.md` from `.qa-ai/templates/test-design-system.template.md`.
3. Align with configured automation and test-management tools; note what stays manual vs automatable at system level.
4. Stop with open questions when RF scope or official RF IDs are unclear.
5. Ask for user approval before starting per-RF proposals.

## Output

- `qa-ai-output/test-design-system.md`

## Validation

```bash
node .qa-ai/scripts/validate-test-design.mjs
```

Skipped on `quick` track (per-RF proposal and features may be produced in one Gherkin pass).

## See also

- [Test design (per RF)](test-design.md)
- [Test design dual-mode](../../docs/qa-ai/test-design-dual-mode.md)
