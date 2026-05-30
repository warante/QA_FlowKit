# Test Design Dual-Mode

Inspired by [BMAD Method TEA `*test-design`](https://docs.bmad-method.org/explanation/tea/overview/), QA FlowKit separates **system-level** test design from **per-RF (epic) test design** before Gherkin `.feature` generation.

## Modes

| Mode          | Artifact                               | When                                         | Track                    |
| ------------- | -------------------------------------- | -------------------------------------------- | ------------------------ |
| System        | `qa-ai-output/test-design-system.md`   | After normalization, before per-RF proposals | `standard`, `enterprise` |
| Per RF / epic | `qa-ai-output/test-design-proposal.md` | After system design (or directly on `quick`) | All tracks               |

Optional future naming: `qa-ai-output/test-design-rf-RF-101.md` for large programs. The default template path remains `test-design-proposal.md` for one active RF batch.

## Standard / enterprise sequence

```text
normalized-requirements.md
  -> test-design-system.md
  -> test-design-proposal.md (approval)
  -> features/*.feature
```

## Quick track

`quick` skips the system phase. The Gherkin agent may still produce `test-design-proposal.md` and `.feature` files in one pass.

## Configuration

In `qa-ai.config.yaml`:

```yaml
testDesign:
  systemPath: qa-ai-output/test-design-system.md
  proposalPath: qa-ai-output/test-design-proposal.md
```

Generate starter files:

```bash
node .qa-ai/scripts/init.mjs --with-doc-templates
```

## Agents and workflows

| Resource                                     | Purpose                      |
| -------------------------------------------- | ---------------------------- |
| `.qa-ai/agents/test-design-system-agent.md`  | System-wide strategy         |
| `.qa-ai/workflows/test-design-system.md`     | System design steps          |
| `.qa-ai/agents/gherkin-test-design-agent.md` | Per-RF proposal + Gherkin    |
| `.qa-ai/workflows/test-design.md`            | Per-RF proposal and features |

## Validation

```bash
node .qa-ai/scripts/validate-test-design.mjs
npm run qa:validate-test-design
```

Options:

- `--allow-missing` — pass when files are not created yet
- `--require-rf-id` — fail per-RF proposal without an `RF-###` reference

## Guided help

`qa-help` lists `test-design-system` and `test-design-rf` phases on `standard` and `enterprise` tracks. Run:

```bash
node .qa-ai/scripts/qa-help.mjs
```

## See also

- [QA help and tracks](qa-help.md)
- [Workflow](workflow.md)
