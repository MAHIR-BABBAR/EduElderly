module.exports = {
  // Stops ESLint from searching further up your computer's directory tree
  root: true, 
  env: {
    es2024: true,
  },
  // Base rules applied to EVERY file in the monorepo
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended' 
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  
  // The Overrides Array: Targeting specific environments
  overrides: [
    {
      // 1. Backend Node.js Microservices & Shared Utilities
      files: ['services/**/*.js', 'packages/shared/**/*.js'],
      env: {
        node: true,
        jest: true, // Allows global test variables like describe() and it()
      },
      rules: {
        'no-console': 'warn', // Discourages leaving console.logs in production APIs
        'no-unused-vars': ['error', { argsIgnorePattern: '^_' }], // Allows unused variables if they start with an underscore
      },
    },
    {
      // 2. Frontend React Client
      files: ['packages/client/**/*.js', 'packages/client/**/*.jsx'],
      env: {
        browser: true,
      },
      extends: [
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:jsx-a11y/recommended', // Enforces strict WCAG accessibility rules
      ],
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      settings: {
        react: {
          version: 'detect', // Automatically detects your React version
        },
      },
      rules: {
        'react/react-in-jsx-scope': 'off', // Not required in React 17+
        'react/prop-types': 'off', 
      },
    },
  ],
};