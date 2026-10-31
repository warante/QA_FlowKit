# Getting Started

Language: **English** | [Español](getting-started.es.md)

**Install from the terminal; configure and use QA FlowKit inside your model's CLI with `/qa-*` commands.**
The agent runs the underlying scripts for you. You do not need to leave the model session to configure context,
advance workflow phases or run the usual checks.

## 5-minute agent-first start

### 1. Install — terminal only

Use Node.js 22.18+ (Node.js 24 recommended). From the repository where you want QA FlowKit:

```bash
npx qa-flowkit
```

Choose the adapter for your coding agent when prompted. During the RC line, use `npx qa-flowkit@rc` if you need that
channel explicitly. Installation prepares the framework and selected adapter; guided project setup happens next,
inside the model's CLI.

### 2. Configure — inside the model's CLI

Open the same repository in your coding agent and enter:

```text
/qa-init
```

Use `/qa-init`, not the host's unrelated `/init`. The agent guides you through interface language, QA knowledge,
project name, Gherkin language, manual/automation template, requirement source, tools and scenario layout.
Review its proposed settings and approve changes before it applies them.

If you already have a repository-local folder describing your team's QA practices, you can start with:

```text
/qa-init --qa-context qa-ai-knowledge
```

The agent reads that folder as context, separates documented practices from assumptions and asks you to approve
inferred defaults. It maintains `.qa-ai/qa-ai.config.yaml` and the approved context artifacts for you.

### 3. Check setup and choose your next step — inside the model's CLI

```text
/qa-doctor
/qa-help
```

`/qa-doctor` checks setup. `/qa-help` recommends the next action for the current repository.
If newly installed commands are not visible, reopen the agent session in the same repository.
Project slash commands are available in hosts with the matching adapter, such as Claude Code and OpenCode.
For other hosts, follow the generated skill/adapter instructions; do not assume every host has identical slash syntax.

### 4. Use the workflow — inside the model's CLI

For a guided requirement-to-QA workflow:

```text
/qa-full-flow
```

Provide your requirement source and official RF ID when asked. The agent presents a plan, requests the necessary
approvals, produces artifacts and runs the relevant validators. Review its proposals in the conversation; you do not
need to manually drive the internal phase commands from a separate terminal.

For a new requirement in an existing QA repository, use this alternative instead:

```text
/qa-add-tests
```

You do not need to run both commands for the same task. At the end, inspect the outcome and remaining work:

```text
/qa-status
/qa-help
```

## Everyday commands

Run these **inside the model's CLI**, not in your operating-system shell:

| Command                 | Purpose                                           |
| ----------------------- | ------------------------------------------------- |
| `/qa-init`              | Guided project configuration                      |
| `/qa-doctor`            | Check setup health                                |
| `/qa-help`              | Recommend the next workflow step                  |
| `/qa-full-flow`         | Guide the complete configured QA workflow         |
| `/qa-add-tests`         | Propose tests for a new requirement               |
| `/qa-update-tests`      | Review changes to existing tests                  |
| `/qa-validate-features` | Validate generated Gherkin                        |
| `/qa-status`            | Summarize artifacts, checks and pending decisions |
| `/qa-config`            | Import or export a reusable configuration profile |

For enterprise governance after setup, ask the agent to run `/qa-enable-enterprise`; see
[workflow tracks](qa-help.md). External writes still require separate approval. A passing artifact check does not
mean that automated tests ran or a GitHub PR was created.

## Deterministic RF-101 demo

To try the user journey, use `/qa-init` and choose the manual-only template. Then, inside the model's CLI:

```text
/qa-full-flow requirements/RF-101-login.md
```

Supply an existing requirement file or paste the requirement when asked, confirm RF-101, review the test design and
let the agent guide generation and validation. The default artifact folders are `.qa-ai/output/` and `.qa-ai/features/`.

### Reproduce the verified path

The automated fixture replay is a **maintainer verification tool**, not the user journey or a recording of the model.
See the [terminal/CI alternative](terminal-setup-and-maintenance.md#reproduce-the-verified-path) and
[captured CLI transcripts](terminal-transcripts.md) if you need to inspect that lower-level evidence.
The historical [demo](demo.md), [script](demo-script.md) and [transcript](demo-transcript.md) are not a verified
recording of this agent-first journey. The replacement is an explicitly illustrated slash-command tutorial,
not a captured model session; it remains separate from published media until reviewed.

## Optional alternatives — not required for the quick start

Direct script execution remains supported for CI, troubleshooting, hosts without slash commands and contributors.
It belongs in the [terminal setup and maintenance reference](terminal-setup-and-maintenance.md), not the primary path.
See also [CLI reference](cli-reference.md), [workflow](workflow.md) and [agent compatibility](agent-compatibility.md).
