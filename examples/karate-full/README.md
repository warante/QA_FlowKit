# Karate Full Reference

This reference separates QA design Gherkin from executable Karate API and browser tests.

```text
requirements -> design features -> traceability
                           \-> Karate API + UI execution
```

## Validate

From the QA FlowKit source repository:

```bash
npm run test:e2e-karate
```

This packs and installs QA FlowKit into a temporary copy, runs strict target validation and validates both Karate
feature roots.

To execute the Karate runtime as CI does, install Java 17 or later and run:

```bash
npm run test:e2e-karate -- --runtime
```

The runtime command downloads the official Karate standalone JAR into a temporary directory, starts the included
local application and executes API and headless Chrome scenarios. It does not call an external test environment.

## Layout

- `features/`: QA design Gherkin governed by QA FlowKit.
- `tests/karate/features/api/`: executable Karate API tests.
- `tests/karate/features/ui/`: executable Karate browser tests.
- `app/server.mjs`: deterministic local UI and API.
- `qa-ai-output/`: reviewed design, implementation and traceability artifacts.

Karate execution requires Java and Chrome. Dependency download requires network access; test execution itself is
local.
