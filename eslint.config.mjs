import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        AbortController: 'readonly',
        Buffer: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error'
    }
  },
  {
    files: ['.qa-ai/scripts/test/validators/**/*.mjs'],
    rules: {
      'no-unused-vars': 'off'
    }
  },
  {
    ignores: [
      'node_modules/**',
      '.qa-flowkit-npm-*/**',
      '.qa-flowkit-update-migration-*/**',
      'pack-artifact/**',
      'coverage/**'
    ]
  }
];
