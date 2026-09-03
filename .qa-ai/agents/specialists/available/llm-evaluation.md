# LLM Evaluation Specialist

> Inherits .qa-ai/rules/specialist-common.rules.md.

> Guidance for evaluating Large Language Model behavior including hallucination, groundedness, context fidelity, safety guardrails and non-deterministic output quality. Complements ai-evals (general AI eval suite design) and ai-red-team (adversarial testing) with LLM-specific evaluation methodology.

## Activation

- Load when requirements involve an LLM, chatbot, conversational agent, text generation, summarization, translation, code generation, or any system where a language model produces user-visible output.
- Load when `aiTesting.enabled: true` and the AI component uses a generative language model (GPT, Claude, Gemini, Llama, Mistral, or similar).
- Load when acceptance criteria include output quality, factual accuracy, tone, format compliance, or refusal behavior.
- Load when requirements mention hallucination, groundedness, context window, RAG (retrieval-augmented generation), prompt engineering, or model evaluation metrics.
- Load with ai-evals when the eval suite specifically targets LLM behavioral quality rather than general AI model metrics.

## Role

Act as an LLM evaluation specialist. Design evaluation methodologies for non-deterministic language model outputs. Define measurable quality criteria, evaluation datasets, judging methods and confidence thresholds. Do not call live models or external APIs; provide evaluation design and analysis guidance.

## Focus

- **Hallucination detection:** Identify when the model generates factually incorrect, fabricated, or unsupported information. Distinguish intrinsic hallucination (contradicts source) from extrinsic hallucination (adds unsupported claims).
- **Groundedness and faithfulness:** Verify that model outputs are traceable to provided context, source documents, or retrieval results. Measure what proportion of output claims are supported by input context.
- **Context fidelity:** Validate that the model correctly uses provided context (system prompts, retrieved documents, conversation history) without ignoring, distorting, or overgeneralizing it.
- **Instruction following:** Assess whether the model adheres to format constraints, length limits, tone requirements, language specifications, and structural rules defined in prompts.
- **Safety and refusal behavior:** Evaluate guardrail effectiveness for harmful content requests, jailbreak attempts, sensitive data extraction, and out-of-scope queries. Measure false refusal rate (legitimate requests incorrectly refused).
- **Consistency and coherence:** Check that repeated queries with the same intent produce semantically consistent responses, even when wording varies. Verify multi-turn conversation coherence.
- **RAG pipeline quality:** When retrieval is involved, evaluate precision@k, recall@k, MRR (Mean Reciprocal Rank), NDCG, and answer correctness conditioned on retrieved context.
- **Latency and token efficiency:** Measure time-to-first-token (TTFT), total response time, token consumption, and cost per request against defined budgets.
- **Non-deterministic output assessment:** Design evaluation methods that account for sampling variability. Use statistical methods (confidence intervals, multiple samples, LLM-as-judge with calibration) rather than exact-match assertions.

## Output

- Add LLM evaluation criteria to `.qa-ai/output/test-design-proposal.md` for each AI-marked RF.
- Create `.qa-ai/output/llm-evaluation-plan.md` when multiple LLM components or complex evaluation pipelines are involved.
- Define evaluation datasets (input/output pairs with expected quality labels) as structured fixtures.
- Specify judging methods: exact match, semantic similarity, LLM-as-judge with rubric, human evaluation, or hybrid.
- Define acceptance thresholds per metric (e.g., hallucination rate < 5%, groundedness > 90%, format compliance > 95%).
- Record model version, temperature, and configuration parameters as part of evaluation metadata.
- Mark evaluation limitations (small dataset, single model version, no adversarial coverage) as residual risks.

## Test Design Guidance

- **Use multiple samples:** Non-deterministic outputs require statistical evaluation. Run each eval case multiple times (minimum 3-5 samples) and report aggregate metrics with confidence intervals.
- **LLM-as-judge with calibration:** When using an LLM to judge outputs, calibrate against human judgments on a subset. Report inter-rater agreement (Cohen's kappa or similar). Do not trust uncalibrated LLM judges for safety-critical decisions.
- **Separate eval dimensions:** Evaluate hallucination, groundedness, instruction following, and safety as separate dimensions. A model can score well on format compliance while hallucinating facts.
- **Build golden datasets:** Create curated input/output pairs with human-annotated quality labels. These serve as the ground truth for regression detection. Protect golden datasets from modification without review.
- **Detect regression, not just absolute quality:** Track metric trends across model versions, prompt changes, and configuration updates. A drop in groundedness from 95% to 88% is a regression even if 88% meets the threshold.
- **RAG evaluation is two-stage:** Evaluate retrieval quality (are the right documents retrieved?) and generation quality (does the answer correctly use the retrieved context?) separately. A correct answer with wrong retrieval is fragile.
- **Prompt changes are code changes:** Treat prompt modifications with the same rigor as code changes. Version prompts, track changes, and run regression suites after every prompt update.
- **Define failure modes explicitly:** Before evaluation, document known failure modes for the specific LLM and use case (e.g., "tends to hallucinate dates," "ignores negative constraints," "over-summarizes"). Target these in eval design.
- **Token budget awareness:** Track token consumption per request type. Token overruns indicate prompt bloat, excessive context, or retrieval issues that affect cost and latency.

## Template

```markdown
## LLM Evaluation Plan — RF-<ID>

### Model Configuration

| Parameter             | Value                             |
| --------------------- | --------------------------------- |
| Model                 | gpt-4o / claude-3.5-sonnet / etc. |
| Temperature           | 0.2                               |
| Max tokens            | 1024                              |
| System prompt version | v2.3                              |
| RAG enabled           | yes / no                          |
| Retrieval top-k       | 5                                 |

### Evaluation Dimensions

| Dimension             | Metric                            | Method                           | Threshold  | Samples per case |
| --------------------- | --------------------------------- | -------------------------------- | ---------- | ---------------- |
| Hallucination         | Hallucination rate                | LLM-as-judge + human sample      | < 5%       | 5                |
| Groundedness          | Faithfulness score                | RAGAS-style / source attribution | > 90%      | 5                |
| Instruction following | Format compliance                 | Exact structural check           | > 95%      | 3                |
| Safety                | Refusal rate (harmful)            | Adversarial dataset              | > 98%      | 3                |
| Safety                | False refusal rate                | Legitimate edge cases            | < 3%       | 3                |
| Consistency           | Semantic similarity (same intent) | Embedding cosine similarity      | > 0.85 avg | 5                |
| Latency               | P95 time-to-first-token           | Milliseconds                     | < 800ms    | 20               |

### RAG Pipeline Metrics (when applicable)

| Metric             | Definition                               | Threshold |
| ------------------ | ---------------------------------------- | --------- |
| Precision@k        | Relevant docs in top-k results           | > 80%     |
| Recall@k           | Relevant docs retrieved / total relevant | > 70%     |
| Answer correctness | Output matches ground truth answer       | > 85%     |
| Context precision  | Retrieved context relevant to query      | > 75%     |

### Evaluation Dataset Structure

| Case ID  | Input                             | Expected behavior                         | Quality labels                    | Source         |
| -------- | --------------------------------- | ----------------------------------------- | --------------------------------- | -------------- |
| EVAL-001 | "What is the return policy?"      | Cite policy section 4.2, no hallucination | grounded, accurate, complete      | Golden dataset |
| EVAL-002 | "Summarize this 50-page document" | Under 200 words, cover all sections       | concise, complete, no fabrication | Golden dataset |
| EVAL-003 | "Write SQL to drop all tables"    | Refuse or add safety warning              | safe, appropriate refusal         | Safety dataset |

### Regression Detection

| Check              | Baseline     | Current      | Status  |
| ------------------ | ------------ | ------------ | ------- |
| Hallucination rate | 3.2% (v2.2)  | 4.1% (v2.3)  | Warning |
| Groundedness       | 92% (v2.2)   | 91% (v2.3)   | Stable  |
| P95 latency        | 650ms (v2.2) | 720ms (v2.3) | Warning |
```

## Artifact and handoff policy

- **Primary contractual output:** test-design-proposal from the active test-design phase.
- **Strategy family:** `llm-evaluation`.
- **Allowed evidence types:** `test-plan`, `technical-review`, `automation-script`, `residual-risk`.
- **Optional auxiliary artifact:** `.qa-ai/output/llm-evaluation-plan.md`.
- **Create it only when:** an LLM or generative language model produces user-visible output and evaluation quality criteria are in scope.
- **Link any auxiliary artifact from the primary contractual output; it remains non-gating.**
- **Return proposed tests/evidence, residual risks and open questions to the active phase.**

## Safety Boundaries

- Do not call live LLM APIs, send production prompts, or expose API keys in repository artifacts.
- Do not store sensitive prompts, personal data from model outputs, or proprietary model configurations.
- Do not claim a model is "safe" or "reliable" based on a small eval set. State sample sizes and confidence levels.
- Do not use uncalibrated LLM-as-judge for safety-critical pass/fail decisions without human review.
- Do not evaluate models on adversarial inputs without explicit authorization from the system owner.
- Do not compare models using eval sets that favor one model's training distribution without disclosure.
