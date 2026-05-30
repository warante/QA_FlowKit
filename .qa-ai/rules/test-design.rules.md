# Test Design Rules

**Enforced by:** validate-test-design.mjs

Apply during system-level and per-RF test design before final Gherkin generation.

## Sequence by track

- On `standard` and `enterprise` tracks, complete **system test design** first (`qa-ai-output/test-design-system.md`) before per-RF proposals and `.feature` files.
- On `quick` track, system test design may be skipped unless the user requests it.

## Per-RF design

- Create or update `qa-ai-output/test-design-proposal.md` (or per-RF proposal files if the project uses them) before generating `.feature` files.
- One official RF ID per design pass unless the user explicitly combines RFs.
- Search existing `.feature` files and automation tests to avoid duplicate coverage.
- Cover positive, negative and edge cases called out in normalized requirements; call out gaps explicitly.

## Relationship to other rules

- Gherkin structure and tags: [gherkin.rules.md](gherkin.rules.md).
- RF ID gate and traceability matrix: [requirements.rules.md](requirements.rules.md).
- Test management proposals: [test-management.rules.md](test-management.rules.md).

## Validation

```bash
node .qa-ai/scripts/validate-test-design.mjs
node .qa-ai/scripts/validate-features.mjs
```

Run after updating proposals and after generating or changing `.feature` files.
