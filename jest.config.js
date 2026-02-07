const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    window: {},
  },
  moduleFileExtensions: ['ts', 'js', 'jsx', 'tsx', 'json', 'node'],
  roots: ['<rootDir>/src/', 'node_modules'],
  modulePaths: ['<rootDir>', 'node_modules'],
  moduleDirectories: ['src', 'node_modules'],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  transformIgnorePatterns: ['\\.pnp\\.[^\\/]+$'],
  collectCoverage: true,
  collectCoverageFrom: ['<rootDir>/src/**'],
  coverageThreshold: {
    global: {
      branches: 99,
      functions: 99,
      lines: 99,
      statements: 99,
    },
  },
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    'perf\\.test\\.ts$', // Exclude perf test files from coverage, see jest.perf.config.js
    '<rootDir>/src/types/obsidian',
  ],
  modulePathIgnorePatterns: ['/dist/'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    'perf\\.test\\.ts$', // ignore performance test files, see jest.perf.config.js
  ],
};
