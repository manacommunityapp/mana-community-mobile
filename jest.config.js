module.exports = {
  testEnvironment: 'node',
  transform: {
    // Must cover .js/.jsx/.mjs too, not just TypeScript: several packages under
    // node_modules ship ESM .js (expo/virtual/env.js among them), and a file with
    // no matching transform is handed to Jest as CommonJS and fails to parse —
    // transformIgnorePatterns cannot help a file that no transform claims.
    '^.+\\.(js|jsx|ts|tsx|mjs)$': ['babel-jest', { configFile: './babel.config.js' }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|i18n-js|expo-localization)',
  ],
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

