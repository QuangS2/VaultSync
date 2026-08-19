import { defineConfig } from 'vitest/config';

/**
 * Vitest Unit & Integration Test Configuration (11/10 Precision)
 * Strictly isolates unit tests to client/server/shared and excludes Playwright E2E tests
 */
export default defineConfig({
  test: {
    include: ['client/**/*.test.ts', 'server/**/*.test.ts', 'shared/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    globals: true,
  },
});
