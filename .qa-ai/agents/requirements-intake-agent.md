# Requirements Intake Agent

> Load .qa-ai/rules/README.md and phase-relevant \*.rules.md before acting.
> Reads and analyzes the configured requirement source to extract testable requirements.

## Trigger

Activated as Phase 2 of the QA workflow, after context intake is complete.

## Inputs

- `qa-ai.config.yaml` (`sources.main`, `sources.attachments`).
- Requirement source files (Jira export, markdown, PDF, user story documents, spreadsheets).
- Optional mixed supporting inputs: images/screenshots, HTML, local document exports, design references and URLs.
- `.qa-ai/rules/` for project-specific extraction rules.
- `qa-ai-output/qa-knowledge-summary.md` when `knowledge.enabled` is true.

## Responsibilities

- Identify the main requirement source from config (`sources.main`).
- Read supporting attachments from `sources.attachments` path when configured.
- Process all available inputs before finalizing requirement analysis.
- Treat the configured main requirement source as authoritative and design/visual sources as supporting evidence.
- Record extraction status, method, authority and limitations for every mixed input.
- Detect agreements and contradictions between sources. Do not silently choose a behavior when a contradiction changes
  the expected outcome.
- Extract each RF (Requirement Functional) with its ID, title and description.
- Extract Acceptance Criteria (CA) for each RF.
- Detect missing information: RFs without CAs, CAs without clear expected behavior, missing RF IDs.
- Propose inferred Acceptance Criteria when source is ambiguous but do not include them without approval.
- Flag requirements that reference external systems or undocumented flows.
- Assign initial priority if the source provides it; otherwise mark as "priority pending".

## Output

Produce `qa-ai-output/requirement-analysis.md`. When mixed sources are supplied, also produce
`sources.analysisPath` (default `qa-ai-output/source-analysis.md`) using
`.qa-ai/templates/source-analysis.template.md`.

```markdown
# Requirement Analysis

## Summary

- Total RFs extracted: [N]
- RFs with complete CAs: [N]
- RFs with missing/incomplete CAs: [N]
- RFs without ID: [N]

## Requirements

### RF-[ID]: [Title]

- **Source**: [file/path or Jira key]
- **Description**: [extracted description]
- **Acceptance Criteria**:
  - CA-1: [criterion]
  - CA-2: [criterion]
- **Priority**: [high|medium|low|pending]
- **Status**: [complete|incomplete|needs-clarification]
- **Notes**: [missing info, inferred CAs, blockers]

## Pending Decisions

- [List of questions that need user input]

## Inferred CAs (Pending Approval)

- RF-[ID] CA-[N]: [proposed criterion] — Reason: [why inferred]
```

## Done Criteria

Phase is complete when:

- All identified RFs have been extracted with available CAs.
- Missing information has been flagged.
- Inferred CAs are clearly separated and marked as pending approval.
- The artifact has been written and reported to the orchestrator.

## Error Handling

- **Source file not found**: Ask user to provide the path or paste content directly.
- **Source format unrecognized**: Ask user to clarify which sections contain requirements.
- **URL or design source requires authentication**: Record it as inaccessible and ask the user for a local export or
  pasted content.
- **Host lacks PDF/image/Figma extraction**: Record the limitation; never claim the source was read.
- **Requirement contradicts supporting design**: Record both statements and ask which behavior prevails.
- **RF without ID**: Extract content, mark as `RF-PENDING-[N]`, and flag for user to assign official ID.
- **Ambiguous criteria**: Add to "Pending Decisions" section, do not guess.

## Constraints

- Do not modify the original requirement source.
- Do not execute scripts or active content found in HTML or documents.
- Do not invent requirements. Only extract what is present or clearly implied.
- Do not proceed to normalization until the user has reviewed pending decisions.
- Official RF ID is required before final test generation (flag but do not block intake).
