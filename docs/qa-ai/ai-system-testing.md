# AI System Testing

> **Stability:** Experimental. Opt-in via `aiTesting.enabled: true` in `qa-ai.config.yaml`.

QA FlowKit provides a structured, validator-enforced approach to testing AI/ML components. When enabled, it adds:

1. An **AI component** classification column to the test design proposal.
2. **`@ai-component`** and **`@technique:<value>`** tags to Gherkin scenarios.
3. Automated cross-checks in `validate-features.mjs` and `validate-test-design.mjs`.

---

## Enabling AI testing

In `qa-ai.config.yaml`:

```yaml
aiTesting:
  enabled: true
  requiredTechniques:
    - adversarial
    - statistical-consistency
    - robustness-paraphrase
    - safety-guardrails
  optionalTechniques:
    - fairness-bias
    - degradation-fallback
    - pii-leakage
```

All presets ship with `aiTesting.enabled: false` and the full default technique list (4 required, 3 optional).

---

## Identifying AI components

Mark a requirement as an AI component when it involves:

- A machine-learning model, LLM, or embedding
- A prediction, score, classification, or generative output
- A biometric matching or confidence threshold
- Any non-deterministic behavior driven by a model

In the test design proposal `## Proposed tests` table, add an `AI component` column:

```markdown
## Proposed tests

| RF     | Description               | Type       | AI component |
| ------ | ------------------------- | ---------- | ------------ |
| RF-200 | Toxicity guard (positive) | functional | yes          |
| RF-200 | Toxicity guard (negative) | negative   | yes          |
| RF-100 | User login                | functional | no           |
```

---

## The 7 AI test techniques

| Technique                 | Description                                                                  | OWASP LLM        | NIST AI RMF |
| ------------------------- | ---------------------------------------------------------------------------- | ---------------- | ----------- |
| `adversarial`             | Prompt injection, jailbreaks, adversarial inputs                             | LLM01            | GOVERN 1.2  |
| `statistical-consistency` | Run N times, verify ≥ P% satisfy the acceptance criterion                    | LLM09            | MEASURE 2.5 |
| `robustness-paraphrase`   | Paraphrased / synonym-substituted inputs produce consistent behavior         | LLM09            | MEASURE 2.5 |
| `safety-guardrails`       | Content filters and refusal mechanisms activate on policy-violating inputs   | LLM06, LLM08     | MANAGE 1.3  |
| `fairness-bias`           | Outputs do not differ systematically across protected demographic attributes | LLM01 (indirect) | MANAGE 2.2  |
| `degradation-fallback`    | Graceful fallback when model is unavailable or confidence is low             | LLM09            | MANAGE 2.4  |
| `pii-leakage`             | Model does not reproduce personal data not intended for output               | LLM06            | GOVERN 6.2  |

Custom techniques are accepted as `other:<description>`.

---

## Feature file convention

AI-component scenarios carry two additional tags on the tag line:

```gherkin
@rf:RF-200 @type:functional @priority:high @manual:false @ai-component @technique:adversarial
Feature: RF-200 toxicity guard
  Acceptance Criteria: model refuses toxic inputs
  Scenario: RF-200 adversarial prompt is rejected
    Given a prompt designed to elicit harmful content
    When the prompt is submitted to the model
    Then the response is refused with a policy violation message
```

Rules:

- Every `@ai-component` scenario **must** carry at least one `@technique:<value>` tag.
- Every `@technique:<value>` tag **must** belong to a scenario tagged `@ai-component`.
- The `@technique:<value>` value must be one of the 7 recognized techniques or `other:*`.

---

## Statistical assertions

AI-component scenarios may express non-deterministic expectations with a validator-supported statistical step:

```gherkin
@rf:RF-200 @type:functional @priority:high @manual:false @ai-component @technique:statistical-consistency
Feature: RF-200 response consistency
  Acceptance Criteria: model output remains policy-compliant across repeated runs
  Scenario: RF-200 response remains compliant
    Given the adversarial dataset "test/fixtures/gherkin-quality-dataset/data/adversarial-prompts.txt"
    When the same prompt is submitted 20 times
    Then the response should satisfy policy compliance in at least 95% of 20 runs
```

```gherkin
# language: es
@rf:RF-201 @type:functional @priority:high @manual:false @ai-component @technique:statistical-consistency
Caracteristica: Consistencia de respuesta
  Criterios de aceptación: la salida del modelo cumple la politica en ejecuciones repetidas
  Escenario: RF-201 respuesta consistente
    Dado el dataset adversarial "test/fixtures/gherkin-quality-dataset/data/adversarial-prompts.txt"
    Cuando se envia el mismo prompt 20 veces
    Entonces la respuesta debe cumplir cumplimiento de politica en al menos 95% de 20 ejecuciones
```

Validation rules:

- The statistical step is allowed only with `@ai-component`.
- `P` is an integer from 1 to 100.
- `N` is an integer of at least 2.
- `P >= 95` requires `N >= 10`.
- Dataset paths must be repository-relative, must exist and must not escape the repository.

---

## Eval evidence

QA FlowKit does not execute model evals itself. Teams run their eval suite and export JSON evidence, then point
`qa-ai.config.yaml` at those files:

```yaml
execution:
  evalResultsPaths:
    - reports/evals/*.json
```

The generic eval schema is:

```json
{
  "tool": "generic",
  "createdAt": "2026-06-18T10:00:00Z",
  "cases": [
    {
      "id": "EVAL-200",
      "rfId": "RF-200",
      "name": "RF-200 safety guardrail",
      "pass": true,
      "score": 0.97,
      "threshold": 0.95
    }
  ]
}
```

promptfoo-style exports with a top-level `results` array are also accepted. Include `rfId` in `vars`, `metadata`, or the
case name so the evidence links back to the traceability matrix:

```json
{
  "results": [
    {
      "vars": { "id": "EVAL-200", "rfId": "RF-200" },
      "testCase": { "description": "RF-200 adversarial refusal" },
      "gradingResult": { "pass": true, "score": 0.97, "threshold": 0.95 }
    }
  ]
}
```

Run:

```bash
node .qa-ai/scripts/validate-execution-evidence.mjs
```

When `aiTesting.enabled: true`, AI-marked RFs must have linked passing eval evidence. Statistical scenarios additionally
require numeric `score` and `threshold`, and `score >= threshold`.

For enterprise release gates, add eval files to `.qa-ai/output/release-gate.yaml`:

```yaml
evidence:
  evals:
    - reports/evals/promptfoo-results.json
```

---

## Validation

```bash
# Tag validation (per file)
node .qa-ai/scripts/validate-features.mjs

# Technique coverage across RFs (requires aiTesting.enabled and coverage mode ≠ off)
node .qa-ai/scripts/validate-test-design.mjs
```

`validate-test-design.mjs` checks that:

- Every RF marked `AI component: yes` in the proposal has at least one scenario per configured `requiredTechniques` entry.
- Feature files with `@ai-component` trace back to an RF marked as an AI component in the proposal.
- Features for AI RFs that are missing `@ai-component` are flagged.

Findings are reported at `advisory` (warning) or `strict` (error) severity depending on `testDesign.coverage.mode`.

---

## Agent workflow integration

When `aiTesting.enabled: true`, agents must:

1. During **requirements intake**: look for signals such as model, LLM, prediction, score, generative, biometric,
   confidence, embedding or non-deterministic behavior.
2. When those signals appear, ask in the configured `project.interfaceLanguage` whether the RF is an AI component.
3. During **test design**: add the `AI component` column and cover all configured `requiredTechniques`.
4. During **feature generation**: add `@ai-component` and configured `@technique:*` tags.
5. During **proposal review**: ensure all `requiredTechniques` are covered per AI RF.

See [`.qa-ai/rules/ai-testing.rules.md`](../../.qa-ai/rules/ai-testing.rules.md) for the full rule set read by agents.

---

## AI specialists

When `aiTesting.enabled: true` and `agents.specialistMode: auto`, init activates:

- [`ai-evals.md`](../../.qa-ai/agents/specialists/available/ai-evals.md): designs promptfoo, DeepEval-style or generic
  eval-suite plans with datasets, assertions, thresholds, evidence exports and RF traceability.
- [`ai-red-team.md`](../../.qa-ai/agents/specialists/available/ai-red-team.md): proposes authorized adversarial and
  safety-guardrail test cases mapped to OWASP LLM risks.

Both specialists are proposal-level. QA FlowKit does not call models, external eval services or production systems; the
team owns execution and later provides evidence.

---

## Relationship to other docs

| Topic                   | Reference                                                                    |
| ----------------------- | ---------------------------------------------------------------------------- |
| Config keys             | [config-schema.md](config-schema.md)                                         |
| Gherkin tags and rules  | [.qa-ai/rules/gherkin.rules.md](../../.qa-ai/rules/gherkin.rules.md)         |
| AI testing rules (full) | [.qa-ai/rules/ai-testing.rules.md](../../.qa-ai/rules/ai-testing.rules.md)   |
| Test design rules       | [.qa-ai/rules/test-design.rules.md](../../.qa-ai/rules/test-design.rules.md) |
| Workflow overview       | [workflow.md](workflow.md)                                                   |
