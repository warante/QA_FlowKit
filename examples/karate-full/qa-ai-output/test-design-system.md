# System Test Design

## Scope

RF-201 API and browser behavior against a deterministic local application.

## Architecture alignment

QA design Gherkin remains separate from executable Karate features.

## Testability risks

Chrome and Java availability affect runtime execution but not FlowKit validation.

## Cross-RF coverage strategy

This reference contains one RF; shared conventions support later profile requirements.

## Shared fixtures and data

The local application exposes the fixed Ada Lovelace profile.

## Non-functional focus

Tests avoid external networks and shared state.

## Strategy routing overview

| RF / area | Signal | Specialist(s) | Decision | Evidence type | Rationale |
| --------- | ------ | ------------- | -------- | ------------- | --------- |

No additional on-demand specialists for this Karate reference example.

## Open questions

None.
