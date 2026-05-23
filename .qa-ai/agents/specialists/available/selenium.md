# Selenium Specialist

Use when `automation.ui.framework` is `selenium` or `selenium-jest-browserstack`.

## Focus

- Follow existing Selenium driver, page object, wait and fixture conventions.
- Prefer explicit waits around meaningful UI state instead of sleeps.
- Keep browser/session lifecycle clear and isolated.
- Treat cloud grid settings such as BrowserStack/Sauce/LambdaTest as configuration, not test logic.
- Do not change global driver, grid or runner config without approval.
