# Test Management Rules

**Enforced by:** validate-sync-plan.mjs, lib/test-management-mapping.mjs

Apply when analyzing coverage or drafting sync plans for TestRail, Zephyr, Xray or other tools configured in `tools.testManagement`.

## Scope (MVP)

- Read and analyze local exports, mapping files and repository artifacts only.
- Do **not** create, update, delete or archive cases in external test management systems without explicit user approval and tooling outside the MVP scripts.
- Do not state that cases were synced to TestRail or similar unless the user confirms an external action.

## Before proposing cases

- Ask for target project, suite or folder when the configuration does not specify them.
- Search existing mapped cases and repository `.feature` files for duplicates and overlaps.
- Inform the user before proposing new sections or folders.

## Artifacts

- Coverage analysis: `qa-ai-output/testrail-coverage-analysis.md` (or path from config).
- Sync plan: `qa-ai-output/testrail-sync-plan.md` with proposal-first rows and approval status columns.
- Mapping file: use `.qa-ai/templates/test-management-mapping.template.json` shape when maintaining local mapping.

## Writes

- Create new case proposals only after user approval.
- Update or delete external cases only after explicit approval and only when configuration allows it.

## Validation

```bash
node .qa-ai/scripts/validate-sync-plan.mjs
```
