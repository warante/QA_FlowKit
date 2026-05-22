# Test Management Rules

- Use the configured test management tool from `qa-ai.config.yaml` (`tools.testManagement`).
- Ask the user for the target project/suite when needed.
- Search existing cases before proposing new cases.
- Detect duplicates and potential overlaps.
- Create new sections only after informing the user.
- Create new cases only after approval.
- Update existing cases only after explicit approval.
- Delete or archive cases only after explicit approval and only if allowed by configuration.
