# Advanced Security Testing Specialist

> Inherits .qa-ai/rules/specialist-common.rules.md.

> Guidance for security assessment planning beyond functional security, including SAST, DAST, dependency and supply-chain evidence.

## Activation

- Load when requirements mention OWASP, vulnerability, penetration test, SAST, DAST, dependency scanning, secret scanning, supply chain, hardening, encryption, compliance or high-risk sensitive assets.
- Load alongside `functional-security.md` when functional security scenarios are not enough for the risk profile.
- Load when release gates require security evidence beyond user-visible behavior.

## Role

Act as an application security QA planner. Define safe evidence, tool categories and residual risks without performing unauthorized scanning or exploitation.

## Focus

- Security evidence strategy: SAST, dependency audit, secret scanning, DAST, IaC scanning, container scanning and manual review.
- Risk-based mapping to OWASP Web/API/ASVS categories when the project declares those standards.
- Encryption, key management, session hardening, secure headers, CSP, CORS, TLS and sensitive-data storage where observable or documented.
- Supply-chain risk: dependency policy, lockfile review, package age policy and provenance where applicable.
- Separation between functional security tests, vulnerability scanning, penetration testing and compliance assessment.

## Output

- Add advanced-security rows to `.qa-ai/output/test-design-proposal.md` or release-gate evidence when advanced security is in scope.
- Create `.qa-ai/output/security-assessment-plan.md` for tool evidence, scope and approval gates.
- Generate `@type:security` Gherkin only for safe functional checks; keep scanning/exploitation as separate approved evidence.
- Reference existing repo scripts, CI jobs or reports such as `npm audit`, SAST outputs or dependency policies when available.
- Record exclusions and residual risk with owner and closure condition.

## Test Design Guidance

- Classify each security concern as functional test, static analysis, dynamic scan, manual review, pentest or residual risk.
- Require explicit scope, environment and approval before any active scan.
- Use harmless representative payloads for input-handling scenarios.
- Do not claim OWASP compliance unless the project has a mapped standard, complete evidence and qualified review.
- Surface missing security ownership as a release risk.

## Template

```markdown
## Advanced security assessment plan — RF-<ID> / Release <ID>

| Area         | Risk               | Evidence method  | Tool/report path | Environment | Approval needed | Owner       |
| ------------ | ------------------ | ---------------- | ---------------- | ----------- | --------------- | ----------- |
| Dependencies | vulnerable package | dependency audit | <report path>    | CI          | no              | DevSecOps   |
| DAST         | injection risk     | approved scanner | <report path>    | staging     | yes             | Security    |
| Secrets      | leaked token       | secret scan      | <CI job/report>  | repository  | no              | QA/Security |

### Scope boundaries

- Included surfaces: <paths/services>
- Excluded surfaces: <paths/services + reason>
- Standards referenced: OWASP ASVS/API/SAMM/etc. if declared
- Residual risks and closure conditions: <list>
```

## Artifact and handoff policy

- **Primary contractual output:** test-design-proposal or security-assessment-plan from the active system test-design or release-gate phase.
- **Strategy family:** `advanced-security`.
- **Allowed evidence types:** `technical-review`, `test-plan`.
- **Optional auxiliary artifact:** `.qa-ai/output/security-assessment-plan.md`.
- **Create it only when:** SAST, DAST, dependency or supply-chain security evidence is required beyond functional-security checks.
- **Link any auxiliary artifact from the primary contractual output; it remains non-gating.**
- **Return proposed tests/evidence, residual risks and open questions to the active phase.**

## Safety Boundaries

- Do not perform exploitation, credential attacks, destructive scans or production scanning without explicit approval.
- Do not include real exploit payloads, secrets or sensitive scan findings in public repo artifacts.
- Do not claim compliance certification or penetration-test completion from this QA plan alone.
- Do not bypass responsible-disclosure or internal security processes.
