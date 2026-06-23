# RF-020 performance measurement plan

## Operation

Load booking summary for a signed-in user with a confirmed itinerary.

## Metric

First meaningful paint (FMP) on the summary screen.

## Threshold

FMP <= 2 seconds per session on the reference mid-tier device profile.

## Environment

Staging build with production-like API latency stubbed to p50 120 ms.

## Method

1. Warm cache once, then capture three cold navigations.
2. Record FMP via Lighthouse or Playwright trace.
3. Fail the run if any cold navigation exceeds 2 s.
