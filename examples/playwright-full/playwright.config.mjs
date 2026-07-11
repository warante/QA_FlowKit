import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4174';

export default defineConfig({
  testDir: '.qa-ai/tests/playwright',
  fullyParallel: true,
  forbidOnly: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['line']],
  use: {
    baseURL,
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'api',
      testMatch: /api\/.*\.spec\.mjs/
    },
    {
      name: 'chromium',
      testMatch: /ui\/.*\.spec\.mjs/,
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'node app/server.mjs',
    url: `${baseURL}/health`,
    reuseExistingServer: false,
    timeout: 10_000
  }
});
