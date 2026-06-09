# Intake Workflow

Read requirement sources, normalize scope, extract RF/CA, identify ambiguity and output requirement analysis.

When the user provides mixed inputs, inspect all available sources before analysis:

- Text, Markdown, user stories and acceptance criteria: analyze directly.
- PDF, spreadsheet, image or HTML: use host capabilities when available and record the extraction method.
- URL or design reference: treat as a reference until the host successfully reads it.

The configured requirement source remains authoritative. Supporting design sources may add visual states and UI edge
cases but must not silently override functional requirements.

Write `sources.analysisPath` when mixed sources are used. Include source authority, extraction status, agreements,
contradictions, limitations and pending decisions. Never claim inaccessible content was processed.
