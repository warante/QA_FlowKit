# Example Repositories

QA FlowKit examples are small target repositories used for evaluation, regression testing and adopter guidance.
They must not require credentials, private services or external writes.

## Example index

| Example                                                          | Track      | Support status | Evidence                                                                                        |
| ---------------------------------------------------------------- | ---------- | -------------- | ----------------------------------------------------------------------------------------------- |
| [Manual-only](../../examples/manual-only/)                       | `quick`    | Maintained     | Packed install plus strict validation on Ubuntu/Windows and Node.js 20/22                       |
| [Playwright UI + API](../../examples/playwright-full/)           | `standard` | In validation  | Local resumable run and Chromium UI/API passed; Ubuntu/Windows runtime jobs are configured      |
| [Karate full](../../examples/karate-full/)                       | `standard` | In validation  | Structural validation passed; Java 21 runtime jobs are configured for Ubuntu/Windows            |
| [Maestro + Karate mobile](../../examples/maestro-karate-mobile/) | `standard` | In validation  | Structural validation passed; Karate runtime jobs and separate mobile-host evidence are defined |

The source-level index is [`examples/README.md`](../../examples/README.md).
The machine-readable inventory and lifecycle state live in
[`examples/compatibility.json`](../../examples/compatibility.json).

## Manual-only reference

[`examples/manual-only/`](../../examples/manual-only/) is the canonical public quick-track result. It contains:

- the RF-101 source requirement;
- a manual-only `qa-ai.config.yaml`;
- explicit initialization and safety decisions;
- reviewed requirement and normalization artifacts;
- one conforming manual Gherkin test;
- RF-to-test traceability;
- a PR summary and validation commands.

Run:

```bash
npm run test:e2e-manual-example
```

The runner packs the current package, installs that tarball into a temporary copy of the example, initializes the
framework, proves existing example artifacts were not overwritten, then runs:

```bash
qa-flowkit doctor --strict
qa-flowkit validate-target
```

This is stricter than copying the source `.qa-ai/` folder directly because it exercises the public package boundary.

## Automated references

Run the Playwright reference with:

```bash
npm run test:e2e-playwright
npm run test:e2e-playwright -- --runtime
```

Run the Karate reference with:

```bash
npm run test:e2e-karate
npm run test:e2e-karate -- --runtime
```

Run the mobile-oriented reference with:

```bash
npm run test:e2e-mobile
npm run test:e2e-mobile -- --runtime
```

For the mobile reference, `--runtime` executes the local Karate API suite. Maestro flows are structurally validated
in ordinary CI; launching an application remains a separately recorded emulator/device-host check.

## Internal regression fixtures

The repository also keeps narrower fixtures for validator development:

- [`test/fixtures/golden-target/`](../../test/fixtures/golden-target/): compact manual target used by the historical
  `golden target validate-target` check.
- [`test/fixtures/quick-path/`](../../test/fixtures/quick-path/): expected artifacts and an intentional validation
  failure for the phase-by-phase quick E2E.
- [`test/fixtures/karate-target/`](../../test/fixtures/karate-target/): design and executable Karate layout.

Fixtures may omit explanatory material. Public examples must be understandable without reading test code.

## Compatibility policy

- Maintained examples track the current repository source and the package release channel documented in
  [stability-policy.md](stability-policy.md).
- Every maintained example must install from a packed package and pass strict target validation in CI.
- CI coverage must state the tested operating systems and Node.js versions.
- An example is labeled `In validation` until its named hosted CI checks are green and reviewed.
- Mobile support must distinguish structural validation from actual emulator or device execution.
- Compatibility claims come from named CI checks, not only generated adapter or preset files.

The `Example compatibility` workflow runs every Monday against `qa-flowkit@beta` on Ubuntu and Windows with Node.js
20 and 22. It can also be dispatched manually for `rc` or `latest`. Those channels are not added to the schedule
until their lifecycle phase begins, avoiding false support claims for unpublished channels.

Run the same compatibility inventory against the current source package:

```bash
npm run test:example-compatibility
```

Run it against an allowed published channel or exact version:

```bash
node .github/scripts/run-example-channel-validation.mjs --package-spec qa-flowkit@beta
node .github/scripts/run-example-channel-validation.mjs --package-spec qa-flowkit@1.0.0-rc.1
```

The runner accepts only `local`, the named `beta`, `rc` and `latest` channels, or an exact version. Each hosted
matrix job uploads a JSON report with the installed version, platform, Node.js version, example and duration.

## Maintenance and triage

The release engineer owns version-channel compatibility. The QA automation engineer owns example behavior and E2E
fixtures. Documentation failures are owned by the technical writer.

When an example fails:

1. reproduce its named local command;
2. classify package, framework, example-runtime or documentation drift;
3. open or link a task with an owner and affected release channel;
4. do not weaken strict validation to make the example pass;
5. update the example, its narrative and its expected evidence together.

Ownership:

- Release engineer: npm-channel, workflow and platform failures.
- QA automation engineer: example behavior, framework runtime and validator failures.
- CLI/framework engineer: install, init, update or target-validation regressions.
- Technical writer: inventory, walkthrough and compatibility-claim drift.

Scheduled failures should be triaged within two working days. A channel regression blocks promotion of that channel;
it does not justify weakening strict validation or silently downgrading the compatibility table.

Contributions should use the same RF throughout requirement, test design, feature, traceability and PR artifacts.
Never commit credentials, private URLs, personal data or live external-system identifiers.

## Target-repository CI template

```yaml
name: QA FlowKit Validate

on:
  push:
    branches: [main]
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: '20'
      - name: Validate target repository
        run: npx --yes qa-flowkit@beta validate-target
```

Use the release channel defined by your compatibility policy; do not silently switch examples between `beta`, `rc`
and `latest`.
