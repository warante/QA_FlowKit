import { defaultKarateApiSpecsPath, defaultKarateUiSpecsPath, isKarateFramework } from '../automation-framework.mjs';
import { isConfiguredFramework, slug } from '../project-config.mjs';
import { validateConfigContent } from '../config-schema.mjs';
import { commaList, findChangeMeKeys, getConfigValue, parseSimpleYaml, yamlScalar } from '../utils.mjs';

export function scalarOverrideValue(value) {
  if (value === undefined || value === null || value === false) return null;
  return yamlScalar(String(value));
}

export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function setSimpleYamlScalar(content, keyPath, value) {
  const parts = String(keyPath || '')
    .split('.')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return content;

  const lines = content.replace(/\r/g, '').split('\n');
  let searchStart = 0;
  let parentIndent = -1;

  for (let depth = 0; depth < parts.length - 1; depth += 1) {
    const key = parts[depth];
    const pattern = new RegExp(`^(\\s*)${escapeRegExp(key)}:\\s*$`);
    let foundIndex = -1;
    let foundIndent = -1;
    for (let i = searchStart; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line.trim() || line.trim().startsWith('#')) continue;
      const indent = line.match(/^ */)?.[0].length ?? 0;
      if (parentIndent >= 0 && indent <= parentIndent) break;
      const match = line.match(pattern);
      if (match) {
        foundIndex = i;
        foundIndent = match[1].length;
        break;
      }
    }
    if (foundIndex === -1) return content;
    searchStart = foundIndex + 1;
    parentIndent = foundIndent;
  }

  const target = parts.at(-1);
  const targetPattern = new RegExp(`^(\\s*)${escapeRegExp(target)}:\\s*.*$`);
  for (let i = searchStart; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const indent = line.match(/^ */)?.[0].length ?? 0;
    if (parentIndent >= 0 && indent <= parentIndent) break;
    const match = line.match(targetPattern);
    if (match) {
      lines[i] = `${match[1]}${target}: ${value}`;
      return lines.join('\n');
    }
  }

  const indent = parentIndent >= 0 ? ' '.repeat(parentIndent + 2) : '';
  lines.splice(searchStart, 0, `${indent}${target}: ${value}`);
  return lines.join('\n');
}

export function isEnabled(value) {
  return (
    value === true ||
    String(value || '')
      .trim()
      .toLowerCase() === 'true'
  );
}

export function isConfiguredTool(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return Boolean(normalized) && !['none', 'undecided', 'n/a', 'na'].includes(normalized);
}

export function configOverrides({
  currentConfig = {},
  projectName,
  args,
  interfaceLanguage,
  gherkinLanguage,
  validatedQaContextPath
}) {
  const uiFramework = args['ui-framework'] || args.uiFramework;
  const apiFramework = args['api-framework'] || args.apiFramework;
  const mobileFramework = args['mobile-framework'] || args.mobileFramework;
  const testManagementTool = args['test-management-tool'] || args.testManagementTool;
  const uiSpecsPath = args['ui-specs-path'] || args.uiSpecsPath;
  const uiPageObjectsPath = args['ui-page-objects-path'] || args.uiPageObjectsPath;
  const apiSpecsPath = args['api-specs-path'] || args.apiSpecsPath;
  const mobileFlowsPath = args['mobile-flows-path'] || args.mobileFlowsPath;
  const normalizedUiFramework = slug(uiFramework);
  const normalizedApiFramework = slug(apiFramework);
  const normalizedMobileFramework = slug(mobileFramework);
  const currentUiFramework = slug(getConfigValue(currentConfig, 'automation.ui.framework', ''));
  const currentApiFramework = slug(getConfigValue(currentConfig, 'automation.api.framework', ''));
  const currentMobileFramework = slug(getConfigValue(currentConfig, 'automation.mobile.framework', ''));
  const overrides = [
    ['project.name', projectName],
    ['project.defaultLanguage', interfaceLanguage],
    ['project.interfaceLanguage', interfaceLanguage],
    ['project.qaTrack', args['qa-track'] || args.qaTrack],
    ['gherkin.language', gherkinLanguage],
    ['gherkin.scenarioLayout', args['scenario-layout'] || args.scenarioLayout],
    ['knowledge.enabled', validatedQaContextPath ? 'true' : undefined],
    ['knowledge.sourcePath', validatedQaContextPath],
    ['sources.main', args['requirements-source'] || args.requirementsSource],
    ['tools.testManagement', testManagementTool],
    ['tools.issueTracker', args['issue-tracker'] || args.issueTracker],
    ['agents.specialistMode', args['specialist-mode'] || args.specialistMode],
    ['automation.ui.framework', uiFramework],
    ['automation.api.framework', apiFramework],
    ['automation.mobile.framework', mobileFramework],
    ['automation.ui.specsPath', uiSpecsPath],
    ['automation.ui.pageObjectsPath', uiPageObjectsPath],
    ['automation.api.specsPath', apiSpecsPath],
    ['automation.mobile.flowsPath', mobileFlowsPath]
  ];

  if (uiFramework && normalizedUiFramework !== currentUiFramework && !uiSpecsPath && isKarateFramework(uiFramework)) {
    overrides.push(['automation.ui.specsPath', defaultKarateUiSpecsPath()]);
    overrides.push(['automation.ui.pageObjectsPath', '']);
  } else if (
    uiFramework &&
    normalizedUiFramework !== currentUiFramework &&
    !uiSpecsPath &&
    normalizedUiFramework !== 'webdriverio'
  ) {
    overrides.push([
      'automation.ui.specsPath',
      isConfiguredFramework(uiFramework) ? ['tests', slug(uiFramework), 'specs'].join('/') : ''
    ]);
  }
  if (
    uiFramework &&
    normalizedUiFramework !== currentUiFramework &&
    !uiPageObjectsPath &&
    isKarateFramework(uiFramework)
  ) {
    overrides.push(['automation.ui.pageObjectsPath', '']);
  } else if (
    uiFramework &&
    normalizedUiFramework !== currentUiFramework &&
    !uiPageObjectsPath &&
    normalizedUiFramework !== 'webdriverio'
  ) {
    overrides.push([
      'automation.ui.pageObjectsPath',
      isConfiguredFramework(uiFramework) ? ['tests', slug(uiFramework), 'pageobjects'].join('/') : ''
    ]);
  }
  if (
    apiFramework &&
    normalizedApiFramework !== currentApiFramework &&
    !apiSpecsPath &&
    isKarateFramework(apiFramework)
  ) {
    overrides.push(['automation.api.specsPath', defaultKarateApiSpecsPath()]);
  } else if (
    apiFramework &&
    normalizedApiFramework !== currentApiFramework &&
    !apiSpecsPath &&
    normalizedApiFramework !== 'playwright-api'
  ) {
    overrides.push([
      'automation.api.specsPath',
      isConfiguredFramework(apiFramework) ? ['tests', slug(apiFramework), 'specs'].join('/') : ''
    ]);
  }
  if (mobileFramework && normalizedMobileFramework !== currentMobileFramework && !mobileFlowsPath) {
    overrides.push([
      'automation.mobile.flowsPath',
      isConfiguredFramework(mobileFramework) ? ['tests', slug(mobileFramework), 'flows'].join('/') : ''
    ]);
  }
  if (testManagementTool) {
    const isTestrail = String(testManagementTool).trim().toLowerCase() === 'testrail';
    overrides.push(['testManagement.enabled', isTestrail ? 'true' : 'false']);
    overrides.push(['testrail.enabled', isTestrail ? 'true' : 'false']);
    if (!isTestrail) {
      overrides.push(['testManagement.mappingFile', '']);
      overrides.push(['testrail.mappingFile', '']);
    }
  }

  const effectiveTestManagementTool = testManagementTool || getConfigValue(currentConfig, 'tools.testManagement', '');
  const testrailEnabled = isEnabled(getConfigValue(currentConfig, 'testrail.enabled', false));
  const hasTestManagement =
    isConfiguredTool(effectiveTestManagementTool) ||
    testrailEnabled ||
    String(effectiveTestManagementTool || '')
      .trim()
      .toLowerCase() === 'testrail';
  if (hasTestManagement) {
    overrides.push([
      'testrail.projectName',
      args['test-management-project'] || args.testManagementProject || projectName
    ]);
  }

  for (const item of commaList(args.set)) {
    const equalsIndex = item.indexOf('=');
    if (equalsIndex <= 0) {
      throw new Error(`Invalid --set value: ${item}. Use key.path=value.`);
    }
    overrides.push([item.slice(0, equalsIndex).trim(), item.slice(equalsIndex + 1).trim()]);
  }

  return overrides.map(([key, value]) => [key, scalarOverrideValue(value)]).filter(([, value]) => value !== null);
}

export function personalizeConfig({
  content,
  projectName,
  args,
  interfaceLanguage,
  gherkinLanguage,
  validatedQaContextPath
}) {
  let updated = content;
  const currentConfig = parseSimpleYaml(updated);
  for (const [key, value] of configOverrides({
    currentConfig,
    projectName,
    args,
    interfaceLanguage,
    gherkinLanguage,
    validatedQaContextPath
  })) {
    updated = setSimpleYamlScalar(updated, key, value);
  }
  return updated;
}

export function assertNoChangeMe(content) {
  const keys = findChangeMeKeys(content);
  if (keys.length === 0) return;
  const message = [
    'Generated qa-ai.config.yaml still contains CHANGE_ME placeholders:',
    ...keys.map((key) => `- ${key}`),
    'Pass explicit init flags or --set key=value overrides for these keys.'
  ].join('\n');
  throw new Error(message);
}

export async function assertValidConfig(content, cwd) {
  const result = await validateConfigContent(content, cwd);
  if (result.ok) return;
  const message = [
    'Generated qa-ai.config.yaml failed schema validation:',
    ...result.errors.map((error) => `- ${error}`)
  ].join('\n');
  throw new Error(message);
}
