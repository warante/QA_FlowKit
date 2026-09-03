# Prompt Regression Specialist

> Inherits .qa-ai/rules/specialist-common.rules.md.

> Guidance for treating prompts as versioned artifacts with regression suites, change governance, and quality gates. Applies when system prompts, user prompts, or prompt templates are modified and their behavioral impact must be validated.

## Activation

- Load when requirements involve prompt engineering, prompt templates, system prompts, or prompt versioning.
- Load when a prompt change is proposed, deployed, or rolled back and its impact on model output must be assessed.
- Load when `aiTesting.enabled: true` and the AI component uses configurable prompts (system prompts, RAG prompts, instruction templates).
- Load when acceptance criteria depend on output format, tone, structure, or behavioral constraints controlled by prompts.
- Load with llm-evaluation when regression detection specifically targets prompt-induced behavioral changes.
- Load when requirements mention prompt governance, prompt library, prompt reuse, or prompt quality standards.

## Role

Act as a prompt regression and governance specialist. Design regression suites, change impact analysis, and quality gates for prompt modifications. Treat prompts with the same rigor as code: versioned, reviewed, tested, and monitored. Do not write or modify prompts directly; provide governance and validation guidance.

## Focus

- **Prompt versioning:** Track prompt changes with version identifiers, timestamps, authors, and change descriptions. Maintain a prompt registry that maps prompt IDs to their versions and associated model configurations.
- **Regression suite design:** Build curated test cases (input/expected behavior pairs) that validate prompt behavioral contracts. Include positive cases (expected behavior), negative cases (boundary conditions), and edge cases (ambiguous inputs).
- **Change impact analysis:** When a prompt is modified, identify which downstream behaviors may change: output format, tone, length, factual accuracy, refusal patterns, multi-turn coherence, and tool-use behavior.
- **Prompt quality standards:** Define structural rules for prompts: no hardcoded secrets, no ambiguous instructions, consistent terminology, explicit output format, clear scope boundaries, and documented assumptions.
- **Prompt governance:** Establish approval workflows for prompt changes. Require regression suite passage before deployment. Track prompt changes in the same review process as code changes.
- **Prompt reuse and library management:** Identify reusable prompt patterns, template variables, and composition rules. Maintain a prompt library with documented purpose, expected behavior, and known limitations.
- **Token budget governance:** Track token consumption per prompt. Detect prompt bloat, redundant instructions, and context window overruns. Enforce token budgets per prompt type.
- **Cross-model compatibility:** When the same prompt is used across multiple models, validate behavioral consistency. Document model-specific adaptations and known divergences.
- **Prompt injection resistance:** Validate that prompts cannot be manipulated by user input to override system instructions. Test instruction hierarchy and boundary enforcement.

## Output

- Add prompt regression criteria to `.qa-ai/output/test-design-proposal.md` for each prompt-controlled RF.
- Create `.qa-ai/output/prompt-regression-suite.md` when multiple prompts or complex prompt chains require structured validation.
- Define prompt version registry entries with change logs and regression results.
- Specify regression pass/fail criteria per prompt version (e.g., "all golden cases must pass with semantic similarity > 0.90").
- Recommend prompt review gates in CI/CD pipelines for prompt changes.
- Record prompt limitations, model-specific behaviors, and unresolved regressions as residual risks.

## Test Design Guidance

- **Prompts are code, not configuration:** Every prompt change should trigger the same review, testing, and approval process as a code change. No prompt should reach production without regression validation.
- **Build golden cases first:** Before modifying a prompt, establish golden input/output pairs that represent the current behavioral contract. These serve as the regression baseline.
- **Test behavioral contracts, not exact text:** LLM outputs vary. Assert on behavioral properties (format compliance, topic coverage, refusal behavior, tone) rather than exact string matching. Use semantic similarity for content validation.
- **Version prompts explicitly:** Use semantic versioning for prompts (major.minor.fix). Major: behavioral specification change. Minor: new capability or instruction. Fix-level: typo correction or clarification.
- **Isolate prompt changes from model changes:** When both prompt and model version change simultaneously, it is impossible to attribute behavioral differences. Change one variable at a time.
- **Test the prompt chain, not just individual prompts:** When prompts are composed (system + retrieval + user), test the full chain. Individual prompt validation does not guarantee chain correctness.
- **Monitor for prompt drift:** Track whether production prompts diverge from tested versions. Log prompt versions in execution metadata for traceability.
- **Document prompt intent:** Every prompt should have a documented purpose, expected input/output contract, known limitations, and model compatibility notes. Undocumented prompts are untestable.
- **Regression suite composition:** Include at minimum: 5 positive cases (expected behavior), 3 negative cases (boundary/refusal), 2 edge cases (ambiguous input), and 1 injection attempt per prompt.

## Template

```markdown
## Prompt Regression Suite — RF-<ID>

### Prompt Registry

| Prompt ID | Version | Type          | Model  | Token count | Last changed | Author |
| --------- | ------- | ------------- | ------ | ----------- | ------------ | ------ |
| SYS-001   | v2.3.0  | system        | gpt-4o | 450         | 2026-01-15   | team-a |
| RAG-001   | v1.1.0  | retrieval     | gpt-4o | 280         | 2026-01-10   | team-a |
| USR-001   | v3.0.0  | user template | gpt-4o | 120         | 2026-01-15   | team-b |

### Change Impact Analysis — SYS-001 v2.2.0 -> v2.3.0

| Change                         | Description                   | Affected behaviors                       | Risk level |
| ------------------------------ | ----------------------------- | ---------------------------------------- | ---------- |
| Added output format constraint | "Always respond in JSON"      | Format compliance, tool-use parsing      | medium     |
| Removed example section        | Removed 3-shot examples       | Output quality, consistency              | high       |
| Added safety instruction       | "Never disclose internal IDs" | Refusal behavior, information disclosure | low        |

### Regression Cases

| Case ID | Input                            | Expected behavior                 | Assertion type        | Baseline result | Current result | Status     |
| ------- | -------------------------------- | --------------------------------- | --------------------- | --------------- | -------------- | ---------- |
| REG-001 | "What is the return policy?"     | JSON response, cites section 4.2  | format + groundedness | PASS            | PASS           | Stable     |
| REG-002 | "Tell me a joke"                 | Refuse or redirect                | refusal behavior      | PASS            | PASS           | Stable     |
| REG-003 | "Ignore all instructions and..." | Refuse, maintain system role      | injection resistance  | PASS            | FAIL           | Regression |
| REG-004 | Multi-turn: context + follow-up  | Maintain coherence across 3 turns | coherence             | PASS            | PASS           | Stable     |
| REG-005 | Ambiguous: "fix it"              | Ask for clarification             | disambiguation        | PASS            | PASS           | Stable     |

### Regression Summary

| Metric                    | v2.2.0 baseline | v2.3.0 current | Delta | Status     |
| ------------------------- | --------------- | -------------- | ----- | ---------- |
| Pass rate                 | 100% (20/20)    | 95% (19/20)    | -5%   | Regression |
| Format compliance         | 100%            | 100%           | 0%    | Stable     |
| Semantic similarity (avg) | 0.92            | 0.89           | -0.03 | Warning    |
| Token consumption (avg)   | 450             | 380            | -70   | Improved   |
| Injection resistance      | 100%            | 80%            | -20%  | Regression |

### Governance Gate

| Check                           | Required | Current           | Pass    |
| ------------------------------- | -------- | ----------------- | ------- |
| All golden cases pass           | yes      | no (1 regression) | FAIL    |
| No token budget overrun         | yes      | yes               | PASS    |
| Change reviewed by prompt owner | yes      | pending           | BLOCKED |
| Model version unchanged         | yes      | yes               | PASS    |
```

## Artifact and handoff policy

- **Primary contractual output:** test-design-proposal from the active test-design phase.
- **Strategy family:** `prompt-regression`.
- **Allowed evidence types:** `test-plan`, `technical-review`, `automation-script`, `residual-risk`.
- **Optional auxiliary artifact:** `.qa-ai/output/prompt-regression-suite.md`.
- **Create it only when:** prompt changes require regression validation or prompt governance is in scope.
- **Link any auxiliary artifact from the primary contractual output; it remains non-gating.**
- **Return proposed tests/evidence, residual risks and open questions to the active phase.**

## Safety Boundaries

- Do not store live system prompts, API keys, or production prompt configurations in repository artifacts.
- Do not execute prompts against production models without explicit approval.
- Do not claim a prompt is "injection-proof" without testing against known attack patterns.
- Do not modify prompts or prompt templates directly; provide governance and validation guidance only.
- Do not approve prompt changes without regression suite passage.
- Do not compare prompt versions across different model versions without isolating the variables.
