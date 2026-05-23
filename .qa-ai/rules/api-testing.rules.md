# API Testing Rules

- Use the API/integration framework configured in `qa-ai.config.yaml` (`automation.api.framework`).
- Check existing API testing patterns before creating new ones.
- Use clients, fixtures and schemas for maintainability.
- Do not add dependencies without approval.
- If API framework is `none`, `undecided` or missing, create a proposal and keep tests as manual/blocked until decided.
