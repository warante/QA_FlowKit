# Governed Test Healing Workflow / Flujo de Trabajo de Sanación de Pruebas Gobernada

---

## English Version

This workflow runs when a test automation suite needs to repair broken selectors, flaky steps, or incorrect locator references, but must protect Gherkin features and business requirements from automated modifications.

### Prerequisites

- Configured track (standard/enterprise) has `automation.healing.enabled` set to `true`.
- Test implementation files (e.g. spec files) exist.
- A test failure exists that requires healing.

### Steps

1. Read `AGENTS.md`, `.qa-ai/qa-ai.config.yaml`, `.qa-ai/rules/automation.rules.md` and `.qa-ai/agents/test-healing-agent.md`.
2. Analyze the failure evidence (e.g. test runner logs, stdout, selector errors).
3. Identify the target spec or automation file requiring adjustment.
4. **Safety Check**: Verify that the files being modified are ONLY automation spec files (never `.feature` design files or business expected outcomes).
5. Perform the repair on the spec/helper files.
6. Create or update `.qa-ai/output/healing-log.md` detailing the healed test case ID, target files repaired, the type of repair (`locator`, `wait`, `cleanup`, `data`), and a justification (minimum 30 characters).
7. Run `node .qa-ai/scripts/validate-healing-log.mjs` to ensure the log is valid.
8. If design changes (like Gherkin expected outcomes) are required to fix the test, DO NOT heal them here. Terminate and instruct the user to run `/qa-update-tests` instead.

---

## Versión en Español

Este flujo de trabajo se ejecuta cuando un conjunto de pruebas automatizadas necesita reparar selectores rotos, pasos inestables o referencias de localizadores incorrectas, protegiendo las características de Gherkin y los requisitos comerciales de modificaciones automatizadas.

### Prerrequisitos

- La pista configurada (standard/enterprise) tiene `automation.healing.enabled` establecido en `true`.
- Existen archivos de implementación de prueba (por ejemplo, archivos de especificaciones).
- Existe una falla en la prueba que requiere sanación.

### Pasos

1. Leer `AGENTS.md`, `.qa-ai/qa-ai.config.yaml`, `.qa-ai/rules/automation.rules.md` y `.qa-ai/agents/test-healing-agent.md`.
2. Analizar la evidencia del fallo (por ejemplo, registros del ejecutor de pruebas, stdout, errores de selectores).
3. Identificar el archivo de especificación o automatización que requiere ajuste.
4. **Verificación de Seguridad**: Verificar que los archivos que se modifican sean ÚNICAMENTE archivos de especificación de automatización (nunca archivos de diseño `.feature` ni resultados esperados del negocio).
5. Realizar la reparación en los archivos de especificaciones o auxiliares.
6. Crear o actualizar `.qa-ai/output/healing-log.md` detallando el ID del caso de prueba sanado, los archivos de destino reparados, el tipo de reparación (`locator`, `wait`, `cleanup`, `data`) y una justificación (mínimo 30 caracteres).
7. Ejecutar `node .qa-ai/scripts/validate-healing-log.mjs` para garantizar que el registro sea válido.
8. Si se requieren cambios de diseño (como resultados esperados de Gherkin) para solucionar la prueba, NO los sane aquí. Cancele e indique al usuario que ejecute `/qa-update-tests` en su lugar.
