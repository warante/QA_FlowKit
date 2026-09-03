# Execution Traceability Report

## Summary

| Metric               | Value                                              |
| -------------------- | -------------------------------------------------- |
| Total Tests Executed | {totalTests}                                       |
| Linked to RF         | {linkedToRf} ({linkedPercent}%)                    |
| Unlinked Tests       | {unlinkedTests} ({100 - linkedPercent}%)           |
| RFs Validated        | {validatedRfs}/{totalRfs} ({rfValidationPercent}%) |
| RFs Not Validated    | {notValidatedRfs}                                  |

## Unlinked Tests

| Test ID  | Test Name | Issue                             | Recommendation                             |
| -------- | --------- | --------------------------------- | ------------------------------------------ |
| {testId} | {name}    | Missing @rf: tag or not in matrix | Add @rf: tag or update traceability matrix |

## RFs Not Validated

| RF ID  | Reason            | Risk |
| ------ | ----------------- | ---- |
| {rfId} | No tests executed | High |

## RF Coverage Details

| RF ID  | Total Tests  | Passed   | Failed   | Skipped   | Pass Rate   |
| ------ | ------------ | -------- | -------- | --------- | ----------- |
| {rfId} | {totalTests} | {passed} | {failed} | {skipped} | {passRate}% |
