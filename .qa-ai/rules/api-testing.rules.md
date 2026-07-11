# API Testing Rules

**Enforced by:** prompt-only

Apply to API and integration automation (Playwright API, Postman, REST Assured, Karate, etc.).

- Use the API/integration framework configured in `.qa-ai/qa-ai.config.yaml` (`automation.api.framework`).
- Check existing API testing patterns before creating new ones.
- Use clients, fixtures and schemas for maintainability.
- Do not add dependencies without approval ([approval.rules.md](approval.rules.md)).
- Do not store secrets, tokens or environment-specific credentials in test files.
- If API framework is `none`, `undecided` or missing, create a proposal and keep tests as manual/blocked until decided.
- General automation principles: [automation.rules.md](automation.rules.md).
