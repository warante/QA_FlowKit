# SARIF validation output

QA FlowKit can serialize the target validation pipeline as SARIF 2.1.0 without changing existing text or JSON output:

```bash
npx qa-flowkit validate-target --sarif > qa-flowkit.sarif
```

Use the same validation flags as your normal target check. `--sarif` and `--json` are mutually exclusive.
The command writes only SARIF JSON to stdout. It does not create files itself, upload results, modify permissions,
or bypass approvals. Shell redirection can overwrite a file; choose a new output path or approve replacement first.
Keep the report outside configured secret-scan input directories to avoid scanning a previous report on the next run.
On Windows, use a shell that writes UTF-8 when redirecting stdout; older Windows PowerShell defaults to UTF-16.

## Meaning and limitations

- Reports contain findings from the same validators as `validate-target --json`, including configured custom validators
  and the secret scan. There is one stable rule ID per validator, not a new rule for every message.
- Errors map to `error`, warnings to `warning`, informational findings to `note`. Non-blocking custom validators remain
  warnings. Failed validators without an error diagnostic receive a fallback error so they cannot appear clean.
- File locations use percent-encoded, repository-relative URIs. Absolute, external, escaping and secret-like paths
  are omitted. Lines are included only when the validator provides a positive integer; no line is guessed from text.
- Fingerprints derive from rule, normalized URI, severity and redacted message. They survive line-number shifts when
  the message stays the same; changing message text or rule names can change alert identity.
- Known credential patterns are redacted using FlowKit's existing heuristics. Source contents and raw custom-validator
  properties are not embedded. This is not a comprehensive data-loss-prevention tool: review reports before sharing.
- A passing run with no findings has an empty `results` array. It is not proof of functional correctness, executed
  tests, completed release gates, or real-host certification. SARIF exports validation findings, not execution reports;
  `export-report` continues to support Cucumber JSON, Allure and JUnit XML only.

Exit code `0` means validation passed; `1` means validation failed or the tool could not finish.
`runs[0].properties.validationPassed` records the validation outcome. SARIF's `executionSuccessful` is `true` when the
pipeline completed normally, even with validation errors; a fatal exception sets it to `false` and emits a runtime
error finding. Consumers must check the exit code/outcome, not infer passing validation from valid SARIF syntax.

## CI consumption

Generate the file even when validation fails, then preserve the original exit code. An artifact or code-scanning
upload must be a separate, explicitly configured CI step that runs on failure too. Upload is not enabled by FlowKit;
check the platform's SARIF support, permissions and repository eligibility before opting in.

Local CLI and installed-package tests cover serialization and failure behavior. No live GitHub upload or alert
ingestion is claimed by those tests.
