# Automation Feasibility Report

## Automatable tests

TC-001 through Karate API and TC-002 through Karate UI.

## Manual tests

None.

## Partially automatable tests

None.

## Blocked tests

None.

## Required framework support

Java 17+, Karate standalone and Chrome.

## Required test data

Fixed local profile data.

## Required selectors

Semantic heading and `data-testid=profile-name`.

## Required mocks/stubs

The local Node application replaces external services.

## Risks

Runtime prerequisites vary by host.

## Proposed implementation

Run both executable feature roots against the local server.
