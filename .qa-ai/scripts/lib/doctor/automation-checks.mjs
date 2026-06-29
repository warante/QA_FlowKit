import { isKarateFramework, karateConfigPath, karateFeatureRoots, usesKarate } from '../automation-framework.mjs';
import { getConfigValue } from '../utils.mjs';
import { anyPathCheck, checkLevel, isConfiguredFramework, pathCheck } from './report.mjs';

export function addAutomationChecks(checks, config, strict) {
  const uiFramework = String(getConfigValue(config, 'automation.ui.framework', 'none')).toLowerCase();
  const uiSpecsPath = getConfigValue(config, 'automation.ui.specsPath', '');
  const uiPageObjectsPath = getConfigValue(config, 'automation.ui.pageObjectsPath', '');
  const apiFramework = String(getConfigValue(config, 'automation.api.framework', 'none')).toLowerCase();
  const apiSpecsPath = getConfigValue(config, 'automation.api.specsPath', '');
  const mobileFramework = String(getConfigValue(config, 'automation.mobile.framework', 'none')).toLowerCase();
  const mobileFlowsPath = getConfigValue(config, 'automation.mobile.flowsPath', '');

  if (isConfiguredFramework(uiFramework)) {
    if (uiSpecsPath) checks.push(pathCheck('required', 'configured UI specs path', uiSpecsPath));
    if (uiPageObjectsPath && !isKarateFramework(uiFramework)) {
      checks.push(pathCheck('required', 'configured UI page objects path', uiPageObjectsPath));
    }
  }

  if (isConfiguredFramework(apiFramework)) {
    if (apiSpecsPath) checks.push(pathCheck('required', 'configured API specs path', apiSpecsPath));
  }

  if (isConfiguredFramework(mobileFramework) && mobileFlowsPath) {
    checks.push(pathCheck('required', 'configured mobile flows path', mobileFlowsPath));
  }

  if (usesKarate(config)) {
    const kConfig = karateConfigPath(config);
    checks.push(pathCheck(checkLevel(strict, 'optional'), 'Karate config file', kConfig));
    for (const root of karateFeatureRoots(config)) {
      checks.push(pathCheck('required', 'Karate feature root', root));
    }
  }

  if (uiFramework === 'webdriverio') {
    checks.push(
      anyPathCheck(checkLevel(strict, 'optional'), 'WebdriverIO config', [
        'wdio.conf.ts',
        'wdio.conf.js',
        'wdio.conf.mjs',
        'wdio.conf.cjs'
      ])
    );
  }

  if (uiFramework === 'selenium-jest-browserstack' || uiFramework === 'selenium') {
    checks.push(
      anyPathCheck(checkLevel(strict, 'optional'), 'Jest config', [
        'jest.config.ts',
        'jest.config.js',
        'jest.config.mjs',
        'jest.config.cjs'
      ])
    );
    checks.push(
      anyPathCheck(checkLevel(strict, 'optional'), 'BrowserStack config', ['browserstack.yml', 'browserstack.yaml'])
    );
  }

  if ((apiFramework === 'playwright-api' || apiFramework === 'playwright') && !isKarateFramework(apiFramework)) {
    checks.push(
      anyPathCheck(checkLevel(strict, 'optional'), 'Playwright API config', [
        'playwright.api.config.ts',
        'playwright.api.config.js',
        'playwright.config.ts',
        'playwright.config.js',
        'playwright.config.mjs'
      ])
    );
  }

  if (uiFramework === 'playwright' || uiFramework === 'playwright-ui') {
    checks.push(
      anyPathCheck(checkLevel(strict, 'optional'), 'Playwright UI config', [
        'playwright.config.ts',
        'playwright.config.js',
        'playwright.config.mjs'
      ])
    );
  }
}
