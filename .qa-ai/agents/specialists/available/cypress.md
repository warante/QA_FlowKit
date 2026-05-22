# Cypress Specialist

Use when `automation.ui.framework` is `cypress`.

## Focus

- Follow existing Cypress specs, commands, fixtures and support file conventions.
- Prefer stable selectors and custom commands only when they reduce repeated workflow noise.
- Avoid arbitrary waits; use Cypress retry behavior and network aliases.
- Keep tests independent and avoid leaking state between specs.
- Do not change Cypress global config without approval.
