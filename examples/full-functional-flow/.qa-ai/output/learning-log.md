# Learning Log

## Items

| Learning ID | Source type | Source ID | Lesson                                                                                                                                              | Proposed change                                                            | Target artifact                                   | Requires approval | Status   |
| ----------- | ----------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------- | ----------------- | -------- |
| LRN-001     | review      | RF-501    | Registration flow has 6 CAs but email delivery is inherently manual. Consider adding a mock email server for automated verification.                | Add guidance to test-data-planning-agent.md about email mocking strategies | .qa-ai/agents/test-data-planning-agent.md         | yes               | proposed |
| LRN-002     | review      | RF-501    | Risk score of 63 far exceeds extended threshold. Registration forms are high-risk by nature. Consider a default elevated risk for auth-related RFs. | Add auth/registration risk heuristic to risk-analysis-agent.md             | .qa-ai/agents/risk-analysis-agent.md              | yes               | proposed |
| LRN-003     | review      | RF-501    | Environment readiness check could benefit from a `--self-check` mode that actually probes Node.js version and filesystem.                           | Propose `--self-check` flag for environment-readiness validator            | .qa-ai/scripts/validate-environment-readiness.mjs | yes               | proposed |
