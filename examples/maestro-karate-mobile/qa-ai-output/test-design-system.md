# System Test Design

## Scope

RF-401 API and mobile UI behavior.

## Architecture alignment

Karate validates the API while Maestro expresses device-level UI flows.

## Testability risks

Mobile host execution requires an application binary and connected device.

## Cross-RF coverage strategy

Reusable Maestro subflows contain shared navigation.

## Shared fixtures and data

The local API returns a fixed demo balance.

## Non-functional focus

No external service or production account is used.

## Strategy routing overview

| RF / area | Signal | Specialist(s) | Decision | Evidence type | Rationale |
| --------- | ------ | ------------- | -------- | ------------- | --------- |

Mobile and API specialists are covered by configured Maestro and Karate frameworks; no extra strategy routing rows.

## Open questions

The host application build remains an evaluator-provided prerequisite.
