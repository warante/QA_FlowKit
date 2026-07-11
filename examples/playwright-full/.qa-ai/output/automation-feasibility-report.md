# Automation Feasibility Report

## Automatable tests

Both tests are automatable with Playwright Test.

## Manual tests

None.

## Partially automatable tests

None.

## Blocked tests

None.

## Required framework support

Node.js, `@playwright/test` and Chromium.

## Required test data

Fixed ORD-301 order.

## Required selectors

Semantic roles and `data-testid=order-status`.

## Required mocks/stubs

The local application replaces external systems.

## Risks

Browser installation adds CI time.

## Proposed implementation

Use Playwright's page and request fixtures from one configuration.
