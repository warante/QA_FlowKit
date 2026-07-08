# Test Data Plan

## Strategy

- Synthetic data allowed: true
- Production copies allowed: false
- Anonymization required: true
- Reset strategy: documented

## Data Sets

| Data ID  | Linked Test IDs | Purpose                                | Data type | Source    | Synthetic | Sensitive | Reset needed | Owner | Notes                                          |
| -------- | --------------- | -------------------------------------- | --------- | --------- | --------- | --------- | ------------ | ----- | ---------------------------------------------- |
| DATA-001 | RF-501-TC-001   | Valid user for happy path registration | payload   | synthetic | yes       | no        | yes          | QA    | Generated per test run; unique email each time |
