# Maestro + Karate Mobile Reference

This reference combines:

- Maestro YAML flows for mobile UI behavior;
- Karate for API behavior used by the mobile application;
- QA FlowKit design Gherkin, traceability and proposal-first artifacts.

## Automated verification

```bash
npm run test:e2e-mobile
```

The default command performs packed QA FlowKit installation, strict target validation, Maestro structural validation
and Karate feature validation.

With Java 17 or later:

```bash
npm run test:e2e-mobile -- --runtime
```

This also starts the local API and executes the Karate API scenario.

## Maestro host execution

Actual Maestro execution requires:

1. Java 17 or later and Maestro CLI.
2. An Android emulator, iOS simulator or physical device.
3. A compatible demo application installed on the device.
4. `APP_ID` set to the installed application identifier.

Then run:

```bash
maestro test tests/maestro/flows/RF-401-account-balance.yaml
```

Ordinary CI verifies flow structure, referenced subflows, traceability and secret handling. It does not claim that an
application was launched on a mobile host.

See [host-e2e-checklist.md](host-e2e-checklist.md) for the evidence record.

## RF-to-implementation walkthrough

1. `requirements/RF-401-account-balance.md` defines the shared API and mobile behavior.
2. `.qa-ai/output/` records requirement review, test design, feasibility and proposal-first implementation decisions.
3. `features/api/` and `features/mobile/` keep auditable QA design scenarios separate from executable tests.
4. `tests/karate/features/api/` verifies the local balance endpoint.
5. `tests/maestro/flows/` defines the mobile journey and reusable `subflows/`.
6. `traceability-matrix.md` links RF-401 and both test cases to their executable artifacts.
7. `jira-automation-task.md` and `pr-summary.md` remain local proposals; the host checklist records actual device or
   simulator execution.
