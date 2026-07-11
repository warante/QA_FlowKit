# Specialist Common Rules

**Enforced by:** agent protocol, approval gates and phase validators

Apply to every file under `.qa-ai/agents/specialists/available/`.

- Internal instructions and inter-agent coordination use concise English.
- User-facing narrative and QA Markdown artifacts use `project.interfaceLanguage`.
- Gherkin content uses `gherkin.language`.
- Keep RF, Criterion ID, Test ID and evidence-path traceability.
- Use the resolved modern paths from `.qa-ai/qa-ai.config.yaml`; never hardcode legacy roots.
- Return proposed tests, evidence, residual risks and open questions to the active design/implementation phase.
- Prefer an existing contractual artifact. Create a specialist-specific artifact only when it materially improves
  reviewability; classify it as contractual (template + validator) or auxiliary (optional, non-gating).
- Do not modify existing files, add dependencies, incur external cost or perform external writes without the applicable
  approval.
- Do not store secrets, credentials, personal data or private production evidence.
- Do not claim execution, compliance, coverage or external effects without evidence.
- Run the validators declared by the active contract phase after affected artifacts change.
