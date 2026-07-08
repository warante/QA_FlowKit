# Test Design Proposal for RF-501

## Official RF ID

RF-501

## Scope

Design test cases covering all 6 acceptance criteria for user registration: valid registration, duplicate rejection, password validation, terms acceptance, confirmation email, and inline validation errors.

## Existing tests to reuse

No existing tests to reuse. This is the first iteration of QA coverage for RF-501.

## Existing tests requiring modification

None.

## New tests to create

All 6 test cases are new. See proposed tests table below.

## Ambiguities requiring user decision

- CA-5 (confirmation email): Should email delivery be verified with a mock SMTP server or verified manually?

## Approval request

Please review the proposed test coverage and confirm test priority assignments.

## RF-501: User Registration

### Proposed tests

| Test ID       | Criterion IDs | Description                                               | Type       | Technique | Priority | Manual | NFR tags | Notes                   |
| ------------- | ------------- | --------------------------------------------------------- | ---------- | --------- | -------- | ------ | -------- | ----------------------- |
| RF-501-TC-001 | RF-501-CA-1   | Valid registration with correct email and strong password | functional | positive  | high     | false  |          | Happy path registration |
