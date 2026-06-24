---
rubricVersion: 1
---

# Gherkin Quality Rubric

Use this rubric to evaluate generated Gherkin scenarios. Each criterion is binary: mark `pass` only when the feature
file provides direct evidence, otherwise mark `fail`. Do not assign numeric scores.

## requirement-fidelity

Definition: the scenario verifies the RF's acceptance criteria, not adjacent behavior.

Spanish guidance: verifica los criterios de aceptacion del RF, no comportamiento cercano o supuesto.

- The scenario title or steps clearly trace to the RF or acceptance criterion under evaluation.
- The expected outcome matches a documented acceptance criterion.
- The scenario does not introduce unrelated product behavior as required behavior.

## observability

Definition: every Then asserts an externally observable outcome.

Spanish guidance: cada Then debe comprobar un resultado visible desde fuera del sistema.

- Each `Then` step names a visible UI, API, data, message, state or integration outcome.
- Assertions avoid invisible implementation details unless the RF explicitly requires them.
- The scenario includes enough observable evidence to know whether it passed.

## atomicity

Definition: one behavior per scenario; steps are single actions/assertions.

Spanish guidance: un comportamiento por escenario; cada paso expresa una sola accion o verificacion.

- The scenario focuses on one business behavior or rule.
- `When` steps do not combine unrelated user actions.
- `Then` steps do not bundle multiple independent assertions.

## determinism

Definition: no time/order/environment dependence without explicit control.

Spanish guidance: evita dependencia de hora, orden o entorno salvo que este controlada explicitamente.

- Time-sensitive behavior uses fixed data, controlled clocks or explicit waiting conditions.
- The scenario does not depend on execution order with other scenarios.
- Environment assumptions are stated as Given steps or controlled test data.

## data-independence

Definition: no hardcoded environment-specific data; parameters named.

Spanish guidance: evita datos especificos de entorno; usa parametros o nombres de datos claros.

- Test data is named by purpose instead of raw private, production or environment-specific values.
- Credentials, tokens, personal data and private URLs are absent.
- Variable data is expressed through examples, parameters or fixtures.

## ui-overspecification

Definition: no incidental UI details unless the RF requires them.

Spanish guidance: no fuerces detalles incidentales de UI salvo que el RF los exija.

- Steps avoid exact copy, colors, pixel positions or layout details unless required by the RF.
- The scenario describes user-visible intent rather than selector or DOM implementation details.
- UI assertions focus on business meaning and accessibility-relevant outcomes.

## language-clarity

Definition: declarative business language, consistent with `gherkin.language`.

Spanish guidance: usa lenguaje declarativo de negocio y respeta `gherkin.language`.

- Steps are readable by QA/product stakeholders without implementation jargon.
- The feature uses the configured Gherkin language consistently.
- Scenario names are specific, concise and outcome-oriented.

## source-criterion-alignment

Definition: scenario conditions and outcomes align with the linked normalized criterion or CA.

Spanish guidance: las condiciones y resultados del escenario coinciden con el criterio normalizado o CA vinculado.

- Given/When steps reflect the source criterion condition or partition under test.
- Then steps assert the documented expected observable outcome, including final state when required.
- Boundary scenarios use the approved threshold values from the normalized criterion, not a reinterpreted limit.
- The quality report cites the normalized criterion ID or CA and the matching Gherkin steps as evidence.
