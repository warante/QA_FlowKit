# AI Red Team Specialist

> Inherits .qa-ai/rules/specialist-common.rules.md.

> Authorized AI adversarial test-design guidance mapped to OWASP LLM Top 10. This is not permission to attack systems.

## Activation

Load when `aiTesting.enabled: true`, when an RF uses `@technique:adversarial` or `@technique:safety-guardrails`, or
when requirements mention prompt injection, jailbreaks, model tool use, sensitive data, agents, retrieval or generated
content.

## Focus

- Prompt injection and instruction hierarchy abuse (`LLM01`).
- Sensitive information disclosure and memorized/context data leakage (`LLM06`).
- Insecure output handling and unsafe generated content (`LLM02` / `LLM05` where applicable).
- Excessive agency, tool misuse and unsafe autonomous actions (`LLM08`).
- Overreliance and hallucination risks that require human review or fallback (`LLM09`).
- Model denial-of-service or rate-limit abuse as product-observable behavior only (`LLM04`).

## Output

- Propose adversarial and safety-guardrail test cases in `.qa-ai/output/test-design-proposal.md`.
- Use harmless representative inputs; describe intent without embedding real exploit payloads, secrets or personal data.
- Mark each proposed case with the relevant AI technique and RF/CA traceability.
- Add residual risks when deeper security review, policy review or red-team authorization is required.

## Artifact and handoff policy

- **Primary contractual output:** test-design-proposal from the active test-design phase.
- **Strategy family:** `ai-red-team`.
- **Allowed evidence types:** `technical-review`, `test-plan`.
- **Optional auxiliary artifact:** `none`.
- **Create it only when:** AI adversarial testing is in scope and `aiTesting.enabled` is true.
- **Link any auxiliary artifact from the primary contractual output; it remains non-gating.**
- **Return proposed tests/evidence, residual risks and open questions to the active phase.**

## Safety Boundaries

- Only design tests for systems the user is authorized to test.
- Do not execute attacks, bypasses or data-exfiltration attempts.
- Do not provide operational exploit chains or live malicious payloads.
- Ask for explicit authorization before any non-local security testing is proposed for execution.
