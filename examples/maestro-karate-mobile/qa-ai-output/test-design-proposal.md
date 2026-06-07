# Test Design Proposal

## Official RF ID

RF-401.

## Scope

Account balance API and mobile home screen.

## Proposed tests

| RF     | CA       | Test ID | Title            | Type   | Priority | Manual | Action |
| ------ | -------- | ------- | ---------------- | ------ | -------- | ------ | ------ |
| RF-401 | CA-401-1 | TC-001  | Retrieve balance | API    | High     | No     | Create |
| RF-401 | CA-401-2 | TC-002  | View balance     | Mobile | High     | No     | Create |

## Existing tests to reuse

None.

## Existing tests requiring modification

None.

## New tests to create

One Karate API feature and one Maestro flow with a reusable subflow.

## Ambiguities requiring user decision

Application binary and platform are selected during host verification.

## Approval request

Approved for this public reference.
