#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const srcPath = path.join(repoRoot, '.qa-ai/scripts/test-validators.mjs');
const src = fs.readFileSync(srcPath, 'utf8');
const lines = src.split(/\r?\n/);

const headerEnd = 73;
const header = lines.slice(0, headerEnd).join('\n');

const sections = [
  { name: 'yaml', start: 82, end: 319 },
  { name: 'config', start: 320, end: 789 },
  { name: 'injection-design', start: 790, end: 1448 },
  { name: 'release-gate', start: 1449, end: 1607 },
  { name: 'markdown-sync', start: 1608, end: 1712 },
  { name: 'gherkin', start: 1713, end: 2077 },
  { name: 'sync-diff', start: 2078, end: 2881 },
  { name: 'execution', start: 2882, end: 3682 },
  { name: 'healing-impact', start: 3683, end: 4563 },
  { name: 'subprocess', start: 4564, end: lines.length }
];

const outDir = path.join(repoRoot, '.qa-ai/scripts/test/validators');
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(
  path.join(outDir, '_shared.mjs'),
  `${header}\n\nexport function assertIncludes(haystack, needle) {
  assert.ok(
    haystack.some((item) => item.includes(needle)),
    \`Expected an error containing: \${needle}\\nActual errors:\\n\${haystack.join('\\n')}\`
  );
}\n`
);

for (const section of sections) {
  const body = lines.slice(section.start - 1, section.end).join('\n');
  const content = `${header}\nimport { assertIncludes } from './_shared.mjs';\n\n${body}\n`;
  fs.writeFileSync(path.join(outDir, `${section.name}.mjs`), content);
}

const runner = `#!/usr/bin/env node
import './test/validators/yaml.mjs';
import './test/validators/config.mjs';
import './test/validators/injection-design.mjs';
import './test/validators/release-gate.mjs';
import './test/validators/markdown-sync.mjs';
import './test/validators/gherkin.mjs';
import './test/validators/sync-diff.mjs';
import './test/validators/execution.mjs';
import './test/validators/healing-impact.mjs';
import './test/validators/subprocess.mjs';
`;

fs.writeFileSync(srcPath, runner);
console.log(`Split test-validators into ${sections.length} modules.`);
