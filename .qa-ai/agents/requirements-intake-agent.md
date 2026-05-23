# Requirements Intake Agent

Reads the configured requirement source and supporting attachments.

## Responsibilities

- Identify main requirement source from `qa-ai.config.yaml` (`sources.main`).
- Extract RFs and Acceptance Criteria.
- Detect missing information.
- Propose inferred Acceptance Criteria but do not include them without approval.
- Produce `qa-ai-output/requirement-analysis.md`.
