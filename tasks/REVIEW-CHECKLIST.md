# 1.0 Plan and Milestone Review Checklist

Use this checklist after plan changes, at every milestone gate, before the release candidate and before stable release.
The reviewer should not be the sole author of the work being reviewed.

## Scope and sequencing

- [ ] Every task supports a stated 1.0 outcome.
- [ ] Dependencies are explicit and acyclic.
- [ ] External integrations, hosted services and interactive init remain non-blocking unless scope is formally changed.
- [ ] Pilot findings can feed contract work before contract freeze.
- [ ] Stable release tasks cannot begin before RC soak and approval.

## Ownership and delivery

- [ ] Every task has one accountable owner.
- [ ] Product, engineering, QA, security, documentation, developer experience and release responsibilities are covered.
- [ ] Human-only settings and approvals are assigned to a maintainer.
- [ ] Blocked tasks identify the decision or dependency required to unblock them.

## Acceptance quality

- [ ] Each task has observable completion criteria.
- [ ] Product claims require evidence, not only implementation.
- [ ] Security claims map to controls or explicit limitations.
- [ ] Compatibility claims identify their verification level.
- [ ] No task is marked Done with unresolved P0/P1 defects.

## Testing and CI

- [ ] Relevant unit, integration, smoke and E2E coverage is specified.
- [ ] Ubuntu and Windows behavior is covered where the product claims support.
- [ ] Node.js 20 and 22 remain in the CI matrix until support policy changes.
- [ ] Clean packed-package installation is tested.
- [ ] Update/migration preserves user data and active run state.
- [ ] Failure paths cover paths, secrets, overwrite, approvals, corrupted state and invalid contracts.
- [ ] CI checks have stable names, useful logs and documented owners.
- [ ] CodeQL, dependency audit, package allowlist and adapter parity remain active.

## Documentation

- [ ] User-visible changes update README or linked user guides.
- [ ] English and Spanish entry documentation are semantically aligned.
- [ ] CLI/config/contract changes update reference and migration docs.
- [ ] New failure modes update troubleshooting.
- [ ] Examples and transcripts match real current output.
- [ ] Historical version references are distinguished from evergreen claims.
- [ ] Release sections remain managed by release-please.

## Security and privacy

- [ ] No task requires committed credentials, private URLs or personal data.
- [ ] Pilot evidence is consented and anonymized.
- [ ] External writes remain denied or proposal-first for 1.0.
- [ ] Threat model and residual risks are current.
- [ ] Vulnerability reporting path is private and usable.
- [ ] npm publication uses provenance and the approved automated workflow.

## Release readiness

- [ ] All milestone evidence is linked.
- [ ] The beta-to-1.0 migration has been followed by a non-author.
- [ ] RC uses package contents and automation equivalent to stable.
- [ ] RC soak duration and restart rules are satisfied.
- [ ] No unresolved P0/P1 issue remains.
- [ ] Accepted P2 risks have owner and follow-up milestone.
- [ ] Human maintainer verifies GitHub/npm settings.
- [ ] Post-publish checks include npm metadata, provenance, clean install, update and examples.

## Logic review result

Record:

- Review date:
- Reviewer(s):
- Milestone/epics reviewed:
- Missing work:
- Contradictions:
- Risks accepted:
- Required corrections:
- Decision: `PASS`, `PASS WITH ACTIONS`, or `FAIL`
