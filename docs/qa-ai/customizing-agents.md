# Customizing Agents

QA FlowKit agents are Markdown role instructions. You can adapt them to your team, but keep the shared safety rules and validation scripts as the source of truth.

## When to customize

Customize agents when your team needs stable behavior that should repeat across QA workflows:

- Requirement intake should use your team's RF naming conventions.
- Gherkin design should follow team vocabulary or scenario style.
- Automation planning should reflect your framework patterns.
- Test management planning should match your section, suite or ownership model.
- PR summaries should match your reviewer expectations.

Use `qa-ai.config.yaml` for project-specific paths, frameworks, languages and tools. Use `.qa-ai/rules/` for rules that must apply to every agent. Use agent files for phase-specific working style and output expectations.

## Agent layers

| Layer                 | Location                                             | Use for                                                                |
| --------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------- |
| Global agent protocol | `.qa-ai/agents/README.md`                            | Load order and phase mapping                                           |
| Shared rules          | `.qa-ai/rules/README.md` + `.qa-ai/rules/*.rules.md` | Non-negotiable behavior across agents (see rules index for load order) |
| Phase agents          | `.qa-ai/agents/*-agent.md`                           | Phase-specific instructions and outputs                                |
| Specialists           | `.qa-ai/agents/specialists/available/*.md`           | Tool/framework-specific guidance                                       |
| Active specialists    | `.qa-ai/agents/specialists/active.md`                | Generated list of specialists for the current config                   |
| Adapter commands      | `.qa-ai/adapters/*` and generated root tool folders  | Tool-specific slash commands and onboarding                            |

## Safe customization workflow

1. Run `node .qa-ai/scripts/doctor.mjs` before changing agent behavior.
2. Read `.qa-ai/rules/` and `.qa-ai/agents/README.md`.
3. Identify the smallest layer that should change.
4. Edit phase agents or specialist files first; avoid duplicating global rules.
5. If a rule must apply everywhere, update `.qa-ai/rules/` and docs together.
6. Run `npm run validate:oss-extraction` in the framework source repo, or the relevant validators in a target repo.
7. Open a PR with examples of changed agent outputs when behavior changes.

## What to change in phase agents

Phase agents are best for workflow-specific instructions:

- Required input questions.
- Output headings and artifact shape.
- Decision criteria for that phase.
- Examples of good and bad outputs.
- Escalation points where the agent must ask the user.

Examples:

- Add a required "Risk notes" section to `.qa-ai/agents/automation-feasibility-agent.md`.
- Tell `.qa-ai/agents/gherkin-test-design-agent.md` to prefer business-domain names over UI control names.
- Require `.qa-ai/agents/pr-agent.md` to include traceability IDs in every PR summary.
- Extend `.qa-ai/agents/requirements-normalization-agent.md` to emit atomic `Criterion ID` rows when your team adopts
  semantic coverage gates (see [workflow.md](workflow.md#semantic-criterion-coverage-functional)).

Avoid putting secrets, environment names, private URLs or credentials in agent files. Put team-specific private context in a target repository knowledge folder and reference it through `--qa-context`.

## Semantic coverage contract

When customizing normalization or test-design agents, keep the shared artifact contract aligned with validators:

- **Normalization agent** — one observable outcome per `Criterion ID`; use `pending-decision` instead of guessing when
  source thresholds or outcomes conflict.
- **Test design agents / specialists** — map each `ready` criterion to at least one proposed test; put design techniques
  in `Technique` and evidence kinds (`feature`, `test-plan`, `technical-review`, etc.) in `Evidence type`, never the reverse.
- **Gherkin quality agent** — evaluate `source-criterion-alignment` using normalized criteria and proposal rows as inputs,
  not only the `.feature` file in isolation.

Config flags:

```yaml
testDesign:
  coverage:
    mode: strict
    requireCriterionCoverage: true
  quality:
    mode: gate
    minDimensionsPassed: 8
```

After agent changes, run `node .qa-ai/scripts/validate-test-coverage.mjs` and
`node .qa-ai/scripts/validate-traceability.mjs` against a fixture or sample RF. See
[troubleshooting.md](troubleshooting.md#semantic-criterion-coverage-validation) for common errors.

## What to change in specialists

Specialists are best for framework and tool conventions:

- Page object conventions.
- API fixture patterns.
- Test data setup style.
- TestRail or Jira field expectations.
- Browser/device/cloud provider practices.
- Non-functional quality attributes (availability, scalability, usability, compatibility, maintainability, etc.) via
  on-demand specialists under `.qa-ai/agents/specialists/available/` — loaded during test design when
  NFR attributes, RF/CA keyword signals or explicit user instructions apply. Standard presets enable
  `testDesign.strategyRouting.mode: advisory` to recommend specialists without blocking validators. Use `strict` only when
  you need enforced `## Strategy routing decisions` rows for configured `criticalSignals`.
  `normalized-requirements.md` lists matching source NFR attributes even if not in `active.md`.

Add or update specialist files under:

```text
.qa-ai/agents/specialists/available/
```

Then make sure `qa-ai.config.yaml` points to matching tools/frameworks and regenerate active specialists:

```bash
node .qa-ai/scripts/init.mjs --force
```

or import a profile:

```bash
node .qa-ai/scripts/config.mjs --import .qa-ai/config-profiles/team.yaml --force
```

Validate the result:

```bash
node .qa-ai/scripts/validate-active-specialists.mjs
```

## Adding a new specialist

1. Create `.qa-ai/agents/specialists/available/<id>.md`.
2. Add the specialist to `specialistCatalog` in `.qa-ai/scripts/lib/project-config.mjs`.
3. Include aliases for the config values users are likely to enter.
4. Add docs if the specialist introduces a new supported framework.
5. For strategy routing families, also update [specialist-routing-matrix.md](../../docs/qa-ai/specialist-routing-matrix.md) and `test-strategy-router.mjs`.
6. Run:

```bash
npm run validate:oss-extraction
```

Specialist IDs should be lowercase kebab-case, for example `playwright-ui`, `rest-assured` or `mobile-webview`.

## Adapter command customization

Adapter templates live under `.qa-ai/adapters/`. Generated tool files live in root folders such as `.claude/`, `.opencode/` or `.codex/`.

Prefer editing adapter templates first, then regenerate adapters:

```bash
node .qa-ai/scripts/sync-agent-adapters.mjs --adapters claude,opencode --force
```

Only edit generated root adapter files directly when you are customizing a single target repository and do not want the change to become part of the portable framework.

### Slash Command Rules and Conventions

When customizing or creating new slash commands for Claude Code or OpenCode, adhere to these rules:

1. **Allowed Tools Restriction (`allowed-tools`)**:
   Always specify the `allowed-tools` array in the command's frontmatter.
   - For **read-only commands** (e.g. validating features, checking coverage, status reports), exclude any tool that allows file modification (such as `write_file`, `edit_file`, `write_to_file`, `replace_file_content`, etc.). Only allow read tools and command runners: `[view_file, list_dir, grep_search, glob, run_command]`.
   - For **modifying commands** (e.g. init, add tests, clean), include modifying tools: `[view_file, write_file, edit_file, list_dir, grep_search, glob, run_command]`.

2. **Human-Only Gates (`disable-model-invocation`)**:
   Commands that record approvals or make final gate decisions (such as `/qa-gate`) must include `disable-model-invocation: true` in their frontmatter. This prevents agents from invoking the gate command autonomously without human review.

3. **Bilingual Descriptions**:
   Ensure command descriptions are bilingual and match the pattern `English description / Descripción en español`.

4. **Live-State Context Injection**:
   Use command-injection syntax `! ` + backtick + `command` + backtick (e.g. `! ` + `` `node script.js` ``) at the top of the command file (directly below the frontmatter) to inject context (e.g., status or next steps) when the command is loaded.

## Keeping customizations portable

Keep portable framework changes in `.qa-ai/`. Keep target-repository-only knowledge in a repo-local folder such as:

```text
qa-ai-knowledge/
```

Then initialize with:

```bash
node .qa-ai/scripts/init.mjs --qa-context qa-ai-knowledge
```

Agents should summarize approved team context into:

```text
.qa-ai/output/qa-knowledge-summary.md
.qa-ai/output/qa-init-decisions.md
```

This keeps the framework open-source ready while still allowing private teams to adapt behavior.

## Review checklist

Before merging agent customizations:

- [ ] No secrets, credentials, private URLs or personal data were added.
- [ ] Shared rules were updated only when behavior must apply globally.
- [ ] Phase-agent changes include expected output shape.
- [ ] Specialist changes match `qa-ai.config.yaml` aliases.
- [ ] Adapter changes were made in templates when they should be portable.
- [ ] `npm run validate:oss-extraction` passes.
