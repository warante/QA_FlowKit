# Mobile Automation Rules

**Enforced by:** `doctor.mjs` for configured paths; `validate-maestro-flows.mjs` for Maestro flow files; implementation behavior is prompt-guided

Apply when `automation.mobile.framework` is configured.

- Use the configured mobile framework and `automation.mobile.flowsPath`.
- Keep mobile flows deterministic and independent.
- Prefer accessibility labels and visible text over coordinates.
- Store application IDs in configuration or environment variables, not duplicated across flows.
- Do not commit device-farm credentials, signing material, tokens or private application binaries.
- Treat emulator, simulator and physical-device execution as a separate support level from structural validation.
- For Maestro, use declarative YAML flows and reusable `runFlow` subflows.
- Do not use fixed delays when the framework can wait for visible or asserted state.
- Document required application binary, app ID, device OS and execution command.
- External device farms and Maestro Cloud writes require explicit approval.

General automation principles: [automation.rules.md](automation.rules.md).
