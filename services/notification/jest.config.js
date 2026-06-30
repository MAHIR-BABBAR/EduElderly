module.exports = {
  verbose: true,
  forceExit: true,
  projects: [
    {
      displayName: 'integration',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/__tests__/**/*.test.js'],
      testPathIgnorePatterns: ['<rootDir>/__tests__/security.test.js'],
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
      detectOpenHandles: true,
    },
    {
      displayName: 'security',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/__tests__/security.test.js'],
      setupFilesAfterEnv: ['<rootDir>/__tests__/security.setup.js'],
    },
  ],
};
