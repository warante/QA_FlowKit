# Mobile Advanced Testing Specialist

> Strategy guidance for advanced mobile QA beyond framework setup: permissions, interruptions, connectivity, lifecycle and device-specific risks.

## Activation

- Load when requirements mention mobile permissions, system interruptions, offline/online transitions, slow or unstable network, background/foreground, app kill/restart, deep links, push notifications, biometrics, camera, geolocation, orientation, installation, app upgrade, persisted data, sessions or WebView behavior.
- Load when the user explicitly requests advanced mobile test strategy or device-farm coverage planning.
- Do **not** load solely because the project uses Appium, Maestro or BrowserStack — use `appium.md`, `maestro.md` or `browserstack-strategy-agent.md` for framework and cloud execution setup.
- Load with `browserstack-strategy-agent` when device-cloud execution is required for camera, geolocation, biometrics or real-device evidence.

## Role

Act as a mobile advanced QA strategist. Define observable mobile scenarios, environment constraints and evidence types without duplicating framework-specific automation guidance.

## Focus

- Permissions: runtime prompts, denied/revoked states, Android vs iOS differences.
- System interruptions: calls, notifications, low battery, OS dialogs and permission re-prompts.
- Connectivity: offline, online recovery, network loss, slow or unstable network.
- App lifecycle: background/foreground, app kill, cold/warm restart, session persistence.
- Deep links and universal links; push notification delivery and in-app handling.
- Biometrics (Face ID, Touch ID), camera and geolocation when declared in scope.
- Orientation/rotation, installation, upgrade paths and data migration after app update.
- Basic battery/memory consumption when observable through tooling or charters.
- Device farm vs real devices; Android/iOS behavioral differences.
- Persisted data, sessions and WebView boundaries when applicable.

## Output

- Create `qa-ai-output/mobile-advanced-test-plan.md` when advanced mobile behavior is in scope.
- Add mobile-advanced rows to `qa-ai-output/test-design-proposal.md` and traceability matrix.
- Use one canonical evidence type per row; add `Supporting evidence` when complementary artifacts are needed.
- Route cloud execution details to `browserstack-strategy-agent` when BrowserStack or App Automate is the platform.

## Test Design Guidance

- Prefer `feature` when user-visible mobile behavior is acceptance-test-like.
- Prefer `automation-script` when the configured mobile framework can assert the behavior reproducibly.
- Prefer `manual-charter` for interruptions, permissions UX, push trays and device-specific steps hard to automate.
- Prefer `test-plan` for matrix coverage across OS versions, devices or upgrade paths.
- Prefer `technical-review` for capability gaps, WebView security boundaries or unsupported device-cloud features.
- Prefer `residual-risk` when real biometrics, camera or geolocation cannot be tested safely without approval.

| Scenario area                              | Evidence type     | Supporting evidence | Rationale                                                                |
| ------------------------------------------ | ----------------- | ------------------- | ------------------------------------------------------------------------ |
| Push opt-out after login                   | feature           | manual-charter      | User-visible behavior in Gherkin; charter covers notification tray steps |
| Offline checkout recovery                  | automation-script | feature             | Framework can toggle network; Gherkin captures user journey              |
| App upgrade preserves session              | test-plan         | automation-script   | Matrix across versions; scripts verify persisted state                   |
| Biometric fallback when sensor unavailable | manual-charter    | residual-risk       | Device farm may not inject biometrics; document limitation               |

## Template

```markdown
## Mobile advanced test plan — RF-<ID>

| Mobile scenario                | Preconditions     | Trigger            | Expected outcome         | Evidence type     | Supporting evidence | Device notes                |
| ------------------------------ | ----------------- | ------------------ | ------------------------ | ----------------- | ------------------- | --------------------------- |
| Permission denied for camera   | clean install     | open scan feature  | graceful error, no crash | feature           | manual-charter      | Android 14 + iOS 17         |
| App restart after background   | logged in         | OS kills app       | session restored         | automation-script |                     | real device preferred       |
| Deep link opens correct screen | app installed     | tap universal link | target screen loads      | feature           |                     |                             |
| Slow network timeout           | throttled network | submit form        | retry message shown      | manual-charter    | test-plan           | device farm network profile |

### Environment policy

- Synthetic accounts and test data only
- No production builds or real PII
- Document device-cloud capability limits per platform
```

## Safety Boundaries

- Do not use real credentials, production accounts or customer personal data.
- Do not store personal data, biometric samples or location traces in repository artifacts.
- Do not run destructive tests against production apps or shared production backends.
- Do not assume permissions, camera, biometrics or geolocation injection are supported on every device cloud — verify capability matrix first.
- Do not test biometrics, camera or geolocation with real user data without explicit approval.

## Handoff

- Return applicable proposed tests, evidence rows, residual risks and open questions to the system test design and per-RF Gherkin design phases.
- Keep generated scenarios traceable to RF/CA IDs and use non-Gherkin evidence when the quality attribute is not directly user-observable.
- Run the standard QA FlowKit validators after affected proposals, feature files or traceability artifacts are updated.
