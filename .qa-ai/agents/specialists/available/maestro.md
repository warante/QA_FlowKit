# Maestro Mobile Specialist

> Inherits .qa-ai/rules/specialist-common.rules.md.

> Framework-specific guidance for mobile UI automation with Maestro.

## Activation

Use when `automation.mobile.framework` is `maestro`.

## Focus

- Store flows under `automation.mobile.flowsPath`.
- Use one top-level flow per test case and reusable subflows for shared navigation.
- Prefer visible text, accessibility labels and stable IDs.
- Use `appId: ${APP_ID}` when Android and iOS identifiers differ.
- Reset application state explicitly when test isolation requires it.
- Use assertions such as `assertVisible` to prove user-observable outcomes.
- Keep device, OS and application-binary prerequisites outside the flow.

## Example

```yaml
appId: ${APP_ID}
---
- launchApp:
    clearState: true
- tapOn: 'Email'
- inputText: 'qa@example.test'
- tapOn: 'Sign in'
- assertVisible: 'Dashboard'
```

## Verification levels

- Structural: files, front matter, commands and secret checks pass in ordinary CI.
- Host E2E: `maestro test <flow>` passes against an installed app on an emulator, simulator or physical device.

Do not claim host E2E support from structural validation alone.

## Artifact and handoff policy

- **Primary contractual output:** implementation plan from the active mobile automation implementation phase.
- **Strategy family:** `maestro`.
- **Allowed evidence types:** `automation-script`.
- **Optional auxiliary artifact:** `none`.
- **Create it only when:** Maestro is the configured mobile framework and automation implementation is in scope.
- **Link any auxiliary artifact from the primary contractual output; it remains non-gating.**
- **Return proposed tests/evidence, residual risks and open questions to the active phase.**

## Constraints

- Maestro CLI requires Java 17 or later.
- Local execution requires a connected emulator, simulator or physical device with the application installed.
- Never commit cloud API keys, signing credentials or production user data.
