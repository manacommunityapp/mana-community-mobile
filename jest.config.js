module.exports = {
  preset: 'jest-expo/node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // React Native defines __DEV__ in the bundler; a bare node test environment does
  // not, so any module reading it throws ReferenceError at import time. true matches
  // what jest-expo sets and what the existing seed-data tests expect. Note the
  // consequence: branches guarded by !__DEV__ are never exercised by this suite.
  globals: {
    __DEV__: true,
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}', '**/*.test.{ts,tsx}'],
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  testPathIgnorePatterns: ['/node_modules/', '/.claude/'],
  collectCoverageFrom: [
    'services/**/*.ts',
    'hooks/**/*.ts',
    'utils/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  // Stub EXPO_PUBLIC_* env vars so babel-preset-expo's inline transform
  // doesn't produce `undefined.EXPO_PUBLIC_*` in the test environment.
  testEnvironmentOptions: {
    env: { EXPO_PUBLIC_INSURANCE_ENABLED: 'false' },
  },
};

