# Security and code-quality hardening review

## Scope and method

Review of the runtime/module and OpenCode V2 changes, followed through shared filesystem helpers, YAML parsing,
custom validators, process execution, execution provenance and PR/SARIF serialization. Findings below are local
reproductions and code-review conclusions, not an independent penetration test or real-host E2E certification.
Severity reflects impact within the repository/local-user threat boundary, not a claim of remote exploitation.

## Findings addressed

| Severity | Finding                                                                                                                                     | Correction and regression                                                                                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | A final empty YAML mapping key never advanced the parser, hanging the CLI on truncated input.                                               | Advance input and consistently return `null`; child-process regression has its own timeout.                                                                                                                    |
| High     | YAML `__proto__` keys invoked the prototype setter, making data inherited and invisible to own-key enumeration.                             | Define mapping entries as own data properties in ordinary and sequence mappings. Tests assert unchanged prototypes and preserved serialized data. This affected parsed objects, not global `Object.prototype`. |
| Medium   | Linked adapter destinations could redirect skill/hook writes, including forced copies.                                                      | Shared no-link destination guard for modules and native adapters; recursive copies reject linked roots/entries. Junction tests assert no writes reach the external destination.                                |
| Medium   | Existence checks before safe writes/copies were subject to a no-clobber race and followed dangling links.                                   | Exclusive creation (`wx` / `COPYFILE_EXCL`) prevents replacement without force. Concurrent-write tests assert exactly one winner.                                                                              |
| Medium   | An old idle validation could inject feedback after a newer user prompt or after a session moved projects.                                   | Prompt-generation tokens invalidate stale results; location is rechecked after validation. Tests cover prompt arrival both during lookup and during execution.                                                 |
| Medium   | Exceptions from SDK lookups/delivery could expose raw error bodies; a rejected check could poison a shared queue.                           | Fixed actionable boundary diagnostics, failure conversion for validator exceptions, and rejection-isolated scheduling.                                                                                         |
| Medium   | Custom-validator processes had no deadline; structured findings could leak secrets or crash on null entries.                                | A 30-second process timeout, bounded output, normalized finding fields and redaction before returning structured findings.                                                                                     |
| Low      | Concurrent post-tool events spawned independent validator processes.                                                                        | Serialize checks per plugin instance while retaining every queued validation; unload cancels running work and suppresses queued work.                                                                          |
| Low      | Version-1 module metadata accepted module names introduced only in version 2; missing metadata behind a linked ancestor bypassed preflight. | Validate historical names and inspect destination ancestors before checking metadata existence. Legitimate v1 migration remains covered.                                                                       |
| Low      | Empty sequence mappings at EOF were silently dropped.                                                                                       | Preserve entries as null-valued mappings; regression covers consecutive empty items.                                                                                                                           |

## Refactoring

- Replaced duplicated link traversal in module/plugin installation with `assertNoInstallLinks`.
- Removed check-then-write logic from default no-clobber filesystem helpers.
- Centralized safe YAML assignment instead of relying on JavaScript property setters.
- Made plugin state explicit per session: prompt generation, continuation budget and in-flight status.
- Preserved public CLI flags, normal full installation, optional module boundaries and validator entrypoints.

Regression coverage lives in `.qa-ai/scripts/test/validators/security-hardening.mjs` and
`.qa-ai/scripts/test/validators/opencode-v2-plugin.mjs`, imported by the standard validator suite.

## Residual risks and limits

- Node's portable filesystem APIs do not provide a directory-descriptor sandbox. Link preflight is not protection
  against a hostile local process swapping ancestors during a forced write. Interrupted multi-file installations
  are not transactional; retain backups and use dry-run before updates.
- Custom validators and copied framework scripts execute trusted repository code as the local user. A process
  timeout is not a process-tree sandbox; deliberately detached descendants remain outside this guarantee.
- Plugin serialization is per instance, not a global lock across independently loaded hosts. Continuation-budget
  state lasts until plugin unload; it is not persisted across restarts.
- The experimental idle hook, genuine live-host E2E, independent review, pilots and RC soak remain separate work.
- Secret-pattern redaction is heuristic, not proof that arbitrary sensitive information cannot appear in diagnostics.
- Reviewed provenance and PR/SARIF code retain their declared limits: local records are not signed attestations,
  and matrix links are not proven semantic code coverage. No change was made to imply stronger guarantees.

## Verification commands

```bash
npm ci
npm run lint
npm run format:check
npm run docs:check
npm run validate:oss-extraction
npm run coverage:check
npm audit --audit-level=low
node .github/scripts/verify-npm-pack.mjs
```

Use the actual output of these commands for results. Earlier CI green checks predate these hardening changes and
must not be represented as verification of the modified code.

The second pass additionally checks nested malformed finding fields: JSON objects with a non-callable `toString`
must not crash diagnostic normalization. Only textual fields are used, and unsafe validator-path errors are redacted.
Final local and remote verification results are recorded in the hardening PR; earlier runs are not proof of the
final revision.
