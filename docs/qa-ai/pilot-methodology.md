# Pilot Methodology

This protocol measures whether QA FlowKit improves repeatability and retained QA evidence without hiding workflow
cost. It is designed for quick, standard and enterprise pilots and can be run by a facilitator who did not build the
product.

## Study design

Use the same bounded requirement or change twice:

1. **Baseline window:** the team follows its normal process without QA FlowKit.
2. **Assisted window:** the team handles an equivalent item with QA FlowKit and the same agent/model access where
   practical.

Prefer two comparable work items over repeating one already-solved item. Record important differences in complexity,
team availability, tooling or prior knowledge. Do not claim causality from a single pilot.

Recommended scope:

- one repository and one consenting team;
- one to three requirements per window;
- no more than five working days between windows;
- the same start and stop definitions in both windows.

## Quantitative metrics

| Metric                       | Start                                                       | Stop                                   | Unit / calculation                                       |
| ---------------------------- | ----------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------- |
| Requirement-to-design time   | Facilitator releases the accepted requirement               | Reviewed test-design proposal is ready | Active minutes; exclude declared waiting time            |
| Time-to-valid-Gherkin        | Test author starts the first scenario                       | Required feature validators pass       | Active minutes                                           |
| Review cycles                | First artifact is submitted for review                      | Reviewer accepts it                    | Count of review-return loops                             |
| Acceptance-criteria coverage | Reviewed acceptance criteria and final designed tests exist | Measurement window closes              | Covered criteria / eligible criteria, as a percentage    |
| Rework                       | First reviewable artifact exists                            | Final accepted artifact exists         | Minutes spent correcting or recreating prior work        |
| Retained artifacts           | Measurement window closes                                   | Facilitator checks repository evidence | Count of agreed artifacts retained in version control    |
| Escaped design defects       | Final review begins                                         | Pilot exit review closes               | Count of material test-design defects found after review |
| Validator-found defects      | First validator execution                                   | Assisted window closes                 | Count by validator and severity                          |
| Manual adaptation            | Generated automation output first exists                    | Executable test is accepted            | Minutes of human edits required                          |

Record elapsed duration separately when waiting time matters. Never mix elapsed hours with active minutes.

Coverage denominator rules:

- Count only explicit, approved acceptance criteria.
- Split a criterion only when the team normally treats its clauses as independently testable.
- Mark unavailable rather than estimating missing criteria.
- Report numerator and denominator with the percentage.

Retained artifacts use a pilot-specific expected list agreed during intake, such as requirement analysis, test design,
Gherkin, traceability, implementation plan and PR summary.

## Qualitative measures

After each window, ask participants to score each statement from 1 (strongly disagree) to 5 (strongly agree):

- I understood why the next workflow step was required.
- I trusted the retained artifacts enough to review or reuse them.
- The amount of ceremony was appropriate for the change.
- Validation errors were clear and actionable.
- I would use this workflow again for a similar change.

Capture the score and a short rationale. Scores describe the participating context; they are not product-wide claims.

## Defect attribution

Classify every material issue as one of:

- `flowkit`: CLI, validator, preset, harness or documentation defect;
- `agent`: model behavior despite adequate FlowKit guidance;
- `repository`: target-project convention or dependency issue;
- `facilitation`: protocol or facilitator inconsistency;
- `unknown`: evidence is insufficient.

Severity:

- `P0`: data loss, credential exposure or unusable core workflow with no workaround;
- `P1`: incorrect output or blocked workflow affecting the pilot objective;
- `P2`: significant friction with a documented workaround;
- `P3`: minor clarity, polish or convenience issue.

## Consent and privacy

- Obtain explicit consent before observation or recording.
- Participation is voluntary and may stop without explanation.
- Do not collect participant names, email addresses, repository names, private URLs, credentials, prompts, source
  code, customer data or personal device identifiers.
- Use random participant and repository aliases generated for the study.
- Store raw notes outside the public repository with access limited to the pilot team.
- Publish only anonymized aggregates and reviewed excerpts.
- Default raw-data retention is 90 days after the consolidated report; delete sooner on withdrawal.
- Keep anonymized aggregate records only while they support the documented product decision.
- Record consent status and retention date in the intake form. A pilot without consent cannot produce publishable
  evidence.

## Facilitation procedure

1. Complete [pilot-intake.template.md](pilot-templates/pilot-intake.template.md).
2. Agree work-item comparability, expected artifacts and measurement boundaries.
3. Run the baseline window and record events in
   [pilot-observation.template.md](pilot-templates/pilot-observation.template.md).
4. Reset or select the comparable assisted item; do not reuse solved output.
5. Run the assisted window with the same observation method.
6. Complete [pilot-exit-interview.template.md](pilot-templates/pilot-exit-interview.template.md).
7. Create a machine-readable record from
   [pilot-result.template.json](pilot-templates/pilot-result.template.json).
8. Validate and summarize records:

   ```bash
   npm run pilots:analyze
   ```

9. Triage P0/P1 findings immediately and publish only reviewed, anonymized results.

## Interpretation

- Report raw values, absolute delta and percentage delta where the baseline is non-zero.
- Treat missing values as unavailable, never as zero.
- Do not average percentages with different denominators without also publishing totals.
- Use medians after at least three comparable pilots; until then, report each context separately.
- Separate implementation evidence from adoption evidence.
- Remove or qualify public productivity claims that are not supported across representative contexts.

## Dry run

[`pilot-records/first-pilot-retrospective.json`](pilot-records/first-pilot-retrospective.json) maps the existing pilot
notes into this schema. It is intentionally marked `retrospective-partial`: the original pilot did not capture a
baseline window or reliable timing metrics, so the analyzer reports those fields as unavailable.
