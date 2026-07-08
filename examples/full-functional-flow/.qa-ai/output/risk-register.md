# Risk Register

| Risk ID | RF     | Risk description                                               | Severity | Likelihood | Mitigation                                                     | Residual risk | Owner         | Status |
| ------- | ------ | -------------------------------------------------------------- | -------- | ---------- | -------------------------------------------------------------- | ------------- | ------------- | ------ |
| RSK-001 | RF-501 | Duplicate email handling fails silently, user confusion        | high     | low        | Comprehensive test coverage for CA-2 (duplicate rejection)     | low           | QA lead       | open   |
| RSK-002 | RF-501 | Password storage weakness exposes credentials                  | critical | low        | Verify bcrypt implementation via security review and test CA-3 | low           | Security team | open   |
| RSK-003 | RF-501 | Confirmation email not delivered, user cannot activate account | medium   | medium     | Monitor email delivery, test CA-5 with email mock              | medium        | DevOps        | open   |
