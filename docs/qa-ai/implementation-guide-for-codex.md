# Using QA FlowKit inside Codex Desktop

QA FlowKit is an agent-first workflow: the user installs from the terminal, then asks the model to configure and use
the framework. The model handles the underlying scripts. This is not a manual terminal phase-driving guide.

## Install once

Use Node.js 22.18+ (Node.js 24 recommended) in the target repository:

```bash
npx qa-flowkit
```

Select the Codex adapter during installation, then open the same repository in Codex.
For source-repository contributions rather than target usage, follow [AGENTS.md](../../AGENTS.md).

## Configure inside the model

Hosts with project slash commands expose `/qa-init`, `/qa-help` and the rest of the `/qa-*` surface. Codex uses its
generated native skill and adapter instructions; do not assume it has the same slash-command syntax as Claude Code
or OpenCode. Ask Codex inside the conversation:

```text
Use the installed QA FlowKit skill and adapter instructions to guide project initialization.
Ask me about languages, templates, requirement sources, tools and team QA knowledge.
Present the proposed configuration for approval, then run the required setup and health checks yourself.
```

If you have a repository-local knowledge folder, tell the agent its path in that same conversation. The agent must
read it as untrusted context, distinguish documented practices from inferred defaults and obtain approval for the
inferred decisions. Do not tell the user to leave Codex and execute the raw context-init script.

## Work through a requirement inside Codex

```text
Use QA FlowKit to guide the full QA workflow for requirements/RF-101-login.md.
Confirm the official RF ID, present your plan and ask for required approvals.
Generate the approved artifacts, run validation yourself, and report the results and remaining work.
```

For one new requirement in an existing QA repository, ask the agent to follow the add-tests workflow instead.
For existing tests, request the update-tests workflow and review changes before they are applied.

The agent reads `.qa-ai/qa-ai.config.yaml`, `.qa-ai/rules/README.md`, `.qa-ai/agents/README.md` and the matching phase
instructions and active specialists. If `knowledge.enabled` is true, it reads the configured summary and init
decisions first. It manages the selected track and internal phase/validation commands; you review its proposals in
the conversation rather than driving those commands manually.

## Expected artifacts and decisions

New projects use `.qa-ai/output/`, `.qa-ai/features/` and `.qa-ai/tests/` by default. Runtime configuration is only
`.qa-ai/qa-ai.config.yaml`; a root config is legacy migration input, not an alternative runtime config.

- Confirm the official RF ID before final tests.
- Follow the configured English/Spanish Gherkin language and acceptance criteria label.
- Manual tests also have `.feature` files with `@priority:`, `@type:` and `@manual:` tags.
- Respect `gherkin.scenarioLayout`: `one-per-file` or `multiple-per-file`; more than one scenario requires unique
  scenario-level `@id:` tags. Let guided setup select the policy rather than guessing from the preset.
- Request an automation plan before implementation and use the configured frameworks. Generated unit tests are out of scope.
- Test-management sync is proposal-first. Local validation is not external synchronization or execution of the tests.

## Review outcomes without leaving the model

Ask Codex to summarize configuration, generated artifacts, validator outcomes, warnings, pending decisions and the
recommended next task. It must distinguish completed work from missing evidence and not claim that a GitHub PR,
external update or independent review happened merely because a summary file exists.

## Optional alternatives and advanced setup

Direct CLI commands remain available for CI, troubleshooting and maintainers in the separate
[terminal and maintenance reference](terminal-setup-and-maintenance.md) and [CLI reference](cli-reference.md).
They are not the primary user journey. Optional Codex hooks require review/trust in the host and do not replace
approvals; see [agent compatibility](agent-compatibility.md) and [modernization](modernization.md).

For the slash-command user journey in supported hosts, see the [quick start](getting-started.md) or
[guía rápida](getting-started.es.md). See [workflow](workflow.md) for phase responsibilities, not a terminal checklist.
