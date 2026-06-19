# Claude Code Plugin

QA FlowKit ships a generated Claude Code plugin for teams that want the Claude host surface
versioned independently from target-repository initialization.

The plugin is a host integration. It provides namespaced skills, the workflow orchestrator agent and
hook configuration for Claude Code. The repository framework remains the substrate: target
repositories still need `.qa-ai/`, `qa-ai.config.yaml`, validators, rules and workflow state from
`npx qa-flowkit init`.

## Install

Add this repository as a Claude plugin marketplace:

```bash
claude marketplace add warante/QA_FlowKit
```

Then install the `qa-flowkit` plugin from that marketplace using Claude Code's plugin UI or CLI.

The generated marketplace manifest lives at:

```text
.claude-plugin/marketplace.json
```

The generated plugin lives at:

```text
plugin/
```

## Use With A Target Repository

Inside the QA or automation repository, initialize the framework first:

```bash
npx qa-flowkit init
```

The plugin skills complement that installed framework. Commands that need repository state should
read the target repo's `.qa-ai/` files and run the local validators. When `.qa-ai/` is absent, the
plugin hooks print a clear message telling the user to run `npx qa-flowkit init`.

Skills are namespaced as QA FlowKit plugin skills, for example:

```text
/qa-flowkit:qa-init
/qa-flowkit:qa-status
/qa-flowkit:qa-gate
```

The generated skill bodies come from `.qa-ai/adapters/claude/commands/`, so adapter behavior and
plugin behavior stay aligned.

## Update Story

The plugin is generated from the Claude adapter by:

```bash
node .github/scripts/build-claude-plugin.mjs
```

CI checks drift with:

```bash
node .github/scripts/build-claude-plugin.mjs --check
```

For maintainers:

- edit `.qa-ai/adapters/claude/` first;
- run the builder;
- commit `plugin/` and `.claude-plugin/marketplace.json`;
- run the normal source-repository validation before opening a PR.

The npm package remains the source of the target framework. `plugin/` and `.claude-plugin/` are
excluded from npm pack output and are validated separately in CI.

## Relationship To Adapters

Claude Code users can choose either path:

- plugin install for versioned, namespaced Claude skills and hooks;
- repo-local adapter generation through `npx qa-flowkit init --adapters claude` or
  `node .qa-ai/scripts/sync-agent-adapters.mjs --adapters claude`.

Other hosts keep receiving the same capabilities through their adapters. The plugin does not make
Claude the only supported host.
