# System Test Design

## Scope

RF-301 API and browser behavior using one Playwright Test configuration.

## Architecture alignment

The local Node application supplies both interfaces and avoids external dependencies.

## Testability risks

Chromium must be installed for UI execution.

## Cross-RF coverage strategy

Shared Playwright fixtures and base URL support future order requirements.

## Shared fixtures and data

ORD-301 is fixed and read-only.

## Non-functional focus

Tests are isolated, parallel-safe and network-independent after dependency installation.

## Strategy routing overview

| RF / area | Signal | Specialist(s) | Decision | Evidence type | Rationale |
| --------- | ------ | ------------- | -------- | ------------- | --------- |

No on-demand specialists beyond the configured Playwright baseline for this example.

## Open questions

None.
