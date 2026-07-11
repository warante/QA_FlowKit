# Automation Feasibility Report

## Automatable tests

TC-001 with Karate and TC-002 with Maestro on a mobile host.

## Manual tests

Host setup remains manual outside a device-enabled CI environment.

## Partially automatable tests

Maestro structure is automated in ordinary CI; app launch requires a mobile host.

## Blocked tests

None after a compatible app build and device are available.

## Required framework support

Karate standalone, Maestro CLI, Java 17+ and a mobile device or emulator.

## Required test data

Fixed demo account balance.

## Required selectors

Visible labels `Home`, `Account balance` and `125.50 EUR`.

## Required mocks/stubs

Local account API.

## Risks

Application IDs and platform behavior vary by host.

## Proposed implementation

Run Karate in CI and record Maestro host evidence separately.
