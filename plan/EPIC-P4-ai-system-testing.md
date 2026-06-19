# EPIC-P4 - Testing products that contain AI (RF-LLM)

Goal: make QA FlowKit the first workflow framework that joins classical ISTQB-style test design
with LLM/AI-system evaluation in one traceable process. When a requirement is marked as
AI-powered, the framework requires AI-specific design techniques (adversarial, statistical
consistency, robustness, fairness, safety), supports non-deterministic assertions in Gherkin, and
accepts eval-tool evidence (promptfoo/DeepEval-style reports) in the release gate.

QA FlowKit still never invokes a model: the team's eval tooling produces evidence; FlowKit's
deterministic validators verify design coverage, artifact formats and evidence linkage.

Frameworks referenced in rules: OWASP Top 10 for LLM Applications, NIST AI RMF. (EU AI Act
obligations are mentioned as a pointer for enterprise users, not encoded as rules.)

Exit gate: a target repo can mark RF-202 as an AI component; test design for RF-202 fails
validation unless AI-specific techniques are covered; statistical Gherkin scenarios validate; the
enterprise gate can require linked eval-report evidence for AI components.

---

## P4-US-01 - AI-component requirement type

As a QA engineer testing an AI-powered feature, I want to mark a requirement as an AI component so
that the framework demands the right design techniques for non-deterministic behavior.

### P4-T-001 - Add AI-component classification to config, rules and test design validation

Status: Done
Priority: P1
Depends on: P0-T-005 (config schema)

Description: introduce the classification mechanism and the deterministic obligation: AI-marked
RFs require AI-specific technique coverage in the test design proposal.

Implementation notes:

- Config (schema + presets + docs, default off):

  ```yaml
  aiTesting:
    enabled: false
    requiredTechniques:
      - adversarial
      - statistical-consistency
      - robustness-paraphrase
      - safety-guardrails
    optionalTechniques:
      - fairness-bias
      - degradation-fallback
      - pii-leakage
  ```

- Classification: a requirement is an AI component when its row in the test design proposal /
  traceability carries the marker tag `@ai-component` (Gherkin scenarios) or the RF entry in the
  test-design proposal table has `AI component: yes` (exact mechanism: extend the existing
  test-design proposal template's per-RF table with an `AI component` column; both surfaces must
  agree - validator cross-checks).
- Create `.qa-ai/rules/ai-testing.rules.md` (bilingual guidance note): defines each technique with
  2-3 concrete examples, maps each to OWASP LLM Top 10 / NIST AI RMF references, and states the
  obligation: every required technique must appear in the per-RF design with at least one planned
  test.
- Extend `validate-test-design.mjs` (and `.qa-ai/scripts/lib/test-design.mjs`): when
  `aiTesting.enabled` and an RF is AI-marked, the per-RF proposal must contain a `Technique`
  column listing every `requiredTechniques` entry mapped to at least one test ID; missing
  techniques fail with RF + technique named. Reuse the existing technique-traceability machinery
  (`requireTechniqueTraceability`) - AI techniques become additional required technique values.
- Extend `validate-features.mjs`: `@ai-component` is a recognized tag; when present, the scenario
  must also carry a `@technique:<value>` tag whose value is in the configured
  required+optional set.

Acceptance criteria:

- [x] With `aiTesting.enabled: true`, a fixture test-design proposal marking RF-202 as AI
      component but missing `statistical-consistency` fails
      `node .qa-ai/scripts/validate-test-design.mjs` naming RF-202 and the technique; adding the
      mapping makes it pass.
- [x] A `.feature` tagged `@ai-component` without `@technique:` fails feature validation; with
      `@technique:adversarial` it passes (fixtures + tests for both, en and es Gherkin).
- [x] Disagreement between proposal marking and feature tags (RF marked AI in proposal, no
      AI-tagged scenarios) fails test-design validation with a cross-check message.
- [x] `aiTesting` keys validate against the config schema; default-off leaves all existing
      fixtures passing unmodified.
- [x] `.qa-ai/rules/ai-testing.rules.md` exists with all seven techniques defined and mapped to
      OWASP/NIST references.
- [x] New doc `docs/qa-ai/ai-system-testing.md` introduces the feature end-to-end; linked from
      README tables (EN/ES); `docs/qa-ai/config-schema.md` updated.
- [x] Global Definition of Done passes.

### P4-T-002 - Update test-design agents and adapter commands for AI components

Status: Done
Priority: P2
Depends on: P4-T-001

Description: teach the agent layer to detect, ask about and design for AI components, bilingually.

Implementation notes:

- Update `.qa-ai/agents/gherkin-test-design-agent.md`, the test-design system agent and the
  requirements intake agent: during intake, ask the user (interfaceLanguage) whether the RF
  involves an AI/LLM/non-deterministic component when signals suggest it (keywords: model, LLM,
  prediction, score, generative, biometric matching, confidence); record the answer in the
  analysis artifact; when designing, read `.qa-ai/rules/ai-testing.rules.md` and produce per-
  technique scenarios.
- Update `/qa-add-tests` and `/qa-update-tests` adapter commands (claude + opencode + parity
  text): mention the AI-component question and the technique obligations; bilingual descriptions
  preserved.
- Add a new specialist `.qa-ai/agents/specialists/available/ai-evals.md`: guidance on designing
  eval suites with promptfoo/DeepEval-style tooling (assertions, rubrics, datasets, thresholds,
  CI wiring) - proposal-level only, the team owns execution. Add
  `.qa-ai/agents/specialists/available/ai-red-team.md`: adversarial testing guidance mapped to
  OWASP LLM Top 10 categories (prompt injection, insecure output handling, data leakage...),
  with an explicit authorized-testing-only note. Register both in the specialist loading logic
  and `validate-active-specialists.mjs` expectations.

Acceptance criteria:

- [x] The three agent files contain the AI-component intake question (both language behaviors per
      interfaceLanguage convention) and reference `ai-testing.rules.md`.
- [x] Both new specialists exist, load when `aiTesting.enabled: true` plus `specialistMode: auto`
      (extend the auto-detection rule), and `validate-active-specialists` accepts them (tests).
- [x] `/qa-add-tests` and `/qa-update-tests` updated in both primary adapters; parity check passes.
- [x] `docs/qa-ai/ai-system-testing.md` documents the specialists and intake behavior.
- [x] Global Definition of Done passes.

---

## P4-US-02 - Non-deterministic Gherkin

As a QA engineer, I want a supported Gherkin pattern for statistical assertions so that scenarios
for non-deterministic behavior are first-class validated artifacts instead of prose workarounds.

### P4-T-003 - Support statistical assertion scenarios in templates and the feature validator

Status: Done
Priority: P1
Depends on: P4-T-001

Description: define the canonical statistical-assertion step shape, template it, and validate it.

Implementation notes:

- Canonical pattern (documented in `ai-testing.rules.md` and the Gherkin rules): a scenario tagged
  `@ai-component` may include a Then step matching (en)
  `Then the <observable> should satisfy <criterion> in at least <P>% of <N> runs` or (es)
  `Entonces el <observable> debe cumplir <criterio> en al menos el <P>% de <N> ejecuciones`,
  plus an optional step referencing a versioned dataset:
  (en) `Given the adversarial dataset "<repo-relative-path>"` / (es)
  `Dado el dataset adversarial "<ruta>"`.
- Extend `.qa-ai/scripts/lib/gherkin-validate.mjs`: recognize the statistical pattern; validation
  rules: `P` integer 1-100, `N` integer >= 2, `N >= 10` when `P >= 95` (statistical floor,
  documented); dataset paths must exist in the repo and pass path safety; statistical steps are
  only allowed in `@ai-component` scenarios (elsewhere they fail with a pointer to the rules).
- Add template examples: extend the Gherkin feature template set and the P3-T-003 dataset
  (when present) with two statistical examples (en + es). If P3-T-003 is not yet implemented, add
  the examples under `test/fixtures/` directly.
- Add `qa-ai-output/` is not affected; no harness change.

Acceptance criteria:

- [x] Valid statistical scenarios (en and es fixtures) pass `validate-features.mjs`.
- [x] Each invalid variant fails with a specific message: P out of range, N < 2, N too small for
      P >= 95, missing dataset file, dataset path escaping the repo, statistical step without
      `@ai-component`.
- [x] The pattern grammar is documented in `.qa-ai/rules/gherkin.rules.md` (cross-linking
      `ai-testing.rules.md`) and `docs/qa-ai/ai-system-testing.md` with copy-paste examples in
      both languages.
- [x] Existing non-AI fixtures pass unmodified (regression).
- [x] Global Definition of Done passes.

---

## P4-US-03 - Eval evidence in the release gate

As a release approver for an AI-powered product, I want the gate to require linked eval-tool
evidence for AI components so that "the model behaves" is a verified claim.

### P4-T-004 - Accept and validate eval-report evidence for AI components

Status: Done
Priority: P2
Depends on: P4-T-001, P3-T-005 (gate evidence machinery)

Description: define a normalized eval-evidence format, parse the common tool outputs, and make the
enterprise gate require eval evidence for AI-marked RFs.

Implementation notes:

- `.qa-ai/scripts/lib/eval-results.mjs`: parse (a) promptfoo JSON output (results array with
  pass/fail per test) and (b) a documented generic schema
  `{ tool, createdAt, cases: [{ id, rfId?, name, pass, score?, threshold? }] }` for any other
  tool (DeepEval and others export adaptable JSON). Normalize to the same case model used by
  execution results where sensible.
- Config: extend `execution` with `evalResultsPaths: []` (globs).
- Extend `validate-execution-evidence.mjs` (from P3-T-005): when `aiTesting.enabled` and the
  traceability matrix contains AI-marked RFs, each such RF must have at least one eval case
  linked (rfId field or RF ID appearing in case name) and all linked eval cases must pass;
  failures name RF + case. Statistical scenarios (P4-T-003) cross-check: when a feature declares
  `P% of N runs`, a linked eval case with `score` and `threshold` must satisfy
  `score >= threshold` (the eval tool enforces the statistics; FlowKit verifies the recorded
  outcome).
- Gate: `release-gate.template.yaml` gains optional `evidence.evals` entries; enterprise `PASS`
  with AI-marked RFs requires the eval-evidence validation to pass (same pattern as execution
  evidence; `WAIVED` unchanged).
- Update `/qa-gate` adapter command text (bilingual) to collect eval evidence for AI components.

Acceptance criteria:

- [x] promptfoo-format and generic-format fixtures parse to the normalized model (unit tests,
      including malformed-file structured errors).
- [x] Enterprise fixture with an AI-marked RF: gate `PASS` fails without linked eval evidence,
      fails with a failing eval case (RF + case named), passes with passing evidence; non-AI RFs
      unaffected.
- [x] Statistical cross-check covered by tests (score below threshold fails).
- [x] `docs/qa-ai/ai-system-testing.md` and `docs/qa-ai/release-gate.md` document the evidence
      flow with a promptfoo example; `docs/qa-ai/config-schema.md` updated; README EN/ES feature
      lists mention AI-system testing support.
- [x] Global Definition of Done passes.
