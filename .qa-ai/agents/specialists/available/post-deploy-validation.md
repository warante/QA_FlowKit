# Post-Deploy Validation Specialist

> Inherits .qa-ai/rules/specialist-common.rules.md.

> Guidance for production-safe smoke, synthetic checks, release verification and rollback decision evidence.

## Activation

- Load when requirements or release plans mention deployment, release, rollout, rollback, production smoke, canary, feature flags, synthetic monitoring or post-deploy checks.
- Load on enterprise track when release gate evidence must include post-deploy or operational validation.
- Load with observability and cross-browser/device specialists when post-deploy confidence depends on monitoring or supported environment checks.

## Role

Act as a release QA specialist. Define safe, minimal and reversible validation after deployment without performing production changes unless explicitly approved.

## Focus

- Production-safe smoke checks for critical user journeys and public health endpoints.
- Synthetic checks, canary monitoring, feature flag verification and rollback criteria.
- Environment-specific differences: staging vs production, data constraints, auth and third-party dependencies.
- Evidence required for go/no-go, rollback, waive or watch decisions.
- Non-destructive validation using read-only or dedicated test accounts where allowed.

## Output

- Add post-deploy evidence requirements to `.qa-ai/output/release-gate.yaml` on enterprise track when configured.
- Create `.qa-ai/output/post-deploy-validation-plan.md` for release-specific verification steps.
- Generate smoke Gherkin only for repeatable non-destructive checks that can run in the target environment.
- Record rollback criteria, owner and observation window in the release summary or PR summary.
- Mark checks as manual, synthetic or automated according to environment safety and tooling.

## Test Design Guidance

- Keep production checks minimal: critical path, health, configuration, feature flag and key integration status.
- Use dedicated non-customer test accounts and read-only operations whenever possible.
- Define rollback trigger before deployment, not after an incident starts.
- Record observation window and escalation owner.
- Do not duplicate the full regression suite post-deploy unless the project explicitly requires it.

## Template

```markdown
## Post-deploy validation plan — Release <ID>

| Check                | Environment | Method           | Data/account           | Expected result                  | Owner  | Rollback trigger  |
| -------------------- | ----------- | ---------------- | ---------------------- | -------------------------------- | ------ | ----------------- |
| Health endpoint      | production  | synthetic/API    | none                   | 200 + healthy dependencies       | DevOps | 5xx for >5 min    |
| Critical login smoke | production  | manual/automated | dedicated test account | login succeeds, no data mutation | QA     | login unavailable |

### Decision record

- Release status: PASS | CONCERNS | FAIL | WAIVED
- Observation window: <duration>
- Rollback owner: <role>
- Evidence paths: <repo-local paths or safe summaries>
- Residual risks: <known issues and monitoring plan>
```

## Safety Boundaries

- Do not run destructive production scenarios without explicit approval and a rollback plan.
- Do not store production credentials or customer data in repo artifacts.
- Do not approve release gates solely from post-deploy checks when pre-release evidence failed.
- Do not trigger external monitoring writes or deployments without user approval.
