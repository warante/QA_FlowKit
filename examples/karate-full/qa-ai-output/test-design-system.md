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

## Open questions

None.
