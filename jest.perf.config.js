const config = require('./jest.config');

config.testMatch = [
    '**/__tests__/**/*.perf.test.ts?(x)',
    '<rootDir>/benchmark/**/*.perf.test.ts?(x)',
];

config.roots = [...config.roots, '<rootDir>/benchmark/'];

// Remove the performance test ignore pattern from the list of ignored paths
config.testPathIgnorePatterns = config.testPathIgnorePatterns.filter(
  (pattern) => !pattern.includes('perf\\.test\\.ts')
);

module.exports = config;
