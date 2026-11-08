// Keep every configured mutation target covered without replaying unrelated CLI/E2E tests per mutant.
export const MUTATION_SUITES = {
  'gherkin-validate': ['gherkin', 'injection-design-ai'],
  'test-coverage': ['injection-design', 'injection-design-nfr', 'injection-design-ai'],
  'markdown-table': ['release-gate'],
  'secret-patterns': ['external-intake', 'untrusted-content'],
  'injection-patterns': ['injection-design', 'untrusted-content', 'external-intake']
};

export function mutationTestModules(target = '') {
  if (target && !Object.hasOwn(MUTATION_SUITES, target)) {
    throw new Error(`Unknown mutation target: ${target}`);
  }
  const suites = target ? MUTATION_SUITES[target] : Object.values(MUTATION_SUITES).flat();
  return [...new Set(suites)].map((name) => `.qa-ai/scripts/test/validators/${name}.mjs`);
}
