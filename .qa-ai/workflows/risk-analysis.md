# Risk Analysis Workflow

Run after requirements normalization when `risk.enabled` is `true`.

## Prerequisites

- `.qa-ai/output/normalized-requirements.md` exists.
- `.qa-ai/output/requirement-analysis.md` exists.
- `qa-ai.config.yaml` has `risk.scoring` and `risk.thresholds` configured.

## Steps

1. Read `AGENTS.md`, `qa-ai.config.yaml` and `.qa-ai/agents/risk-analysis-agent.md`.
2. Load normalized requirements and requirement analysis artifacts.
3. For each ready RF, evaluate business impact, failure probability, complexity, data sensitivity, security/privacy exposure and AI impact.
4. Calculate the risk score using configured scoring weights.
5. Recommend testing depth based on score thresholds.
6. Write `.qa-ai/output/risk-analysis.md` with the risk assessment table.
7. Optionally write `.qa-ai/output/risk-register.md` for high-risk items.
8. Run `node .qa-ai/scripts/validate-risk-analysis.mjs`.
9. Fix validation errors until the artifact passes or block with documented reason.

## Safety

- Mark inferred impact values as `inferred` in the rationale column.
- Never change requirement content or acceptance criteria.
- Ask the user before assigning business impact when the source does not document it.
- Do not skip RFs because they are difficult to assess.
