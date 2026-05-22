# Contributing

Thanks for contributing to QA AI Starter.

## Principles

- Keep the project repo-first and portable.
- Do not require a hosted backend for the MVP.
- Prefer explicit configuration over hidden behavior.
- All generated test cases must be written in English.
- Every destructive or external write operation must require user approval.
- Preserve compatibility with multiple AI coding tools through `AGENTS.md`.

## Development workflow

1. Create an issue describing the problem or improvement.
2. Create a branch from `main`.
3. Add or update documentation when behavior changes.
4. Add validation logic when adding a new rule.
5. Open a PR with a clear summary and manual validation steps.

## Commit style

Recommended prefixes:

- `feat:` new behavior
- `fix:` bug fix
- `docs:` documentation only
- `refactor:` internal restructuring
- `chore:` maintenance

## Pull request checklist

- [ ] The change is documented.
- [ ] New generated files do not include secrets.
- [ ] Validation scripts still run.
- [ ] The open-source license and attribution are preserved.
- [ ] Any agent-specific instruction has an equivalent generic rule in `AGENTS.md` or `.qa-ai/rules/`.
