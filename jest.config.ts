import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    ...pathsToModuleNameMapper(
      { '@/*': ['./src/*'] },
      { prefix: '<rootDir>/' }
    ),
    // Mock out next-auth to avoid ESM import issues entirely
    '^next-auth$': '<rootDir>/src/__tests__/__mocks__/next-auth.ts',
    '^next-auth/providers/(.*)$': '<rootDir>/src/__tests__/__mocks__/next-auth-provider.ts',
    '^@auth/core$': '<rootDir>/src/__tests__/__mocks__/auth-core.ts',
    // Mock next/server
    '^next/server$': '<rootDir>/src/__tests__/__mocks__/next-server.ts',
    '^next/headers$': '<rootDir>/src/__tests__/__mocks__/next-headers.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      diagnostics: { ignoreDiagnostics: [151001] },
    }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(next-auth|@auth|@panva|jose|next)/)',
  ],
  clearMocks: true,
  collectCoverageFrom: [
    'src/app/api/**/*.ts',
    'src/lib/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/node_modules/**',
  ],
};

export default config;
