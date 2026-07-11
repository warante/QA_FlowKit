#!/usr/bin/env node
import fs from 'node:fs/promises';
import { repoRoot } from './lib/ci-helpers.mjs';
import path from 'node:path';
import {
  validateConfigContractContent,
  validateInitManifestContract,
  validateRunEventsFile,
  validateRunStateContract,
  validateWorkflowContractSchema
} from '../../.qa-ai/scripts/lib/contract-schemas.mjs';

function resolveFixturePath(root, fixture) {
  const localFixturesRoot = path.join(root, 'test', 'fixtures', 'compatibility');
  if (fixture.scope === 'repository') {
    return path.join(root, fixture.path);
  }
  return path.join(localFixturesRoot, fixture.path);
}

function matchesExpectedErrors(errors, expectedErrors = []) {
  const joined = errors.join('\n');
  for (const fragment of expectedErrors) {
    if (!joined.includes(fragment)) {
      return { ok: false, missing: fragment };
    }
  }
  return { ok: true };
}

async function validateFixture(root, fixture) {
  const filePath = resolveFixturePath(root, fixture);
  const content = await fs.readFile(filePath, 'utf8');

  switch (fixture.surface) {
    case 'config': {
      return validateConfigContractContent(content, root, filePath);
    }
    case 'workflow': {
      return validateWorkflowContractSchema(JSON.parse(content), { root });
    }
    case 'run-state': {
      return validateRunStateContract(JSON.parse(content), { root });
    }
    case 'run-event': {
      return validateRunEventsFile(content, { root });
    }
    case 'init-manifest': {
      return validateInitManifestContract(JSON.parse(content), { root });
    }
    default:
      throw new Error(`Unknown fixture surface: ${fixture.surface}`);
  }
}

export async function verifyCompatibilityFixtures({ root = repoRoot } = {}) {
  const manifest = JSON.parse(
    await fs.readFile(path.join(root, 'test/fixtures/compatibility/manifest.v1.json'), 'utf8')
  );
  const errors = [];

  if (manifest.schemaVersion !== 1) {
    errors.push('compatibility manifest schemaVersion must be 1.');
    return { ok: false, errors, checked: 0 };
  }

  let checked = 0;
  for (const fixture of manifest.fixtures || []) {
    checked += 1;
    let result;
    try {
      result = await validateFixture(root, fixture);
    } catch (error) {
      errors.push(`${fixture.id}: validator threw (${error.message})`);
      continue;
    }

    if (fixture.expect === 'valid') {
      if (!result.ok) {
        errors.push(`${fixture.id}: expected valid fixture but validation failed:\n  ${result.errors.join('\n  ')}`);
      }
      continue;
    }

    if (fixture.expect === 'invalid') {
      if (result.ok) {
        errors.push(`${fixture.id}: expected invalid fixture but validation passed.`);
        continue;
      }
      const match = matchesExpectedErrors(result.errors, fixture.expectedErrors || []);
      if (!match.ok) {
        errors.push(
          `${fixture.id}: missing expected error fragment ${JSON.stringify(match.missing)}.\n  actual: ${result.errors.join(' | ')}`
        );
      }
      continue;
    }

    errors.push(`${fixture.id}: unknown expect value ${JSON.stringify(fixture.expect)}`);
  }

  return { ok: errors.length === 0, errors, checked };
}

async function main() {
  const result = await verifyCompatibilityFixtures();
  if (!result.ok) {
    console.error('Compatibility fixture validation failed:\n');
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`Compatibility fixtures passed (${result.checked} cases).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
