# Risk Analysis

## Scoring configuration

- Impact weight: 3
- Probability weight: 2
- Complexity weight: 2
- Data sensitivity weight: 2
- Security/privacy weight: 3
- AI impact weight: 2

## Risk Assessment

| RF     | Criterion IDs              | Business impact | Failure probability | Complexity | Data sensitivity | Security/privacy impact | AI impact | Risk score | Recommended depth | Rationale                                                                                                                                                                                                                |
| ------ | -------------------------- | --------------- | ------------------- | ---------- | ---------------- | ----------------------- | --------- | ---------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RF-501 | RF-501-CA-1 to RF-501-CA-6 | 5               | 3                   | 3          | 5                | 5                       | 1         | 63         | enterprise-gate   | Registration is the entry point for all users. Failure blocks acquisition. PII (email) and credentials (password) are regulated data. Security impact is critical due to auth. Score 63 exceeds extended threshold (12). |
