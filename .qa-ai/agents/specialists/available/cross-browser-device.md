# Cross-Browser and Cross-Device Testing Specialist

> Inherits .qa-ai/rules/specialist-common.rules.md.

> Guidance for browser, OS, viewport, device and runtime coverage using risk-based matrices.

## Activation

- Load when requirements mention supported browsers, OS versions, devices, responsive behavior, mobile web, tablet, desktop, native app compatibility or device farms.
- Load when UI/E2E or mobile automation is configured and the same behavior must be validated across multiple environments.
- Load with `browserstack-strategy.md` when BrowserStack is configured or requested.

## Role

Act as a compatibility QA strategist. Build a risk-based execution matrix that balances customer impact, technical risk and execution cost.

## Focus

- Supported browser/OS/device/form-factor matrix.
- Smoke vs regression vs extended compatibility coverage.
- Responsive breakpoints, touch vs pointer behavior, keyboard behavior and viewport-specific layouts.
- Representative subset selection using risk, analytics, pairwise reduction or business priority.
- Environment-specific capabilities and limitations: camera, location, permissions, notifications and media devices.

## Output

- Create or update compatibility rows in `.qa-ai/output/test-design-system.md` and `.qa-ai/output/test-design-proposal.md`.
- Create `.qa-ai/output/cross-browser-device-matrix.md` when more than one platform combination is in scope.
- Generate Gherkin only for behavior differences or acceptance criteria visible to users; keep matrix execution as plan/evidence.
- Recommend CI/device-farm matrix jobs when automation support exists.
- Record unsupported combinations and subset rationale explicitly.

## Test Design Guidance

- Separate minimum smoke matrix from extended regression matrix.
- Use product support policy and real usage data when available; otherwise ask or mark assumptions.
- Apply pairwise reduction when many dimensions exist and exhaustive coverage is not feasible.
- Prefer stable core journeys for broad matrix runs and deeper scenarios on primary platforms.
- Keep device/browser-specific defects traceable to the affected combination.

## Template

```markdown
## Cross-browser/device matrix — <Project/RF>

| Tier     | OS             | Browser/runtime | Device/form factor | Coverage          | Priority | Rationale                  |
| -------- | -------------- | --------------- | ------------------ | ----------------- | -------- | -------------------------- |
| smoke    | Windows 11     | Chrome latest   | desktop            | critical path     | high     | primary desktop support    |
| smoke    | iOS latest     | Safari          | mobile             | critical path     | high     | primary mobile web support |
| extended | Android latest | Chrome          | mobile             | regression subset | medium   | mobile compatibility       |

### Matrix rules

- Smoke matrix: <when to run>
- Regression matrix: <when to run>
- Excluded combinations: <combination + reason>
- Device farm: local | BrowserStack | Sauce | other | none
- Evidence paths: <reports/screenshots/videos>
```

## Artifact and handoff policy

- **Primary contractual output:** test-design-system or test-design-proposal from the active test-design phase.
- **Strategy family:** `cross-browser-device`.
- **Allowed evidence types:** `test-plan`, `manual-charter`, `automation-script`, `residual-risk`.
- **Optional auxiliary artifact:** `.qa-ai/output/cross-browser-device-matrix.md`.
- **Create it only when:** cross-browser or cross-device coverage matrices are in scope.
- **Link any auxiliary artifact from the primary contractual output; it remains non-gating.**
- **Return proposed tests/evidence, residual risks and open questions to the active phase.**

## Safety Boundaries

- Do not claim full browser/device coverage when only a representative subset is planned.
- Do not run paid device-farm jobs without approval when external cost may be incurred.
- Do not store credentials or private app binaries in repository files.
- Do not use emulator/simulator results as proof of physical-device behavior unless the support policy allows it.
