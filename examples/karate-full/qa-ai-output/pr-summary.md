# PR Summary

## Summary

Adds RF-201 design coverage and executable Karate API/UI tests against a local application.

## Validation

- `qa-flowkit validate-target`
- `qa-flowkit validate-karate-features`
- `npm run test:e2e-karate -- --runtime`

## Risks

Runtime execution requires Java and Chrome.
