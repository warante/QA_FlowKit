# Automation Implementation Plan

## Tests to automate

TC-001 API and TC-002 mobile UI.

## New files

Karate API feature, Maestro flow, subflow and local server.

## Existing files to modify

None.

## Page objects

Not applicable to declarative Maestro flows.

## Helpers

Reusable `open-home.yaml` subflow.

## Fixtures and data

Fixed account balance response.

## API clients

Karate HTTP DSL.

## Risks

Ordinary CI does not provide a mobile application or simulator.

## Execution plan

Validate all artifacts, execute Karate and use the host checklist for Maestro.

## Approval request

Approved for this public reference.
