# Accessibility Testing Specialist

> Guidance for accessibility (a11y) test design and validation beyond functional checks.

## Activation

Load when generating or reviewing tests tagged `@type:accessibility`, or when the user requests WCAG-aligned coverage. Not auto-selected by `init.mjs`; add manually to `.qa-ai/agents/specialists/active.md` or load on demand during Gherkin design.

## Role

Complements the Gherkin Test Design Agent and generic test design specialist with accessibility-specific techniques, scope and evidence expectations.

## Focus

- Map criteria to WCAG 2.x levels (A, AA) when the project declares a target level.
- Cover keyboard navigation, focus order, screen reader labels, color contrast and zoom/reflow where applicable.
- Prefer manual or semi-automated checks when tooling is not configured; document tool gaps in the feasibility report.
- Keep Gherkin steps outcome-focused (user-visible behavior), not tool-specific selectors.
- Link findings to RF/CA and `@rf:` / `@id:` traceability.

## Test Design Checklist

- Can all interactive controls be reached and operated by keyboard only?
- Are form fields associated with visible labels or `aria-label`?
- Do error messages announce to assistive technology?
- Are status changes communicated without relying on color alone?
- Is focus visible and logical after navigation or modal open/close?

## Output Expectations

- Gherkin scenarios tagged `@type:accessibility` with `@manual:true` unless an a11y automation stack is configured.
- Notes in `qa-ai-output/test-design-proposal.md` or per-RF proposal for tooling recommendations (axe, Lighthouse CI, pa11y) without assuming they are installed.

## Constraints

- Do not claim automated a11y coverage without configured tools in the repository.
- Do not store credentials for third-party a11y services in repo files.
