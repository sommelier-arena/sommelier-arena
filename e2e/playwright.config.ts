import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Game tests share in-memory state via a real Socket.IO server — must run sequentially.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  // Checks that the Docker stack is up before any tests run.
  // Start it with: docker-compose up -d
  globalSetup: './global-setup.ts',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // ── Desktop browsers (run all tests) ──────────────────────────────────────
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      // Only smoke + full-game scenarios to keep CI time reasonable
      grep: /@smoke|@full/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      grep: /@smoke|@full/,
    },

    // ── Mobile browsers (smoke + mobile-specific tests) ───────────────────────
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      grep: /@smoke|@mobile/,
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
      grep: /@smoke|@mobile/,
    },
    {
      name: 'mobile-firefox',
      use: { ...devices['Moto G4'] },
      grep: /@smoke/,
    },
  ],
});
