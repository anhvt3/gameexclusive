import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // 60s default — Phase 1.5 specs accumulate state setup + multi-iteration
  // simulate cycles that breach the original 30s budget under parallel
  // workers on a single shared dev server.
  timeout: 60_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
