#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseYaml, parseSimpleYaml } from './_fixtures.mjs';
import { assertIncludes, repoRoot, runValidatorScript, withTempWorkspace } from './_shared.mjs';

// --- parseSimpleYaml ---

test('parseSimpleYaml: strips inline comment from unquoted value', () => {
  const result = parseSimpleYaml('key: value # this is a comment\n');
  assert.equal(result.key, 'value');
});

test('parseSimpleYaml: strips inline comment from boolean value', () => {
  const result = parseSimpleYaml('enabled: false # disabled\n');
  assert.equal(result.enabled, false);
});

test('parseSimpleYaml: preserves # inside quoted string', () => {
  const result = parseSimpleYaml('path: "has # hash inside"\n');
  assert.equal(result.path, 'has # hash inside');
});

test('parseSimpleYaml: resolves nested mappings', () => {
  const yaml = [
    'automation:',
    '  ui:',
    '    framework: webdriverio',
    '  api:',
    '    framework: playwright-api',
    ''
  ].join('\n');
  const result = parseSimpleYaml(yaml);
  assert.equal(result.automation.ui.framework, 'webdriverio');
  assert.equal(result.automation.api.framework, 'playwright-api');
});

test('parseSimpleYaml: parses booleans and null scalars', () => {
  const result = parseSimpleYaml('a: true\nb: false\nc: null\nd: ~\n');
  assert.equal(result.a, true);
  assert.equal(result.b, false);
  assert.equal(result.c, null);
  assert.equal(result.d, null);
});

test('parseSimpleYaml: parses numbers', () => {
  const result = parseSimpleYaml('count: 42\nratio: 3.14\n');
  assert.equal(result.count, 42);
  assert.equal(result.ratio, 3.14);
});

test('parseSimpleYaml: parses flat list under a key', () => {
  const result = parseSimpleYaml('items:\n  - alpha\n  - beta\n  - gamma\n');
  assert.deepEqual(result.items, ['alpha', 'beta', 'gamma']);
});

test('parseSimpleYaml: parses list of mappings under a key', () => {
  const yaml = [
    'validators:',
    '  custom:',
    '    - id: naming-check',
    '      script: qa-custom/validate-naming.example.mjs',
    '      phases:',
    '        - gherkin',
    '      blocking: false',
    ''
  ].join('\n');
  const result = parseSimpleYaml(yaml);
  assert.deepEqual(result.validators.custom, [
    {
      id: 'naming-check',
      script: 'qa-custom/validate-naming.example.mjs',
      phases: ['gherkin'],
      blocking: false
    }
  ]);
});

test('parseSimpleYaml: ignores full-line comments', () => {
  const result = parseSimpleYaml('# full line comment\nkey: value\n');
  assert.equal(result.key, 'value');
  assert.equal(Object.keys(result).length, 1);
});

test('parseYaml: located syntax error for tab indentation', () => {
  const yaml = ['key:', '\tchild: value'].join('\n');
  assert.throws(
    () => {
      parseYaml(yaml, 'config.yaml');
    },
    (err) => {
      return (
        err.name === 'YAMLError' &&
        err.message.includes('config.yaml:2:') &&
        err.message.includes('Tabs are not allowed')
      );
    }
  );
});

test('parseYaml: located syntax error for invalid hyphen placement', () => {
  const yaml = ['key: value', '- item'].join('\n');
  assert.throws(
    () => {
      parseYaml(yaml, 'config.yaml');
    },
    (err) => {
      return (
        err.name === 'YAMLError' &&
        err.message.includes('config.yaml:2:') &&
        err.message.includes('Hyphen (-) is only allowed inside a sequence')
      );
    }
  );
});

test('parseYaml: located syntax error for invalid sequence formatting', () => {
  const yaml = ['items:', '  - item1', '  item2'].join('\n');
  assert.throws(
    () => {
      parseYaml(yaml, 'config.yaml');
    },
    (err) => {
      return (
        err.name === 'YAMLError' &&
        err.message.includes('config.yaml:3:') &&
        err.message.includes('Expected sequence item starts with a hyphen')
      );
    }
  );
});

test('parseYaml: rejects anchors, aliases, tags, and flow mappings', () => {
  assert.throws(() => parseYaml('key: &anchor value', 'config.yaml'), /anchors are unsupported/);
  assert.throws(() => parseYaml('key: *alias', 'config.yaml'), /aliases are unsupported/);
  assert.throws(() => parseYaml('key: !!str value', 'config.yaml'), /tags are unsupported/);
  assert.throws(() => parseYaml('key: {a: 1}', 'config.yaml'), /Flow style mappings are unsupported/);
  assert.throws(() => parseYaml('key: [[nested]]', 'config.yaml'), /Flow style beyond simple inline lists/);
});

test('parseYaml: parses block literal and folded scalars', () => {
  const yaml = ['literal: |', '  line 1', '  line 2', 'folded: >', '  line 3', '  line 4', ''].join('\n');
  const result = parseYaml(yaml);
  assert.equal(result.literal, 'line 1\nline 2\n');
  assert.equal(result.folded, 'line 3 line 4\n');
});

test('parseYaml: round-trip presets and config fixtures', async () => {
  function toYamlString(obj, indent = 0) {
    const spaces = ' '.repeat(indent);
    if (obj === null || obj === undefined) return 'null';
    if (typeof obj !== 'object') {
      if (typeof obj === 'string') {
        if (obj.includes('\n')) {
          return `|\n${obj
            .split('\n')
            .map((line) => ' '.repeat(indent + 2) + line)
            .join('\n')}\n`;
        }
        if (/^[A-Za-z0-9_. -]+$/.test(obj) && obj.trim() === obj) return obj;
        return JSON.stringify(obj);
      }
      return String(obj);
    }
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      return `\n${obj
        .map((item) => {
          if (item && typeof item === 'object') {
            const keys = Object.keys(item);
            if (keys.length === 0) return `${spaces}- {}`;
            const firstKey = keys[0];
            const restYaml = toYamlString(item[firstKey], indent + 4);
            let str = `${spaces}- ${firstKey}:`;
            if (restYaml.startsWith('\n')) {
              str += restYaml;
            } else {
              str += ` ${restYaml}`;
            }
            for (let idx = 1; idx < keys.length; idx++) {
              const k = keys[idx];
              const valYaml = toYamlString(item[k], indent + 4);
              str += `\n${spaces}  ${k}:`;
              if (valYaml.startsWith('\n')) {
                str += valYaml;
              } else {
                str += ` ${valYaml}`;
              }
            }
            return str;
          }
          return `${spaces}- ${toYamlString(item, indent + 2)}`;
        })
        .join('\n')}`;
    }
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    return `\n${keys
      .map((k) => {
        const valYaml = toYamlString(obj[k], indent + 2);
        if (valYaml.startsWith('\n')) {
          return `${spaces}${k}:${valYaml}`;
        }
        return `${spaces}${k}: ${valYaml}`;
      })
      .join('\n')}`;
  }

  const presetsDir = path.resolve(process.cwd(), '.qa-ai/presets');
  const files = await fs.readdir(presetsDir);
  for (const file of files.filter((f) => f.endsWith('.yaml'))) {
    const filePath = path.join(presetsDir, file);
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = parseYaml(content, file);
    const serialized = toYamlString(parsed).trim();
    const reParsed = parseYaml(serialized, 'round-trip');
    assert.deepEqual(reParsed, parsed, `Round-trip mismatch for preset: ${file}`);
  }
});

export async function writeCustomValidatorFixture({ exitCode = 0, ok = true } = {}) {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-custom-validator-'));
  await fs.cp(path.join(repoRoot, '.qa-ai'), path.join(cwd, '.qa-ai'), { recursive: true, force: true });
  await fs.mkdir(path.join(cwd, 'qa-custom'), { recursive: true });
  await fs.writeFile(
    path.join(cwd, 'qa-custom', 'validate-naming.mjs'),
    [
      '#!/usr/bin/env node',
      'const args = new Set(process.argv.slice(2));',
      'if (args.has("--self-test")) {',
      '  console.log(JSON.stringify({ ok: true, findings: [] }));',
      '  process.exit(0);',
      '}',
      `const result = { ok: ${ok}, findings: ${ok ? '[]' : '[{ file: "features/bad.feature", message: "Bad name", severity: "error" }]'} };`,
      'console.log(JSON.stringify(result));',
      `process.exit(${exitCode});`,
      ''
    ].join('\n'),
    'utf8'
  );
  return cwd;
}
