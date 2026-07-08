# RF-101 Demo Transcript and Captions

Accessible narration for the TASK-057 recorded demo. Pair with [`demo-script.md`](demo-script.md) when regenerating the
video, or use this file with [`demo.md`](demo.md) for a text-first walkthrough.

## Alt text

**Static workflow diagram:** A left-to-right flow labeled RF-101 login requirement passes through intake, normalization,
Gherkin design, traceability and PR summary. A validator rejects Gherkin missing the manual tag, the feature is
corrected, and strict target validation passes. No external tools or network services appear in the diagram.

**Terminal capture:** A dark terminal shows `npx qa-flowkit` quick-track commands, a JSON validator failure for a
missing `@manual:true` tag, the corrected feature passing `run check`, and `validate-target` exiting successfully.

**Recorded media:** The MP4 is [`media/qa-flowkit-rf101-demo.mp4`](media/qa-flowkit-rf101-demo.mp4), with external
caption tracks in [`media/qa-flowkit-rf101-demo.en.vtt`](media/qa-flowkit-rf101-demo.en.vtt) and
[`media/qa-flowkit-rf101-demo.es.vtt`](media/qa-flowkit-rf101-demo.es.vtt).

## Captions

| Time | Caption                                                                                  |
| ---- | ---------------------------------------------------------------------------------------- |
| 0:00 | RF-101: a registered user logs in with email and password.                               |
| 0:05 | QA FlowKit installs a quick-track workflow in the target repository.                     |
| 0:12 | `init` creates framework files, config and output folders.                               |
| 0:18 | `run start --rf RF-101` opens a resumable governed run.                                  |
| 0:25 | Requirement analysis and normalized acceptance criteria are saved under `qa-ai-output/`. |
| 0:32 | `run check` confirms the phase before advancing.                                         |
| 0:38 | Test-design approval is recorded before Gherkin generation.                              |
| 0:45 | A feature file is created for RF-101 TC-001.                                             |
| 0:52 | The validator rejects Gherkin missing `@manual:true`.                                    |
| 0:58 | The run stays on the Gherkin phase; nothing is lost.                                     |
| 1:05 | The corrected feature includes required tags and acceptance criteria.                    |
| 1:12 | `run check` passes and moves to traceability.                                            |
| 1:20 | Traceability links RF-101 to TC-001 and CA-101-1.                                        |
| 1:28 | A PR summary lists scope and validation evidence.                                        |
| 1:35 | Run status shows every phase completed.                                                  |
| 1:42 | `validate-target` runs the strict repository gate.                                       |
| 1:50 | All validators pass without external credentials.                                        |
| 1:55 | Replay with `npm run test:e2e-quick` from the source repository.                         |

## Static fallback

If the recording cannot be played in the current viewer:

1. Read [`demo.md`](demo.md) for the story and expected E2E summary.
2. Run `npm run test:e2e-quick` from a QA FlowKit checkout.
3. Inspect fixtures under [`test/fixtures/quick-path/`](../../test/fixtures/quick-path/).

The automated path proves the same failure and correction shown in the captions.

## Claims to avoid

Do **not** state or imply:

- automatic creation or update of Jira, TestRail, Zephyr or Xray records;
- guaranteed model or LLM execution inside QA FlowKit;
- unsupported security or productivity guarantees.

QA FlowKit governs repository artifacts and deterministic validation; external writes remain proposal-first.
