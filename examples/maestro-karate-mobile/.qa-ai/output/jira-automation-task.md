# Jira Automation Task Proposal

## Status

Local proposal only. It has not been submitted to Jira or any external issue tracker.

## Summary

Automate RF-401 account balance coverage with Karate API tests and Maestro mobile flows.

## Scope

- TC-001 validates the local balance endpoint with Karate.
- TC-002 defines the mobile account-balance journey with Maestro and a reusable subflow.
- Ordinary CI performs structural Maestro validation; device or simulator execution is recorded separately.

## Acceptance criteria

- Strict QA FlowKit target validation passes.
- Karate API execution passes.
- Maestro flow and subflow references pass structural validation.
- Host execution evidence is recorded before claiming mobile runtime verification.

## External write approval

Creating an issue requires explicit user approval and separately configured integration tooling.
