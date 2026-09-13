// ESLint 9 flat config for the EduElderly monorepo.
// Backend services and the shared package are CommonJS on Node 20.
// The React client is ESM with JSX, linted with a11y rules because the product
// is elderly-first and accessibility regressions are treated as bugs.

const js = require('@eslint/js');
const globals = require('globals');
const prettier = require('eslint-config-prettier');
const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const jsxA11y = require('eslint-plugin-jsx-a11y');

module.exports = [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/test-results/**',
      '**/playwright-report/**',
      'sample-test-site/**',
      '.agents/**',
      '.cursor/**',
    ],
  },

  js.configs.recommended,

  // Backend: services + shared package (CommonJS, Node, Jest)
  {
    files: ['services/**/*.js', 'packages/shared/**/*.js', 'scripts/**/*.js', 'eslint.config.js', 'jest.config.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'commonjs',
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // Frontend: React client (ESM, browser, Vitest)
  {
    files: ['packages/client/**/*.{js,jsx}'],
    plugins: { react, 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node, ...globals.vitest },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // Prettier last so it disables any formatting rules above.
  prettier,
];
