# Example Repositories

Reference layouts that demonstrate QA FlowKit in a real repository. Each layout should pass `npx qa-flowkit validate-target` in CI.

## In-repo reference (golden target)

Instead of a separate public example repository (TASK-027 remote), QA FlowKit ships a **versioned mini target** under [`test/fixtures/golden-target/`](../../test/fixtures/golden-target/).

| Item     | Detail                                                                                                                                                                                    |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose  | Reference target layout for `quick` track / manual-oriented workflow                                                                                                                      |
| CI       | [`.github/scripts/run-golden-target-validation.mjs`](../../.github/scripts/run-golden-target-validation.mjs) copies the fixture and runs `validate-target` without permissive allow flags |
| Contents | `qa-ai.config.yaml`, minimal `qa-ai-output/` artifacts, conforming `.feature` files, specialist stub                                                                                      |

Use this folder as the canonical “what a passing target looks like” when writing docs or debugging validators.

**Karate full:** [`test/fixtures/karate-target/`](../../test/fixtures/karate-target/) — API + UI Karate with dual validators (`validate-features` + `validate-karate-features`). CI: `run-karate-target-validation.mjs`.

```bash
# From QA FlowKit source root (after npm ci)
node .github/scripts/run-golden-target-validation.mjs
```

## Public examples (planned)

| Example                      | Status                              | Repository   |
| ---------------------------- | ----------------------------------- | ------------ |
| Manual-only                  | Superseded by golden fixture for CI | In-repo only |
| WebdriverIO + Playwright API | Planned                             | TBD          |

If you publish a public target repository, open an issue at [warante/QA_FlowKit](https://github.com/warante/QA_FlowKit/issues) and we can list it here.

## CI workflow template (target repos)

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

See [stability-policy.md](stability-policy.md) for dist-tag guidance.
