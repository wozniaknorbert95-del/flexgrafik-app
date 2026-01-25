/** @type {import('jest').Config} */
export default {
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.test.cjs',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^../types$': '<rootDir>/types.ts',
    '^../utils/(.*)$': '<rootDir>/utils/$1',
  },
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.ts$': 'babel-jest',
  },
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  collectCoverageFrom: ['utils/**/*.ts', 'contexts/**/*.tsx', 'components/**/*.tsx', '!**/*.d.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
};
