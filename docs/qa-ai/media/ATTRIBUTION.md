# Tutorial audio and media provenance

The published `qa-flowkit-rf101-demo.mp4` is the exact bilingual illustrated cut approved by the user.
It retains its on-screen preview/non-live label. It does not contain a recorded model session or invented model replies.
Its SHA-256 is recorded in [`demo.v1.json`](../demo.v1.json).

## Spanish (Spain), female

- Engine: Piper (local synthesis; engine binaries are not distributed here).
- Voice: `es_ES-sharvard-medium`, speaker `F`.
- [Voice model card](https://huggingface.co/rhasspy/piper-voices/blob/main/es/es_ES/sharvard/medium/MODEL_CARD).
- Corpus attribution: Aubanel, Vincent; Garcia Lecumberri, Maria Luisa; Cooke, Martin (2014),
  **Sharvard_IJA**, LISTA Consortium. [Dataset and citation](https://doi.org/10.7488/ds/75).
- The voice model card reports the dataset license as [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
- The tutorial narration is newly synthesized from its own script; the original corpus recordings are not included.

## English, female

- Engine: [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx) (MIT).
- Model: [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) (Apache 2.0).
- Voice: `af_heart`, English (United States).

## Included assets

The repository includes only the approved bilingual MP4, its generated GIF/thumbnail and matching English/Spanish
WebVTT captions. Model weights, voice packs, Python environments, individual audio clips and temporary rendering files
stay outside the repository. The production text is in [the storyboard](../agent-first-storyboard.v1.json).
Spoken abbreviations are expanded for pronunciation without changing their meaning.

The audio/visual tutorial was approved by the user. This is not independent security review, real-host E2E evidence
or release authorization.
