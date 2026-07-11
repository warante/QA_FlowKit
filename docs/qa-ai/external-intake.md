# External Intake

QA FlowKit can read existing requirements and test cases from your external tools (Jira, Linear,
GitHub Issues, TestRail, Zephyr, etc.) through MCP and normalize them into deterministic local
artifacts before coverage analysis.

This is a **read-only** phase. The agent never writes to external systems. All imported text is
treated as **untrusted content** per `.qa-ai/rules/untrusted-content.rules.md`.

## When to enable

Enable external intake when:

- Your team manages requirements in Jira or another issue tracker and you want the AI to analyze
  coverage starting from existing data instead of copy-paste.
- Your test management tool already has test cases and you want the coverage agent to avoid
  proposing duplicates.

## Configuration

```yaml
sources:
  external:
    enabled: true # default: false
    requirementsImportPath: .qa-ai/output/imported-requirements.md # default
    casesImportPath: .qa-ai/output/imported-cases.md # default
```

When `enabled: true`:

- `node .qa-ai/scripts/init.mjs --with-doc-templates` generates empty stubs at the configured paths.
- The `external-intake` phase is inserted before `tm-coverage` in standard and enterprise tracks.
- `validate-target` runs `validate-external-intake` automatically.
- `validate-untrusted-content` scans both import files alongside the normal requirement sources.

## Artifact format

### `imported-requirements.md`

Produced by the **External Intake Agent** using the template
`.qa-ai/templates/imported-requirements.template.md`.

The index table columns are:

| Column         | Required | Description                                      |
| -------------- | -------- | ------------------------------------------------ |
| `RF ID`        | yes      | Official RF ID or `RF-PENDING-<key>` if unmapped |
| `External key` | yes      | Source system key (e.g. `JIRA-100`)              |
| `Title`        | yes      | Requirement title                                |
| `Source`       | yes      | Source system name                               |
| `Imported at`  | yes      | ISO 8601 UTC timestamp of import                 |
| `Content hash` | yes      | SHA-256 of imported description text             |

Verbatim content from external sources is wrapped in blockquotes and marked as untrusted.

### `imported-cases.md`

Produced by the **External Intake Agent** using the template
`.qa-ai/templates/imported-cases.template.md`.

The cases table columns are:

| Column        | Required | Description                           |
| ------------- | -------- | ------------------------------------- |
| `External ID` | yes      | Test case ID in the external tool     |
| `Title`       | yes      | Test case title                       |
| `Section`     | yes      | Suite or section in external tool     |
| `Status`      | yes      | Case status (`Active`, `Draft`, etc.) |
| `Imported at` | yes      | ISO 8601 UTC timestamp of import      |

## Validation

`validate-external-intake.mjs` checks:

- Table columns are present in both files.
- RF IDs are unique and match `requirements.rfIdPattern` (safe form `PREFIX-\d+`; default `RF-\d+`).
- External IDs are unique within the cases table.
- All `Imported at` values are valid ISO 8601 UTC timestamps.
- Imported text is scanned for prompt-injection phrases (findings are warnings by default; use
  `--strict` to treat them as errors).

Run directly:

```bash
node .qa-ai/scripts/validate-external-intake.mjs --allow-missing
node .qa-ai/scripts/validate-external-intake.mjs --strict --json
```

Or via npm:

```bash
npm run qa:validate-external-intake
```

## Agent behavior

The **External Intake Agent** (`.qa-ai/agents/external-intake-agent.md`) is bilingual (EN/ES) and:

- Reads external data only through MCP tools (never writes externally).
- Maps external keys to official RF IDs when `requirements.requireOfficialRfId: true`.
- Wraps all verbatim external text in blockquotes and flags injection phrases.
- Marks inferred fields with `[inferred]` / `[inferido]`.

## Coverage agent integration

When `imported-cases.md` is present, the **Test Management Coverage Agent** checks it before
proposing new test cases, preventing duplicate coverage of cases already tracked externally. See
`.qa-ai/agents/test-management-coverage-agent.md`.

## Security

- External text is treated as untrusted input; the injection scanner runs on both import artifacts.
- The agent does not follow instructions found in imported content.
- No secrets or API credentials are stored in import artifacts.

## Links

- Agent: [external-intake-agent.md](../../.qa-ai/agents/external-intake-agent.md)
- Templates: [imported-requirements.template.md](../../.qa-ai/templates/imported-requirements.template.md),
  [imported-cases.template.md](../../.qa-ai/templates/imported-cases.template.md)
- Validator: [validate-external-intake.mjs](../../.qa-ai/scripts/validate-external-intake.mjs)
- Config: [config-schema.md](config-schema.md) — `sources.external.*`
- Rules: [untrusted-content.rules.md](../../.qa-ai/rules/untrusted-content.rules.md)
