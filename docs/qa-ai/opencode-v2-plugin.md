# OpenCode V2 plugin (experimental)

The optional local server plugin uses OpenCode V2's `Plugin.define` and Promise hook API, with an exact
`@opencode/plugin` dependency of `2.2.4`. It does not install or configure any global plugin, change permissions,
invoke external systems, run a model by itself, or grant release approval.

```bash
# Start from a target initialized with the OpenCode adapter module.
npx qa-flowkit update --modules adapter-opencode
npx qa-flowkit sync-adapters --adapters opencode --opencode-plugin
```

Review `.opencode/plugins/qa-flowkit/package.json` and `index.mjs` before enabling/trusting the plugin in your host.
OpenCode discovers immediate plugin package directories there. It may install the SDK dependency; plugin generation
itself does not run npm or access a registry. Existing files are preserved; `--force` explicitly refreshes them.
The generator refuses symlinks/junctions in destination ancestors and plugin files even with `--force`.
If dependency installation is restricted, provision the plugin's declared SDK through your approved package workflow.
No new root runtime dependency is added to QA FlowKit.

## Checks

- `tool.execute.after`: for completed `write`, `edit`, `apply_patch`, `patch` and `shell` tools, run target validation
  with secret scanning. Failed validation replaces the tool's displayed result with redacted diagnostics and a
  failure metadata flag, preserving unrelated metadata. The tool operation has **already happened**; there is no
  rollback and the native tool status is not rewritten. This is post-operation feedback, not a write sandbox.
- `session.experimental.idle`: use the same active-run output/hash check as the Claude/Codex stop gate. If it blocks,
  admit one synthetic verification request for that session. Pending background work defers this check. At most one
  continuation is sent per user prompt, with an in-flight guard against duplicate idle events. Continued failure
  requires explicit user intervention; the plugin does not spin, approve gates, or claim verification succeeded.
- `session.prompt`: resets the one-continuation budget for the admitted user prompt. Sessions are isolated; the
  plugin resolves the session location instead of assuming every event belongs to its installation directory.
- Cleanup cancels pending checks, suppresses late feedback and disposes all registrations. A partial setup failure
  disposes earlier registrations before propagating.

Only fixed Node script paths and fixed arguments are executed, with no shell interpolation. Each child has a timeout
and output limit. Core validators still honor the project's configured custom validators; review these as executable
repository code before opting in. Plugin installation requires an initialized project. Nested sessions use the
nearest initialized framework without crossing a Git boundary; sessions outside the plugin's root or in a separately
initialized nested project are ignored.

## API stability and evidence

The public V2 guide documents tool hooks and session prompt hooks. The `experimental.idle` hook is additionally present
in the published SDK 2.2.4 declaration; its name and semantics are experimental. Older hosts can reject setup rather
than silently provide stop enforcement. Keep the host compatible with the pinned SDK and test upgrades explicitly.

Tests cover mocked V2 hook contracts, concurrency bounds, cleanup, session isolation, redaction, preservation,
symlink refusal and real validator subprocesses in a fresh core install. Installed-package smoke verifies opt-in
generation. These are **not real-host E2E certification**. A dated live host session, prospective pilot, independent
review and RC soak remain pending until genuine evidence exists. Disabling/removing the plugin or editing validators
can bypass this layer; use host permissions and independently protected CI gates for enforcement.

References: [V2 plugin guide](https://opencode.ai/v2/docs/build/plugins),
[server hooks](https://opencode.ai/v2/docs/build/plugins/server),
[plugin loading](https://opencode.ai/v2/docs/plugins),
[published SDK session hooks](https://unpkg.com/@opencode/plugin@2.2.4/dist/promise/session.d.ts).
