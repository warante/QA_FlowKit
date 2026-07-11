# Full Flow

Run this workflow when a user asks for the complete requirements-to-PR QA flow.

## QA track

Read `project.qaTrack` from `.qa-ai/qa-ai.config.yaml`:

| Track        | Steps to run                                                |
| ------------ | ----------------------------------------------------------- |
| `quick`      | Resolve `trackOrder.quick` from the workflow contract.      |
| `standard`   | Resolve `trackOrder.standard` from the workflow contract.   |
| `enterprise` | Resolve `trackOrder.enterprise` from the workflow contract. |

When unsure which track applies, run `node .qa-ai/scripts/qa-help.mjs`.

## Required inputs

- Requirement source: configured source, markdown RF/PRD or pasted requirement text.
- Official RF ID before implementation, external synchronization, execution or final release evidence. Draft Gherkin
  may use `RF-PENDING*` with `@wip`.
- Target test management project/suite before coverage or sync planning when a tool is configured and track is not `quick`.

## Sequence

1. Read `AGENTS.md`, `.qa-ai/qa-ai.config.yaml`, `.qa-ai/contracts/workflow.v1.json`, `.qa-ai/rules/` and this workflow.
2. Resolve the selected track order from the contract.
3. Execute each included phase by stable ID using its declared guidance, inputs, outputs, approvals and validators.
4. Build implementation context packets instead of making implementation agents reread all upstream artifacts.
5. Report phase positions dynamically from the resolved order; never maintain a duplicate numbered sequence here.

The complete contract covers context/external intake, requirements, risk, system/per-RF design, Gherkin quality,
traceability, proposal/governed test-management sync, data, environment readiness, feasibility, UI/mobile/API
implementation, execution, result analysis, defect triage, healing, issue drafts, PR, enterprise release gate,
production observability intake and learning loop.

After each major step, run `node .qa-ai/scripts/qa-help.mjs` (or `/qa-help`) to confirm the next phase.

**Enterprise finale:**

```bash
node .qa-ai/scripts/validate-target.mjs
node .qa-ai/scripts/validate-release-gate.mjs
```

## Safety gates

- No external writes to configured external tools in the MVP.
- Do not overwrite existing files unless the user approved it or `--force` behavior is explicitly requested.
- Do not modify existing tests without approval.
- Never store credentials or secrets in repository files.
