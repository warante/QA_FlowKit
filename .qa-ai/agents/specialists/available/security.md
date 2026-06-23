# Functional Security Testing Specialist

> Guidance for user-visible security behavior. This is not a penetration-testing or compliance capability.

## Activation

Load when requirements involve authentication, authorization, user-owned resources, sensitive data, file uploads,
rendered user input, quotas or session lifecycle, when `testDesign.coverage.requireSecurityReview` is true, or when a
source NFR with attribute `security` appears in `normalized-requirements.md`.

## Focus

- Authentication: protected routes, logout invalidation and expired sessions.
- Authorization: role boundaries, privilege escalation and access to another user's resources (IDOR).
- Sensitive data: tokens, payment data, private identifiers and internal details must not be exposed.
- Rendered input: user content is escaped and cannot execute HTML or JavaScript.
- State-changing actions: verify anti-CSRF behavior when it is observable from the product boundary.
- File uploads: accepted types, rejected types, filenames and size limits.
- Errors: no stack traces, internal paths, dependency versions or database details.
- Abuse limits: quotas, rate limits, duplicate submissions and bulk operations.

## Output

- Record applicability in `qa-ai-output/test-design-proposal.md` under `## Security review`.
- Generate `@type:security` scenarios only for applicable, testable behavior.
- Keep steps in business language and trace every scenario to RF/CA.
- Mark deeper security assessment as a residual risk or separate specialist task.

## Safety Boundaries

- Do not scan, exploit or attack production or shared systems.
- Do not claim OWASP compliance or complete vulnerability coverage.
- Do not store credentials, session tokens, personal data or live exploit payloads.
- Use harmless representative strings for input-handling scenarios.
- Ask for explicit approval before executing tests against any non-local environment.
