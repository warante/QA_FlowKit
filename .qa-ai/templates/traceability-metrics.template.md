# Traceability Metrics Report

## Coverage Summary

| Metric                | Value                                                                | Status               |
| --------------------- | -------------------------------------------------------------------- | -------------------- |
| RF Coverage           | {coveredRFs}/{totalRFs} ({rfCoveragePercent}%)                       | {rfStatus}           |
| NFR Coverage          | {nfrsWithEvidence}/{totalNFRs} ({nfrCoveragePercent}%)               | {nfrStatus}          |
| Automation Rate       | {automatedTests}/{totalTests} ({automationPercent}%)                 | {automationStatus}   |
| Complete Traceability | {completeTraceability}/{totalTests} ({completeTraceabilityPercent}%) | {traceabilityStatus} |

## Detailed Breakdown

### Functional Coverage

- Total RFs: {totalRFs}
- Covered RFs: {coveredRFs}
- Uncovered RFs: {uncoveredRFList}

### NFR Coverage by Attribute

| Attribute                                                | Total | Covered | Planned | Blocked | Residual Risk |
| -------------------------------------------------------- | ----- | ------- | ------- | ------- | ------------- |
| { nfrByAttribute rows - only attributes with total > 0 } |

### Automation Status

- Automated: {automatedTests} tests
- Manual: {manualTests} tests
- Proposal-only: {proposalOnlyTests} tests

### Traceability Completeness

- Complete (RF + Feature + Case ID): {completeTraceability}
- Partial: {partialTraceability}
- Missing: {missingTraceability}
