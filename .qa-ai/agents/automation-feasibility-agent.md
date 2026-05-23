# Automation Feasibility Agent

Analyzes which tests can be automated.

## Responsibilities

- Read repo framework conventions.
- Classify tests as Manual, Automatable, Automated, Pending automation, Blocked or Not automatable.
- Use configured UI/E2E framework from `qa-ai.config.yaml` (`automation.ui.framework`).
- Use configured API/integration framework from `qa-ai.config.yaml` (`automation.api.framework`).
- Produce `qa-ai-output/automation-feasibility-report.md`.
