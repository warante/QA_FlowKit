# Continuous Integration (CI) Integration

This guide describes how to integrate the QA FlowKit quality gate into your Continuous Integration pipelines. Running these checks automatically on pull requests ensures that all QA artifacts, feature files, and configurations follow the project's quality rules and guidelines.

---

## GitHub Actions

QA FlowKit provides a composite GitHub Action to run target validation.

### Workflow Template

When you initialize a repository using the `--with-ci github` flag:

```bash
npx qa-flowkit init --with-ci github
```

QA FlowKit generates a ready-to-use workflow template at `.github/workflows/qa-flowkit.yml`:

```yaml
name: QA FlowKit Quality Gate

on:
  pull_request:
    branches: [main]

jobs:
  validate:
    name: Validate QA Quality Gate
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: QA FlowKit Validation
        uses: warante/QA_FlowKit/actions/validate@v0
        with:
          version: 'beta'
```

### Action Reference

The composite action is located at `warante/QA_FlowKit/actions/validate`.

#### Inputs

| Input               | Description                                                     | Required | Default |
| ------------------- | --------------------------------------------------------------- | -------- | ------- |
| `working-directory` | The directory where `qa-ai.config.yaml` is located.             | No       | `.`     |
| `strict`            | Fails on prompt injection scanner and runs strict doctor check. | No       | `true`  |
| `allow-empty`       | Allows empty feature folders or traceability matrix.            | No       | `false` |
| `allow-missing`     | Allows missing optional artifacts.                              | No       | `false` |
| `release-gate`      | Whether to validate the release gate (`true`, `false`, `auto`). | No       | `auto`  |
| `version`           | The `qa-flowkit` package version or tag to run.                 | No       | `beta`  |

#### Outputs

| Output           | Description                                         |
| ---------------- | --------------------------------------------------- |
| `result`         | The final gate outcome: `pass` or `fail`.           |
| `findings-count` | The total number of errors found during validation. |

#### Annotations and Step Summary

The composite action automatically parses the validation results and:

1. Emits inline GitHub annotations (`::error` and `::warning`) on files that fail validation, showing the exact line and error message.
2. Writes a markdown table summary under the action's **Job Summary** (`$GITHUB_STEP_SUMMARY`) displaying each validator's status.

---

## GitLab CI/CD

Since GitLab CI/CD does not have a native "action" marketplace, you can run QA FlowKit validation as a standard script step inside a Node.js container.

### GitLab CI Snippet

Add the following job definition to your `.gitlab-ci.yml` file:

```yaml
stages:
  - test

qa-flowkit-gate:
  stage: test
  image: node:20-alpine
  script:
    # 1. Run the target validation and output standard text to logs
    - npx -y qa-flowkit@beta validate-target --strict-untrusted-content
  only:
    - merge_requests
```

### Advanced GitLab Configuration

If you want to run the quality gate on a project folder or configure specific validation flags, pass them directly to the `validate-target` command:

```yaml
qa-flowkit-gate:
  stage: test
  image: node:20-alpine
  script:
    # Run with permissive flags for early-stage QA branches
    - npx -y qa-flowkit@beta validate-target --allow-empty --allow-missing --no-strict-doctor
  only:
    - merge_requests
```
