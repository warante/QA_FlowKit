import fs from 'node:fs/promises';
import path from 'node:path';

const evergreenVersionFiles = ['README.md', 'README.es.md', 'SECURITY.md', 'ROADMAP.md', 'CONTRIBUTING.md'];
const ignoredDirectoryNames = new Set([
  '.git',
  '.npm-cache',
  'node_modules',
  'coverage',
  'test-results',
  'playwright-report',
  'allure-report',
  'allure-results'
]);
const ignoredDirectoryPrefixes = ['.qa-flowkit-npm-'];
const markdownSourceDirectories = [
  '.github',
  '.qa-ai/agents',
  '.qa-ai/rules',
  '.qa-ai/workflows',
  'docs',
  'examples',
  'tasks'
];
const requiredValidationCommands = [
  'npm ci',
  'npm run lint',
  'npm run format:check',
  'npm run docs:check',
  'npm run validate:oss-extraction',
  'node .github/scripts/verify-npm-pack.mjs'
];

function lineNumberAt(content, index) {
  return content.slice(0, index).split('\n').length;
}

function shouldIgnoreDirectory(name) {
  return ignoredDirectoryNames.has(name) || ignoredDirectoryPrefixes.some((prefix) => name.startsWith(prefix));
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function walkMarkdownFiles(root, current = root, results = []) {
  const entries = await fs.readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && shouldIgnoreDirectory(entry.name)) continue;

    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      await walkMarkdownFiles(root, fullPath, results);
    } else if (entry.name.endsWith('.md')) {
      results.push(path.relative(root, fullPath).replace(/\\/g, '/'));
    }
  }
  return results.sort();
}

async function sourceMarkdownFiles(repoRoot) {
  const rootEntries = await fs.readdir(repoRoot, { withFileTypes: true });
  const results = rootEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name);

  for (const relativeDirectory of markdownSourceDirectories) {
    const absoluteDirectory = path.join(repoRoot, relativeDirectory);
    if (await pathExists(absoluteDirectory)) {
      await walkMarkdownFiles(repoRoot, absoluteDirectory, results);
    }
  }

  return [...new Set(results)].sort();
}

async function readFiles(repoRoot, relativePaths) {
  const contents = new Map();
  for (const relativePath of relativePaths) {
    contents.set(relativePath, await fs.readFile(path.join(repoRoot, relativePath), 'utf8'));
  }
  return contents;
}

export function findStaleEvergreenVersions(fileContents) {
  const errors = [];
  const stalePrereleasePattern = /\b0\.\d+\.\d+-(?:alpha|beta|rc)(?:\.(?:\d+|x|\*))?\b/gi;

  for (const [relativePath, content] of fileContents) {
    for (const match of content.matchAll(stalePrereleasePattern)) {
      errors.push(
        `${relativePath}:${lineNumberAt(content, match.index)} uses exact prerelease ${match[0]}; ` +
          'evergreen docs must use an npm dist-tag or lifecycle name'
      );
    }
  }
  return errors;
}

export function validateLifecycleClaims(fileContents) {
  const errors = [];
  const englishReadme = fileContents.get('README.md') ?? '';
  const spanishReadme = fileContents.get('README.es.md') ?? '';
  const security = fileContents.get('SECURITY.md') ?? '';

  if (!/QA FlowKit[^.\n]*\*\*Release Candidate\*\*/i.test(englishReadme)) {
    errors.push('README.md must identify the current product lifecycle as Release Candidate');
  }
  if (!/QA FlowKit[^.\n]*\*\*(?:Release Candidate|candidato a versión estable \(RC\))\*\*/i.test(spanishReadme)) {
    errors.push('README.es.md must identify the current product lifecycle as Release Candidate');
  }
  if (!/project is currently in Release Candidate \(RC\)/i.test(security)) {
    errors.push('SECURITY.md must identify the current product lifecycle as Release Candidate (RC)');
  }
  if (/project is currently in MVP stage/i.test(security)) {
    errors.push('SECURITY.md must not describe the current product lifecycle as MVP');
  }

  return errors;
}

function auditLevels(content) {
  return [...content.matchAll(/npm audit --audit-level=(low|moderate|high|critical)/g)].map((match) => match[1]);
}

export function validateAuditDocumentation(ciContent, securityContent) {
  const errors = [];
  const workflowLevels = [...new Set(auditLevels(ciContent))];
  const documentedLevels = [...new Set(auditLevels(securityContent))];

  if (workflowLevels.length === 0) {
    errors.push('.github/workflows/ci.yml does not declare an npm audit threshold');
    return errors;
  }
  if (workflowLevels.length > 1) {
    errors.push(`CI uses inconsistent npm audit thresholds: ${workflowLevels.join(', ')}`);
  }
  if (documentedLevels.length !== 1 || documentedLevels[0] !== workflowLevels[0]) {
    errors.push(
      `SECURITY.md audit threshold (${documentedLevels.join(', ') || 'missing'}) does not match CI (${workflowLevels.join(', ')})`
    );
  }

  return errors;
}

export function validateRequiredCommands(fileContents, packageJson) {
  const errors = [];
  const documentedFiles = ['AGENTS.md', 'docs/qa-ai/release-checklist.md'];

  for (const relativePath of documentedFiles) {
    const content = fileContents.get(relativePath) ?? '';
    for (const command of requiredValidationCommands) {
      if (!content.includes(command)) {
        errors.push(`${relativePath} is missing canonical validation command: ${command}`);
      }
    }
  }

  for (const script of ['docs:build', 'docs:check', 'test:doc-consistency', 'validate:oss-extraction']) {
    if (!packageJson.scripts?.[script]) {
      errors.push(`package.json is missing required script: ${script}`);
    }
  }

  return errors;
}

function markdownTargets(content) {
  const pattern = /!?\[[^\]]*]\((<[^>]+>|[^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\)/g;
  return [...content.matchAll(pattern)].map((match) => ({
    index: match.index,
    target: match[1].replace(/^<|>$/g, '')
  }));
}

export async function findBrokenLocalMarkdownLinks(repoRoot, markdownFiles) {
  const errors = [];

  for (const relativePath of markdownFiles) {
    const absolutePath = path.join(repoRoot, relativePath);
    const content = await fs.readFile(absolutePath, 'utf8');

    for (const { index, target } of markdownTargets(content)) {
      if (target.startsWith('#') || target.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;

      const pathPart = decodeURIComponent(target.split('#')[0]);
      if (!pathPart) continue;

      const resolved = pathPart.startsWith('/')
        ? path.resolve(repoRoot, pathPart.slice(1))
        : path.resolve(path.dirname(absolutePath), pathPart);
      if (!(await pathExists(resolved))) {
        errors.push(`${relativePath}:${lineNumberAt(content, index)} has broken local link: ${target}`);
      }
    }
  }

  return errors;
}

export async function validateDocsSiteOutputs(repoRoot, { renderDocsSiteLocale, verifyDocsSiteOutputs }) {
  const siteRoot = path.join(repoRoot, 'docs', 'site');
  const generated = new Map();
  for (const locale of ['en', 'es']) {
    generated.set(locale, await renderDocsSiteLocale(siteRoot, locale));
  }
  return verifyDocsSiteOutputs(repoRoot, generated);
}

export async function validateDocumentationConsistency(repoRoot, docsSiteDeps) {
  const errors = [];
  const evergreenContents = await readFiles(repoRoot, evergreenVersionFiles);
  const commandContents = await readFiles(repoRoot, ['AGENTS.md', 'docs/qa-ai/release-checklist.md']);
  const packageJson = JSON.parse(await fs.readFile(path.join(repoRoot, 'package.json'), 'utf8'));
  const ciContent = await fs.readFile(path.join(repoRoot, '.github', 'workflows', 'ci.yml'), 'utf8');
  const securityContent = await fs.readFile(path.join(repoRoot, 'SECURITY.md'), 'utf8');
  const markdownFiles = await sourceMarkdownFiles(repoRoot);

  errors.push(...findStaleEvergreenVersions(evergreenContents));
  errors.push(...validateLifecycleClaims(evergreenContents));
  errors.push(...validateAuditDocumentation(ciContent, securityContent));
  errors.push(...validateRequiredCommands(commandContents, packageJson));
  errors.push(...(await findBrokenLocalMarkdownLinks(repoRoot, markdownFiles)));

  if (docsSiteDeps) {
    errors.push(...(await validateDocsSiteOutputs(repoRoot, docsSiteDeps)));
  }

  return {
    ok: errors.length === 0,
    errors,
    checkedMarkdownFiles: markdownFiles.length
  };
}
