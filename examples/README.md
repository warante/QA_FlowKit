# QA FlowKit Examples

These examples are small target repositories that can be installed and validated without credentials or external
services.

| Example                                                    | Track      | Status        | Validation command                |
| ---------------------------------------------------------- | ---------- | ------------- | --------------------------------- |
| [Manual-only](manual-only/README.md)                       | `quick`    | Maintained    | `npm run test:e2e-manual-example` |
| [Playwright UI + API](playwright-full/README.md)           | `standard` | In validation | `npm run test:e2e-playwright`     |
| [Karate full](karate-full/README.md)                       | `standard` | In validation | `npm run test:e2e-karate`         |
| [Maestro + Karate](maestro-karate-mobile/README.md)        | `standard` | In validation | `npm run test:e2e-mobile`         |
| [NFR coverage reference](nfr-coverage-reference/README.md) | Docs only  | Maintained    | (see README — no packed install)  |

The examples intentionally do not include `.qa-ai/`. Their validation runners install the locally packed
`qa-flowkit` package and run `init`, matching the public installation boundary.

## Channel compatibility

| Package source | Automation                                                  | Current policy                      |
| -------------- | ----------------------------------------------------------- | ----------------------------------- |
| Local tarball  | Every `validate:oss-extraction` run                         | Required for all four examples      |
| `@rc`          | Weekly Ubuntu/Windows, Node 20/22; manual workflow dispatch | Current published adopter channel   |
| `@beta`        | Legacy migration testing only                               | Previous `0.5.x-beta.y` line        |
| `@latest`      | Manual workflow dispatch                                    | Scheduled only after stable `1.0.0` |

The inventory is [`compatibility.json`](compatibility.json). Hosted runs use the
[`Example compatibility`](../.github/workflows/example-compatibility.yml) workflow and retain a JSON report per
matrix job.

See [example maintenance](../docs/qa-ai/example-repos.md) for compatibility and contribution rules.
