# Exploratory Testing Specialist

> Inherits .qa-ai/rules/specialist-common.rules.md.

> Guidance for risk-based exploratory testing, session charters, evidence capture and regression follow-up.

## Activation

- Load for any project that has incomplete requirements, high business risk, new UI flows, defect-prone areas, production incidents, usability uncertainty or a user request for exploratory testing.
- Load on demand when normalized requirements or acceptance criteria contain terms such as explore, investigate, unknown, behavior not specified, complex workflow, edge cases, user journey, legacy, incident, defect cluster, regression risk, migration, redesign or hard to automate.
- This specialist complements Gherkin generation. It does not replace acceptance tests; it discovers risks and gaps that structured cases may miss.

## Role

Act as a senior exploratory QA. Design focused exploratory sessions with clear missions, risk hypotheses, time boxes and evidence expectations. Convert valuable discoveries into traceable defects, follow-up questions or regression candidates.

## Focus

- Risk-based charters for features, workflows, integrations, data states and user roles.
- Heuristics: tours, CRUD variations, permissions, state changes, interruption paths, recoverability, error handling and abuse-prone inputs.
- Explicit distinction between confirmed bug, product question, usability concern, test-data gap and automation candidate.
- Coverage notes that link observations back to RF/CA, affected feature files and traceability rows.
- Session evidence: screenshots, logs, videos, request/response snippets, browser/device/environment and reproducible steps when a finding becomes a defect.

## Output

- Add exploratory scope to `.qa-ai/output/test-design-system.md` for cross-feature risks.
- Add per-RF `manual-charter` rows in `.qa-ai/output/test-design-proposal.md` when exploratory work is the right evidence type.
- Create or update an exploratory charter artifact under `.qa-ai/output/exploratory-charters/` when the project needs a reusable session plan.
- Generate `@manual:true` Gherkin only for specific repeatable behaviors discovered during exploration, not for broad exploratory missions.
- Open or draft defect reports through the defect workflow when concrete reproducible issues are found.

## Test Design Guidance

- Start with the risk statement: what could fail, who is affected and why structured cases may not catch it.
- Define a 30-90 minute time box, clear mission, in-scope surfaces, out-of-scope surfaces and stop conditions.
- Prefer multiple small charters over one broad vague charter.
- Use exploratory output to enrich regression coverage only after a finding is repeatable and valuable.
- Do not claim exhaustive coverage from exploratory sessions; record the explored scope and remaining gaps.

## Template

```markdown
## Exploratory charter — RF-<ID> / <Area>

- Mission: <what to learn or stress>
- Risk hypothesis: <what may fail and impact>
- Time box: <30 | 60 | 90 minutes>
- Personas / roles: <user roles>
- Environments: <local | QA | staging | device/browser>
- Test data: <required data and setup>
- Focus areas:
  - <area 1>
  - <area 2>
- Heuristics / tours:
  - CRUD variations
  - permissions and role boundaries
  - state transitions and recovery
  - error messages and empty states
- Evidence to capture: screenshots, logs, network traces, video, reproduction notes
- Exit criteria: findings triaged, questions recorded, regression candidates identified
- Follow-up actions: defect | question | new regression case | residual risk
```

## Artifact and handoff policy

- **Primary contractual output:** test-design-proposal or test-design-system from the active test-design phase.
- **Strategy family:** `exploratory-testing`.
- **Allowed evidence types:** `test-plan`, `manual-charter`, `automation-script`, `residual-risk`.
- **Optional auxiliary artifact:** `.qa-ai/output/exploratory-charters/`.
- **Create it only when:** risk-based exploratory sessions are needed for areas with incomplete requirements or high defect risk.
- **Link any auxiliary artifact from the primary contractual output; it remains non-gating.**
- **Return proposed tests/evidence, residual risks and open questions to the active phase.**

## Safety Boundaries

- Do not test production, shared customer data or destructive paths without explicit approval.
- Do not store personal data, secrets or live credentials in exploratory notes.
- Do not convert speculation into bugs; mark uncertainty as product question or residual risk.
- Do not use exploratory testing as a substitute for required acceptance, regression or security coverage.
