# Appium Specialist

> Inherits .qa-ai/rules/specialist-common.rules.md.

> Framework-specific guidance for mobile UI automation with Appium.

## Activation

Use when `automation.ui.framework` or `automation.mobile.framework` is `appium`.

## Role

Complements the UI Automation Implementation Agent by providing Appium-specific patterns, conventions and constraints. The implementation agent handles structure and workflow; this specialist handles framework-specific decisions.

## Focus

- Follow existing Appium capabilities, driver lifecycle and page/screen object conventions.
- Prefer accessibility identifiers (`accessibility id` strategy) as the primary locator.
- Keep platform-specific behavior explicit with separate screen objects or conditional logic.
- Avoid arbitrary waits; wait for app state or element readiness using explicit waits.
- Do not change device, grid or cloud provider config without approval.

## Locator Strategy (by priority)

1. `accessibility id` (works cross-platform, most stable).
2. `id` / `resource-id` (Android) or `name` (iOS).
3. `-ios predicate string` / `-android uiautomator` (platform-specific, powerful).
4. `xpath` (last resort, fragile, slow).

## Platform-Specific Patterns

- **Android**: Use `UiSelector` and `UiScrollable` for complex interactions. Handle back button and system dialogs explicitly.
- **iOS**: Use predicate strings for efficient element queries. Handle permission dialogs with alert handling capabilities.
- **Cross-platform**: Create a base screen object with platform-specific implementations when behavior diverges.

## Screen Object Pattern

- One screen object per screen/view (not per element group).
- Expose actions: `loginScreen.login(user, pass)` not raw element access.
- Use platform-conditional selectors internally.
- Handle platform transitions (loading spinners, animations) inside screen object methods.

## Anti-Patterns to Avoid

- `Thread.sleep()` or fixed delays — use WebDriverWait with expected conditions.
- Sharing driver sessions across tests — isolate completely.
- Hardcoded capabilities — use config files per device/environment.
- XPath chains longer than 2 levels — find a better locator strategy.
- Testing on a single device/OS version — document multi-device test matrix.

## Gesture Handling

- Swipe, scroll, long-press: use W3C Actions API (not deprecated TouchAction).
- Document gesture coordinates relative to screen percentage, not absolute pixels.
- Create reusable gesture helpers in a dedicated module.

## Constraints

- Do not change device capabilities, Appium server config or cloud provider settings without approval.
- Do not assume specific OS version or device; use capabilities from config.
- Do not store device farm credentials in test files.
