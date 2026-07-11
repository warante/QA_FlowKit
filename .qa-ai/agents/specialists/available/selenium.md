# Selenium Specialist

> Inherits .qa-ai/rules/specialist-common.rules.md.

> Framework-specific guidance for UI/E2E automation with Selenium WebDriver.

## Activation

Use when `automation.ui.framework` is `selenium`, `selenium-jest-browserstack`, or any Selenium-based setup.

## Role

Complements the UI Automation Implementation Agent by providing Selenium-specific patterns, wait strategies and constraints. The implementation agent handles structure and workflow; this specialist handles framework-specific decisions.

## Focus

- Follow existing Selenium driver, page object, wait and fixture conventions.
- Prefer explicit waits around meaningful UI state instead of sleeps.
- Keep browser/session lifecycle clear and isolated.
- Treat cloud grid settings (BrowserStack, Sauce Labs, LambdaTest) as configuration, not test logic.
- Do not change global driver, grid or runner config without approval.

## Locator Strategy (by priority)

1. `By.id()` — unique and stable.
2. `By.cssSelector('[data-testid="..."]')` — dedicated test attributes.
3. `By.name()` / `By.linkText()` — semantic.
4. `By.cssSelector()` — structured CSS paths.
5. `By.xpath()` — last resort for complex DOM traversal.

## Explicit Wait Pattern

```java
// Preferred: explicit wait with expected condition
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
WebElement element = wait.until(
    ExpectedConditions.visibilityOfElementLocated(By.id("submit"))
);
element.click();
```

Never use `Thread.sleep()` or implicit waits as primary strategy.

## Page Object Model Structure

```java
public class LoginPage {
    private final WebDriver driver;
    private final By emailInput = By.id("email");
    private final By passwordInput = By.id("password");
    private final By submitButton = By.id("submit");

    public LoginPage(WebDriver driver) {
        this.driver = driver;
    }

    public DashboardPage login(String email, String password) {
        driver.findElement(emailInput).sendKeys(email);
        driver.findElement(passwordInput).sendKeys(password);
        driver.findElement(submitButton).click();
        return new DashboardPage(driver);
    }
}
```

## Grid vs Local Execution

- Keep driver instantiation in a factory or base test class.
- Grid configuration (URLs, capabilities) lives in config/environment, not in test code.
- Tests should not know whether they run locally or on a grid.
- Use capabilities objects from config files for BrowserStack/Sauce/LambdaTest.

## Anti-Patterns to Avoid

- `Thread.sleep()` — use explicit waits with ExpectedConditions.
- Implicit waits mixed with explicit waits — they interfere; pick one (prefer explicit).
- Raw `driver.findElement()` in spec files — put in page objects.
- Not quitting the driver in teardown — leads to zombie sessions.
- Hardcoded URLs or credentials in page objects.
- StaleElementReferenceException not handled — re-locate elements after page transitions.

## Session Lifecycle

- Create driver in setup, quit in teardown. No exceptions.
- Use `@BeforeEach` / `beforeEach` for fresh session per test.
- Handle unexpected alerts and popups in a base test class.

## Constraints

- Do not change WebDriver, grid or runner config without approval.
- Do not add dependencies (drivers, browser binaries) without approval.
- Do not hardcode grid URLs or access keys in test files.
- Keep tests executable both locally and on grid without code changes.
