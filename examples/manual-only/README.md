# Manual-only Quick Reference

This target repository shows the smallest complete QA FlowKit outcome:

```text
requirement -> normalized acceptance criteria -> Gherkin -> traceability -> PR summary
```

It uses the `quick` track, has no automation runtime and performs no external writes.

## Contents

- `requirements/RF-101-login.md`: source requirement.
- `qa-ai.config.yaml`: manual-only quick-track configuration.
- `qa-ai-output/`: initialization decisions, reviewed requirement, traceability and PR artifacts.
- `features/functional/`: one manual Gherkin test case.

## Validate from the QA FlowKit repository

```bash
npm run test:e2e-manual-example
```

The runner:

1. packs the current QA FlowKit source;
2. copies this example to a temporary clean target;
3. installs the tarball without accessing external services;
4. runs `qa-flowkit init --preset manual-only`;
5. verifies the example artifacts were not overwritten;
6. runs `doctor --strict` and `validate-target`.

The same test runs in CI on Ubuntu and Windows with Node.js 20 and 22.

## Try it manually

From a copy of this directory:

```bash
npx qa-flowkit@rc init --preset manual-only --no-adapters
npx qa-flowkit@rc doctor --strict
npx qa-flowkit@rc validate-target
```

Package download time is the only network-dependent part. The workflow itself requires no Jira, TestRail or model
credentials.

## Reset

When working in this source repository, restore the example with:

```bash
git restore examples/manual-only
```

For a standalone copy, delete it and copy the directory again. Generated `.qa-ai/`, adapter and manifest files are
installation output and are intentionally absent from the canonical example.

## Architecture notes

- One requirement maps to one acceptance criterion and one `.feature` file.
- `@rf:` and `@id:` provide stable traceability.
- `@manual:true` makes the execution intent explicit.
- The traceability matrix points to the exact source and feature paths.
- The PR summary links the change back to the traceability artifact.
