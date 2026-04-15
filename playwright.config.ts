import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local for test runs
// This gives tests access to NEXT_PUBLIC_* vars but NOT service role keys
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

/**
 * SAFETY: These tests run against the LIVE production build.
 * - All tests use mocked API interceptors where possible.
 * - Any test that creates DB records MUST clean up after itself in afterAll().
 * - The baseURL should be a local dev server, NOT production.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Sequential to avoid race conditions on shared state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to prevent DB conflicts
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  timeout: 30000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Start the dev server automatically if not already running
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
    env: {
      // Pass through environment variables safely
      NODE_ENV: 'test',
    },
  },
});
