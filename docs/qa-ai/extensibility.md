# Extensibility

How to extend QA FlowKit in a target repository or when contributing to the framework source.

## Add a specialist

1. Copy a template from `.qa-ai/agents/specialists/available/` to `.qa-ai/agents/specialists/active.md` (or append entries per `agents/README.md`).
2. Enable the specialist in `qa-ai.config.yaml` under `agents.specialistMode` / related keys.
3. Run `node .qa-ai/scripts/validate-active-specialists.mjs`.

Specialists add prompts and checklists; they do not replace phase agents.

## Add a rule

1. Create `.qa-ai/rules/<name>.rules.md` with an **Enforced by** line (script path or `prompt-only`).
2. Register the file in `.qa-ai/rules/README.md` (read order + rules ↔ validators table).
3. Update `doctor.mjs` required rules list if the rule is mandatory for all targets.
4. Add or extend a validator script when the rule must be machine-checked.

## Add a built-in validator

1. Implement under `.qa-ai/scripts/` using shared helpers in `.qa-ai/scripts/lib/`.
2. Wire into `validate-target.mjs` when it belongs in the target gate.
3. Add cases to `.qa-ai/scripts/test-validators.mjs`.
4. Document flags in [troubleshooting.md](troubleshooting.md).

## Add a target-repo custom validator

1. Create a repo-local Node.js script, for example `qa-custom/validate-naming.example.mjs`.
2. Make it support `--self-test --json` and normal `--json` execution.
3. Declare it in `qa-ai.config.yaml`:

```yaml
validators:
  custom:
    - id: naming-check
      script: qa-custom/validate-naming.example.mjs
      phases:
        - gherkin
      blocking: false
```

`doctor` rejects absolute paths, paths outside the repository, duplicate ids, built-in id shadowing and unknown phases.
`blocking: false` turns failures into harness warnings and `validate-target --json` entries with status `warning`.

## Add or change an agent adapter

1. Edit templates only under `.qa-ai/adapters/<tool>/`.
2. Run `node .qa-ai/scripts/sync-agent-adapters.mjs --adapters <names> --force`.
3. CI runs `.github/scripts/verify-adapter-parity.mjs` for Claude and OpenCode root copies.

See [CONTRIBUTING.md](../../CONTRIBUTING.md) § Agent adapters.

## Current limits

- No MCP servers or live external tool writes in the MVP (proposal-first drafts only).
- No npm plugin system for third-party validators.
- Gherkin validation uses a lightweight in-repo parser (`lib/gherkin-validate.mjs`), not the full Cucumber stack.

Future work: MCP integrations and richer parsers are tracked in [ROADMAP.md](../../ROADMAP.md).
