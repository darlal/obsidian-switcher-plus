module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'jsx', 'tsx', 'json', 'node'],
  roots: ['<rootDir>/src/', 'node_modules'],
  modulePaths: ['<rootDir>', 'node_modules'],
  moduleDirectories: ['src', 'node_modules'],
  moduleNameMapper: {
    'src/(.*)': '<rootDir>/src/$1',
    obsidian: '<rootDir>/node_modules/obsidian/obsidian.d.ts',
  },
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  transformIgnorePatterns: ['\\.pnp\\.[^\\/]+$'],
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 20,
      lines: 20,
      statements: 20,
    },
  },
};
