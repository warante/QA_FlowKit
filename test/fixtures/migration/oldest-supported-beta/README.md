# Oldest supported beta migration fixture

Simulates a target repository on the `0.5.0-beta.0` configuration contract before running
`npx qa-flowkit update` from a newer package.

The end-to-end migration runner overlays these files after a baseline `init`, starts an active harness run, and
verifies that `update` preserves user-owned artifacts, config profiles, harness state and adapter customizations.

Marker constant: `QA_FLOWKIT_MIGRATION_FIXTURE_MARKER`
