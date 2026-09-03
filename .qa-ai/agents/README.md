# QA AI Agent Loading Protocol

Agent instructions are internal English contracts. User-facing communication uses `project.interfaceLanguage`; Gherkin
uses `gherkin.language`.

## Semantic guidance contract

Every guidance Markdown file under `.qa-ai/agents/` is registered in `.qa-ai/contracts/agent-guidance.v1.json`. This
contract declares stable metadata (category, phase IDs, permissions, artifact policy, canonical vocabularies, config keys
and auxiliary artifacts) without duplicating workflow order. The schema is at `agent-guidance.v1.schema.json`.

Validate:

```bash
node .qa-ai/scripts/validate-agent-guidance.mjs
```

When adding, renaming or removing a guidance file, update the manifest and add category-appropriate tests before merging.
A missing or unregistered file fails CI.

The four `canonicalSources` values are fixed V1 identities, not configurable aliases. They must use normalized POSIX
repository-relative paths, resolve to their expected framework surfaces and exist as regular files. Symlink and
Windows-junction escapes are rejected. Both the standalone validator and `doctor.mjs` enforce the same complete,
redacted guidance-integrity result, including for parseable but structurally invalid JSON.

## Canonical workflow

`.qa-ai/contracts/workflow.v1.json` is the only source of truth for phase order, inclusion, dependencies, approvals,
permissions, outputs and validators. Never maintain a separate numbered phase sequence in agents or rules.

For a workflow run:

1. Read `AGENTS.md` and `.qa-ai/qa-ai.config.yaml`.
2. Stop and offer `qa-flowkit migrate` if root config or legacy artifact roots are detected.
3. Read `.qa-ai/contracts/workflow.v1.json` and resolve `trackOrder[project.qaTrack]`.
4. Read `.qa-ai/rules/README.md` and relevant `*.rules.md` files.
5. Read the phase `guidance` files declared by the contract.
6. Read configured knowledge artifacts when enabled.
7. Resolve specialists at runtime. Use `specialists/active.md` only as a generated cache for Markdown-only hosts.
8. Consume the harness phase context packet when available.

## Agent categories

### Contract phase agents

Every `*-agent.md` in this directory represents a workflow phase or an executable/reactive actor. Contract phases map
to agents through each phase's `guidance` array. The contract-to-index consistency test must fail when a referenced
agent is missing.

### Governed sub-step agents

- `test-management-diff-agent.md`
- `test-management-apply-agent.md`
- `test-healing-agent.md`

These act only when their contract mode and approval gates permit them.

### Reactive agents

- `defect-report-agent.md`
- `test-impact-agent.md`

They are loaded on an explicit request or applicable event and do not alter track order.

### Specialists

Specialists live under `specialists/available/`. Their filenames describe capabilities and do not use the `-agent`
suffix. Runtime routing is defined by `project-config.mjs`, `test-strategy-router.mjs` and the specialist routing matrix.
Framework/tool specialists and the generic test-design specialist can be activated from config; strategy specialists
are loaded from NFR attributes, requirement signals or explicit user instructions.

Related capability families include UI, API, mobile, test management, accessibility, functional/advanced security,
privacy, AI evaluation, performance design/execution, scalability, resilience, observability, data, contracts,
compatibility, localization, analytics and exploratory testing.

For observability, see `.qa-ai/docs/observability-guide.md` which clarifies the relationship between the
observability-testing specialist (pre-release validation) and the production-observability-intake agent (post-release learning).

## Shared specialist contract

All specialists inherit `.qa-ai/rules/specialist-common.rules.md`. Specialist files should contain only distinctive
activation signals, domain reasoning, outputs and domain-specific safety boundaries. Do not duplicate global language,
approval, traceability, secret-handling or handoff instructions.

## Artifact policy

Every guidance entry declares one of:

| Policy                       | Meaning                                          |
| ---------------------------- | ------------------------------------------------ |
| `none`                       | No artifact output                               |
| `contractual-only`           | Writes only the active phase's declared output   |
| `contractual-with-auxiliary` | May create declared optional auxiliary artifacts |
| `generated-cache`            | Produced only by framework scripts               |

Auxiliary artifacts are optional, conditional, linked to a primary contractual artifact, and non-gating in v1. Each
auxiliary artifact in the manifest includes a creation condition, a linked primary artifact and a canonical evidence
type. Specialists that declare auxiliary artifacts must reflect the same policy in their Markdown guidance.

## Generated active cache

`specialists/active.md` is generated by init/config operations for hosts that can only load Markdown. It is not the
runtime source of truth. If missing or stale, regenerate it and continue from runtime routing; source-repository checks
may validate the catalog without requiring a generated cache. Never edit `active.md` manually.

## Stable references

Refer to workflow phases by contract ID, never by a hardcoded number. User-facing progress numbering is calculated from
the resolved track at runtime.

## Phase-scoped permissions

The agent-guidance contract supports two permission models:

- **Aggregate `permissions` object** — a single `{ localWrite, externalRead, externalWrite }` block that applies
  uniformly to every phase the agent is mapped to. The contract rejects this model when the mapped workflow phases have
  different permission levels; use `phasePermissions` instead.

- **`phasePermissions` map** — a per-phase `{ <phaseId>: { localWrite, externalRead, externalWrite, approvalGates } }`
  object. This is required when a single agent serves multiple workflow phases with different permission rules. Every
  declared phase must exist in the workflow contract; every `externalWrite: true` phase must list at least one approval
  gate that matches the workflow contract for that phase.

`validate-agent-guidance.mjs` enforces these contracts at validation time. Additional runtime gates for governed
sub-step agents are declared through `allowlistApprovalGates` in the guidance manifest.

## Contributor safety checks

When adding or changing agent guidance files, the following checks run automatically in CI through
`validate-agent-guidance.mjs` and `npm run test:agent-guidance`:

- **Path safety**: every guidance and auxiliary path must stay under `.qa-ai/agents/` or `.qa-ai/output/` respectively;
  traversal (`..`), absolute paths, UNC paths and Windows drive letters are rejected (`AGENT_UNSAFE_PATH`).

- **Read-only mutation guard**: guidance with no governed write permission is scanned for instructions that claim direct
  mutation of evaluated inputs. The scan covers destructive action verbs and protected target categories; any match
  produces `AGENT_READONLY_MUTATION`.

- **Inventory integrity**: every `.md` file under `.qa-ai/agents/` must be registered in the guidance contract, and
  every registered file must exist on disk (`AGENT_UNREGISTERED_FILE` / `AGENT_MISSING_FILE`).

- **Phase-mapping consistency**: the `phaseIds` declared in the guidance entry must match the phases that reference
  this file in the workflow contract (`AGENT_PHASE_MAPPING_MISMATCH`).

- **Approval-gate validity**: every gate declared in `allowlistApprovalGates` or `phasePermissions.<phase>.approvalGates`
  must exist in the workflow contract for the corresponding phase.

## Adding or changing guidance

1. Create or edit the Markdown file under `.qa-ai/agents/`.
2. Register it in `.qa-ai/contracts/agent-guidance.v1.json` with its category and metadata.
3. Add category-appropriate tests (inventory, structure, config keys, permissions, routing).
4. Run `node .qa-ai/scripts/validate-agent-guidance.mjs`.
5. Run `npm run test:agent-guidance` when available.
6. For new specialists, add positive and negative activation tests to the routing suite.
