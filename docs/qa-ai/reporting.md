# Reporting Exporters

QA FlowKit provides a built-in report exporter command to output traceability and execution results to Cucumber JSON, Allure 2, and JUnit XML formats. This feeds directly into the reporting tools, dashboards, and CI portals you already use.

## Exporting Reports

Run the exporter command via the CLI:

```bash
npx qa-flowkit export-report --format cucumber-json|allure|junit-xml [options]
```

### Options

| Option              | Behavior / Default                                                              |
| ------------------- | ------------------------------------------------------------------------------- |
| `--format <format>` | **Required**. Supported: `cucumber-json`, `allure`, `junit-xml`.                |
| `--out <dir>`       | Directory to write output files. Defaults to `.qa-ai/output/reports/<format>/`. |
| `--json`            | Outputs a machine-readable JSON summary to stdout.                              |
| `--fixed-timestamp` | Injects a fixed epoch time or ISO 8601 string for testing determinism.          |
| `--fixed-uuid`      | Injects a seed to generate deterministic UUIDs for testing.                     |

---

## Formats

### 1. Cucumber JSON (`cucumber-json`)

Generates a single consolidated `cucumber.json` report containing feature metadata, scenarios, tags, and steps.

- Gherkin steps are parsed and synthesized from the feature files directly (using the configured Gherkin language).
- If execution evidence results are available, step execution states and durations are populated. Failed tests map their error message to the failing Gherkin step.
- Without execution evidence, statuses default to `skipped`.

### 2. Allure 2 (`allure`)

Generates individual Allure 2 `*-result.json` files for each test case.

- Uses a stable `historyId` hashed from the test case ID to track history across runs.
- Maps custom tags and labels from Gherkin tags, priority, type, and RF requirements.
- Without execution evidence, statuses default to `skipped`.

### 3. JUnit XML (`junit-xml`)

Generates a consolidated `junit.xml` file.

- Groups test cases into `<testsuite>` elements grouped per Requirement ID (`RF`).
- Suitable for basic CI dashboards or portals that only ingest JUnit format.

---

## Path Safety and Cleanup

- **Path Safety**: The output directory is restricted to stay within the repository bounds. Traversal attempts like `--out ../escape` are blocked.
- **Cleanup**: Generated directories and files are registered in the QA FlowKit initialization manifest (`.qa-ai/state/init-manifest.json`) under the `generated` category. Running `npx qa-flowkit clean` will remove them.

## Determinism for Snapshot Testing

For snapshot assertion or reproducible builds, inject fixed timestamps and UUID seeds:

```bash
npx qa-flowkit export-report --format allure --fixed-timestamp 1718728800000 --fixed-uuid test-seed
```

This guarantees byte-stable JSON/XML outputs.
