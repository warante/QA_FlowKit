# AI Testing Rules / Reglas de pruebas de IA

**Enforced by:** validate-features.mjs (tag checks), validate-test-design.mjs (technique coverage)

Apply when `aiTesting.enabled: true` in `qa-ai.config.yaml`. When disabled, all rules in this file are inactive and existing behavior is unchanged.

---

## When to mark an RF as an AI component / Cuándo marcar un RF como componente de IA

Mark a requirement as an AI component when it involves a model, LLM, prediction, score, generative output, biometric matching, confidence threshold or any non-deterministic behavior.

- In the test design proposal `## Proposed tests` table: set the `AI component` column to `yes` for AI-marked RFs.
- In generated `.feature` files for those RFs: add the `@ai-component` tag to every scenario.

---

## Required test-design techniques / Técnicas de diseño de pruebas requeridas

The following 7 techniques are recognized for AI-component requirements. Teams configure which are required vs. optional via `aiTesting.requiredTechniques` and `aiTesting.optionalTechniques`.

| Technique                 | Definition                                                                                                                                            | OWASP LLM Top 10 reference                                         | NIST AI RMF reference    |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------ |
| `adversarial`             | Test inputs designed to elicit unsafe, incorrect or harmful model outputs (prompt injection, jailbreaks, adversarial examples).                       | LLM01 – Prompt Injection                                           | GOVERN 1.2, MAP 5.1      |
| `statistical-consistency` | Run the same or paraphrased prompt N times and verify the output satisfies the acceptance criterion in at least P% of runs.                           | LLM09 – Overreliance                                               | MEASURE 2.5              |
| `robustness-paraphrase`   | Verify consistent behavior across semantically equivalent inputs (spelling variants, word-order changes, synonym substitution).                       | LLM09 – Overreliance                                               | MEASURE 2.5              |
| `safety-guardrails`       | Verify that configured safety filters, content policies and refusal mechanisms activate for policy-violating inputs.                                  | LLM06 – Sensitive Information Disclosure, LLM08 – Excessive Agency | MANAGE 1.3, GOVERN 6.1   |
| `fairness-bias`           | Measure whether model outputs differ systematically across protected demographic attributes when the RF requires equitable treatment.                 | LLM01 – Prompt Injection (indirect)                                | MANAGE 2.2, MEASURE 2.11 |
| `degradation-fallback`    | Verify graceful fallback behavior (error messages, cached results, human escalation) when the model is unavailable or returns low-confidence results. | LLM09 – Overreliance                                               | MANAGE 2.4               |
| `pii-leakage`             | Verify that the model does not reproduce personal data from training or context that was not explicitly intended for output.                          | LLM06 – Sensitive Information Disclosure                           | MANAGE 1.3, GOVERN 6.2   |

---

## Obligation / Obligación

When `aiTesting.enabled` is `true`:

1. Every RF whose `AI component` column is `yes` in the test design proposal must have at least one planned test per configured `requiredTechniques` entry.
2. Every `.feature` file linked to an AI-marked RF must carry `@ai-component` on the scenario.
3. Every `@ai-component` scenario must carry a `@technique:<value>` tag whose value matches one of the configured required or optional techniques.
4. A proposal that marks an RF as AI must have at least one AI-tagged scenario in the generated features; and a feature with `@ai-component` must trace back to an RF marked AI in the proposal (validator cross-check).

---

## Relationship to other rules / Relación con otras reglas

- Gherkin structure and tag rules: [gherkin.rules.md](gherkin.rules.md)
- Test design coverage: [test-design.rules.md](test-design.rules.md)
- For statistical scenario grammar (P% of N runs) and adversarial dataset path validation, see
  [`gherkin.rules.md`](gherkin.rules.md).

---

## Validation / Validación

```bash
node .qa-ai/scripts/validate-features.mjs
node .qa-ai/scripts/validate-test-design.mjs
```

Run after generating or updating AI-component feature files and proposals.

---

## Note on EU AI Act / Nota sobre la Ley de IA de la UE

EU AI Act obligations (risk classification, conformity assessment) are referenced as a pointer for enterprise users and are **not** encoded as deterministic rules in QA FlowKit. Compliance obligations must be evaluated by the team's legal/regulatory advisors.
