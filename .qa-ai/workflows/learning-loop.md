# Learning Loop Workflow

Run at the end of the QA cycle when `learningLoop.enabled` is `true`. Optional phase, not blockable by track.

## Prerequisites

- At least one source artifact exists: defect triage, healing log, observability intake, or pilot records.
- `.qa-ai/qa-ai.config.yaml` has `learningLoop.logPath` configured.

## Steps

1. Read `AGENTS.md`, `.qa-ai/qa-ai.config.yaml` and `.qa-ai/agents/learning-loop-agent.md`.
2. Review available source artifacts for patterns:
   - Defect triage: recurring failure classes or missing test types.
   - Healing log: common repair patterns that could become rules.
   - Observability: production signals that expose coverage gaps.
   - Pilot records: human feedback and usability findings.
3. Identify concrete lessons with source traceability.
4. Propose improvements to specific target artifacts:
   - Rules: new validation checks, updated guidance.
   - Agents: improved instructions, clarified constraints.
   - Workflows: streamlined steps, added safety checks.
   - Templates: new or updated artifact structures.
5. Write `.qa-ai/output/learning-log.md` with the items table.
6. Optionally write `.qa-ai/output/rule-improvement-proposals.md` with detailed change proposals.
7. Run `node .qa-ai/scripts/validate-learning-log.mjs`.
8. Fix validation errors until the artifact passes.

## Safety

- Never edit `.qa-ai/rules/`, `.qa-ai/agents/`, `.qa-ai/workflows/` or `.qa-ai/templates/` directly.
- Mark every proposal targeting framework files with `Requires approval=yes`.
- Do not remove or downgrade existing validation rules.
- Propose additions, not removals, unless a rule is proven harmful with concrete evidence.
- Source evidence must be traceable to specific artifacts.
