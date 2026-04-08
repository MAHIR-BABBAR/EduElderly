module.exports = {
  // Run tests in all workspace packages
  projects: [
    '<rootDir>/services/*/jest.config.js',
    '<rootDir>/packages/*/jest.config.js',
  ],

  // Global coverage thresholds (Phase 9 target: 80%)
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },

  // Collect coverage from source files
  collectCoverageFrom: [
    'services/*/src/**/*.js',
    'packages/shared/**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
  ],
};
