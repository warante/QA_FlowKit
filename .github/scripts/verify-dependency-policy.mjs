#!/usr/bin/env node
import fs from 'node:fs';
import { isMain } from './lib/ci-helpers.mjs';

export function verifyDependencyPolicy() {
  const errors = [];
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const dependencyGroups = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
  const dependencies = dependencyGroups.flatMap((group) =>
    Object.entries(pkg[group] || {}).map(([name, spec]) => ({ group, name, spec: String(spec) }))
  );
  const unsafeSpecs = dependencies.filter(({ spec }) => /^(?:git\+?|https?:|file:|link:)/i.test(spec));
  if (unsafeSpecs.length > 0) {
    errors.push('Unsafe dependency specifiers are not allowed in this portable starter:');
    for (const item of unsafeSpecs) errors.push(`- ${item.group}.${item.name}: ${item.spec}`);
  }
  if (dependencies.length === 0) {
    return { ok: true, message: 'No package dependencies declared; npm audit is not required.' };
  }
  if (!fs.existsSync('package-lock.json')) {
    errors.push('Dependencies are declared, but package-lock.json is missing.');
    errors.push('Add a committed lockfile so CI can run npm ci and npm audit reproducibly.');
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, message: `Dependency policy passed for ${dependencies.length} declared dependencies.` };
}

if (isMain(import.meta.url)) {
  const result = verifyDependencyPolicy();
  if (result.message) console.log(result.message);
  if (!result.ok) {
    for (const error of result.errors) console.error(error);
    process.exit(1);
  }
}
