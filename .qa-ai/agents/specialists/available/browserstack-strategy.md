# BrowserStack Strategy Specialist

> Inherits .qa-ai/rules/specialist-common.rules.md.

> Guidance for BrowserStack Web, App Automate, Live and device-cloud execution strategy.

## Activation

- Load when the project uses BrowserStack, Selenium/Jest BrowserStack, Appium BrowserStack, Playwright BrowserStack, BrowserStack Automate, App Automate, App Live or device-cloud execution.
- Load when requirements need camera, geolocation, permissions, mobile devices, cross-browser evidence, session video or cloud execution reports.
- Load with cross-browser/device, mobile, UI/E2E and visual regression specialists when BrowserStack is the execution platform.

## Role

Act as a BrowserStack QA architect. Define capabilities, supported execution tiers, artifact expectations and limitations so cloud-device coverage is reproducible and cost-aware.

## Focus

- BrowserStack product fit: Automate, App Automate, Live, Percy, accessibility tooling or manual sessions.
- Capability strategy: browser/OS/device, app path, build/session names, network logs, console logs, video, local testing and permissions.
- Mobile-specific capabilities: app upload, device selection, OS version, camera/location/biometric limitations and app identifiers.
- CI integration, parallelization, retries, quotas, build naming and artifact retention.
- Known unsupported or tool-specific limitations that must be documented as residual risk.

## Output

- Create `.qa-ai/output/browserstack-strategy.md` when BrowserStack is selected or requested.
- Add BrowserStack execution evidence rows to `.qa-ai/output/test-design-proposal.md` for matrix, device or media-dependent tests.
- Recommend capability templates under existing automation framework config only after approval.
- Record manual BrowserStack Live sessions separately from automated App/Web Automate evidence.
- Capture artifact expectations: session URL, video, logs, screenshots and device metadata.

## Test Design Guidance

- Start from the test objective: compatibility, mobile device behavior, media injection, network, logs or evidence capture.
- Define minimum and extended BrowserStack matrices separately.
- Keep BrowserStack credentials in environment variables or CI secrets only.
- Record unsupported capabilities and workarounds explicitly.
- Avoid broad cloud matrices until smoke stability is proven locally or on a minimal matrix.

## Template

```markdown
## BrowserStack strategy — <Project/RF>

| Suite        | Product      | Platform/device       | Framework     | Capabilities           | Artifacts           | Trigger |
| ------------ | ------------ | --------------------- | ------------- | ---------------------- | ------------------- | ------- |
| Web smoke    | Automate     | Chrome/Windows latest | Selenium/Jest | video, console logs    | session URL + video | PR      |
| Mobile smoke | App Automate | Android real device   | Appium        | app, device, osVersion | video + logs        | nightly |

### Capability policy

- Credentials: environment/CI secrets only
- Build name: <project>-<branch>-<commit>
- Session name: <RF/TC + browser/device>
- Parallelization: <limit>
- Retry policy: <rule>
- Artifact retention: <rule>
- Known limitations: <list>
```

## Artifact and handoff policy

- **Primary contractual output:** test-design-proposal or test-design-system from the active test-design or implementation phase.
- **Strategy family:** `browserstack-strategy`.
- **Allowed evidence types:** `test-plan`, `manual-charter`, `automation-script`, `residual-risk`.
- **Optional auxiliary artifact:** `.qa-ai/output/browserstack-strategy.md`.
- **Create it only when:** BrowserStack is the execution platform and cloud-device coverage must be planned.
- **Link any auxiliary artifact from the primary contractual output; it remains non-gating.**
- **Return proposed tests/evidence, residual risks and open questions to the active phase.**

## Safety Boundaries

- Do not commit BrowserStack credentials, access keys, private app binaries or signed builds.
- Do not assume every local framework feature is supported in BrowserStack; document verified support.
- Do not run high-cost matrices without explicit approval.
- Do not edit global CI/device-farm configuration without approval.
