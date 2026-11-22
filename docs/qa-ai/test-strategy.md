# Outcome-first strategy and local analysis

The [packaged strategy guide](../../.qa-ai/docs/test-strategy-guide.md) documents contrast-case clarification,
observable oracles, redesign before automation, benefit evaluation, ACC capability coverage and maintenance analysis.
The changes are additive and advisory: no new mandatory phase, public config key, Gherkin type or semantic gate.

Run the standalone script inside an initialized target repository:

```bash
node .qa-ai/scripts/analyze-test-strategy.mjs --json
node .qa-ai/scripts/analyze-test-strategy.mjs --maintenance --results observations.json --json
```

It reads local artifacts, exact Feature-title metadata and optionally bounded Git history and supplied observations.
It never changes tests, canonical mappings, quarantine or external systems. Missing sections preserve compatibility.
Structural findings do not establish semantic correctness, confirmed flakiness, human approval or business benefit.

Development checks:

```bash
npm run test:strategy-analysis
npm run test:strategy-evaluation
```

The second command compares synthetic baseline/candidate tables and emits a JSON report including limitations.
An intentionally incorrect but fully populated oracle demonstrates why structural completeness cannot replace review.
Independent semantic acceptance and pilots remain at the end of the implementation-first schedule.

See the [incorporation plan](../../tasks/PRODUCT-STRATEGY-INCORPORATION.md) and
[final acceptance queue](../../tasks/FINAL-ACCEPTANCE.md).
