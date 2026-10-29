import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import jsdoc from 'eslint-plugin-jsdoc';
import globals from 'globals';

/** Rules that apply everywhere. Strict by default; every deviation below is explained. */
const strictRules = {
  eqeqeq: ['error', 'always'],
  curly: ['error', 'all'],
  'no-var': 'error',
  'prefer-const': 'error',
  'prefer-template': 'error',
  'no-shadow': 'error',
  'no-implicit-coercion': 'error',
  'no-nested-ternary': 'error',
  'no-throw-literal': 'error',
  'no-unused-expressions': 'error',
  'no-return-assign': 'error',
  'no-sequences': 'error',
  'no-lonely-if': 'error',
  'no-else-return': 'error',
  'object-shorthand': 'error',
  'no-useless-concat': 'error',
  'no-promise-executor-return': 'error',
  'require-atomic-updates': 'error',
  radix: 'error',
  yoda: 'error',
  complexity: ['error', 14],
  'max-depth': ['error', 4],
  // Drawing primitives take coordinates plus style, which reads better than an options bag.
  'max-params': ['error', 8],
  'max-lines-per-function': ['error', { max: 110, skipBlankLines: true, skipComments: true }],
  'max-lines': ['error', { max: 450, skipBlankLines: true, skipComments: true }],
  'no-console': 'error',
};

export default [
  { ignores: ['node_modules/**', 'build/**', 'dist/**', '.cache/**', 'assets/**'] },
  js.configs.recommended,
  jsdoc.configs['flat/recommended-typescript-flavor'],
  {
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    settings: { jsdoc: { mode: 'typescript' } },
    rules: {
      ...strictRules,
      // Types are checked by tsc in strict mode, so JSDoc only has to describe them.
      'jsdoc/no-undefined-types': 'off',
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-param': 'off',
      'jsdoc/require-returns': 'off',
      'jsdoc/reject-any-type': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-returns-description': 'off',
      'jsdoc/require-property-description': 'off',
      'jsdoc/tag-lines': 'off',
      'jsdoc/check-tag-names': ['error', { definedTags: ['template'] }],
    },
  },
  {
    // Browser code: the film must be a pure function of time, so no ambient randomness or clocks.
    files: ['src/web/**/*.js'],
    languageOptions: { globals: globals.browser },
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded generator in core/rng.js.' },
        { object: 'Date', property: 'now', message: 'Drive everything from the timeline clock.' },
        {
          object: 'performance',
          property: 'now',
          message: 'Drive everything from the timeline clock.',
        },
      ],
    },
  },
  {
    files: ['src/core/**/*.js', 'src/audio/**/*.js', 'src/config/**/*.js'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded generator in core/rng.js.' },
      ],
    },
  },
  {
    files: ['scripts/**/*.js', 'tests/**/*.js', 'src/audio/**/*.js', '*.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    // These files pass functions to page.evaluate, which run inside the browser.
    files: ['scripts/lib/browser.js', 'tests/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    // Command line tools talk to the user through the console.
    files: ['scripts/**/*.js'],
    rules: { 'no-console': 'off', 'max-lines-per-function': 'off' },
  },
  {
    files: ['tests/**/*.js'],
    rules: { 'max-lines-per-function': 'off' },
  },
  prettier,
];
