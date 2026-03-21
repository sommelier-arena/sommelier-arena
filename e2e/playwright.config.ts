import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Game tests share in-memory state via a real Socket.IO server — must run sequentially.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],

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

  // Poll /health so the suite fails fast with a clear message when Docker is not running.
  // Pass an empty command so Playwright only polls — user must start Docker manually.
  webServer: {
    command: '',
    url: 'http://localhost:3001/health',
    reuseExistingServer: true,
    timeout: 10_000,
  },
});
