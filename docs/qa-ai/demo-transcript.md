# Agent-First Tutorial Transcript and Captions

This transcript describes the new **illustrated tutorial**, not a real recorded model session.
The historical published MP4 and its captions remain separate until the replacement preview is approved.
The rejected CLI fixture preview is not the intended user journey.

## Alt text

Instructional cards show one installation command in the terminal, followed by slash commands inside the model's
CLI: guided setup, optional team context, setup health, recommended next action, RF-101 workflow, review, validation
and status. There are no invented model replies or test results. Spanish and English narration and captions accompany
the preview; its permanent label identifies it as illustrated and non-live.

## Captions

The exact bilingual narration is versioned in [agent-first-storyboard.v1.json](agent-first-storyboard.v1.json).
The renderer generates separate English/Spanish VTT and embedded subtitle tracks from that same source, rather than
maintaining a second narration script here.

| Time      | User action                                                                      | Acción del usuario                                                           |
| --------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 0:00–0:10 | Install with `npx qa-flowkit`; choose the adapter.                               | Instala con `npx qa-flowkit` y elige el adaptador.                           |
| 0:10–0:28 | Open the model's CLI; configure with `/qa-init`.                                 | Abre el CLI del modelo y configura con `/qa-init`.                           |
| 0:28–0:42 | Optional context-aware start: `/qa-init --qa-context qa-ai-knowledge`.           | Inicio alternativo con contexto: `/qa-init --qa-context qa-ai-knowledge`.    |
| 0:42–0:54 | Check setup with `/qa-doctor`; ask `/qa-help`.                                   | Comprueba con `/qa-doctor` y consulta `/qa-help`.                            |
| 0:54–1:16 | Use `/qa-full-flow` with the requirement; confirm RF-101.                        | Usa `/qa-full-flow` con el requisito y confirma RF-101.                      |
| 1:16–1:30 | Review proposals and decide approvals in the conversation.                       | Revisa propuestas y decide las aprobaciones en la conversación.              |
| 1:30–1:42 | Validate Gherkin with `/qa-validate-features`.                                   | Valida Gherkin con `/qa-validate-features`.                                  |
| 1:42–1:55 | Review `/qa-status` and `/qa-help`; use `/qa-add-tests` for another requirement. | Consulta `/qa-status` y `/qa-help`; usa `/qa-add-tests` para otro requisito. |

## Static fallback

Read the [quick start](getting-started.md) or [guía rápida](getting-started.es.md) and follow the slash commands in
your own model session. [demo-script.md](demo-script.md) explains the cards and the split between installation,
agent use and optional terminal alternatives.

The historical media and VTT are still linked from [demo.md](demo.md); their captions do not describe this preview.

## Claims to avoid

- Do not call illustrated cards a live OpenCode/Claude session or evidence that a model ran.
- Do not claim that narration, instructions or a status command prove tests passed or approvals were given.
- Do not turn low-level fixture replay into the primary user journey.
- Do not imply external synchronization, a created GitHub PR, automatic approvals or release authorization.
