# PR impact summaries (experimental)

Generate a local, reviewable summary of committed changes without creating a PR or running tests:

```bash
npx qa-flowkit pr-summary --base origin/main
npx qa-flowkit pr-summary --base origin/main --head HEAD --json
npx qa-flowkit pr-summary --base origin/main --output .qa-ai/output/pr-impact-summary.md
```

Run from the repository root after committing the changes you want included. The default base is `main` and the
default head is `HEAD`. Fetch required refs first: the command never fetches, changes branches, stages, commits,
pushes or writes to external tools. Missing refs, missing history or ambiguous merge bases fail with exit code `1`.
Exit code `0` means the summary was generated, not that tests passed, coverage is complete or merging is approved.

## What the report says

- **Scope:** `git merge-base(base, head)` to the resolved head commit, equivalent to a three-dot PR comparison.
  New commits made only on the base branch are not incorrectly reported as changes in the PR.
- **Files:** NUL-delimited Git name/status records, including both paths for detected renames and deleted files.
  Local modifications and untracked files are excluded and produce a warning. They must be committed for inclusion.
- **Traceability:** exact, case-sensitive path links from `Requirement Source`, `Feature File` and `Automation File`
  in the functional matrix at the merge base and head. The matrix path is configured by `traceability.matrixPath`
  or `--matrix-path`. Configuration and interface language come from the workspace, not a historical config snapshot.
  Matrix links are declarations, not proven code dependencies or semantic coverage.
- **Tests to review:** unique test IDs for affected RFs from head matrix rows that declare a feature path. Removed
  rows contribute historical evidence but no head test recommendation. These IDs are not an exhaustive test selection
  and do not verify that the referenced files exist or were executed.
- **Unmapped files:** every changed file without an exact matrix link remains visible for manual impact review.
  A source file with a similar name is not silently assigned an RF. Shared-code, configuration and transitive impacts
  cannot be inferred from the current matrix alone. NFR coverage is not evaluated by this command.
- **Verification:** tests, validators and coverage are explicitly not assessed. Run the appropriate checks separately
  and attach evidence for the same head commit. This summary never makes a release-gate or approval decision.

A missing matrix at either snapshot is a warning, not evidence of no impact. A malformed or non-regular committed
matrix fails rather than fabricating a clean report. Changed matrices are flagged for human review. Each exact link
includes its matrix line, column and commit in JSON and Markdown so reviewers can inspect its origin.

## Safe output and compatibility

Default output is Markdown on stdout. `--json` emits only JSON, including on error; the JSON report has
`schemaVersion: 1` and is experimental. Markdown follows `project.interfaceLanguage` (`en`/`es`). Existing
`change-impact` scripts and the workflow's `pr-summary.md` template are unchanged; this is an additive command and
does not complete the harness PR-summary phase automatically.

`--output` saves Markdown even when `--json` is also used. The parent directory must already exist. The path must
remain inside the repository; symlink targets and external symlink parents are rejected. Existing files are preserved
unless `--force` is explicitly passed with `--output`. No file is written by default. Output files are not registered
for automatic cleanup in the init manifest. Like other local tools, this is not a sandbox against concurrent
filesystem changes or an unrestricted agent.

Known credential patterns are redacted and Markdown content is escaped. No patches, commit messages, source code
or execution logs are included. Review reports before sharing: heuristic redaction cannot identify every sensitive
filename or business identifier. Local tests and installed-package smoke tests do not claim real-host E2E or a live
GitHub PR integration.
