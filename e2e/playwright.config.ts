import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Game tests share in-memory state via a real Socket.IO server — must run sequentially.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // One retry handles transient timing flakiness when tests share a live server.
  // A genuinely broken test will still fail on both attempts.
  retries: 1,
  // 45 s per test — mobile browsers and cross-device rejoin scenarios need headroom.
  timeout: 45_000,
  reporter: [['list'], ['html', { open: 'never' }]],

  // Checks that the Docker stack is up before any tests run.
  // Start it with: docker-compose up -d
  globalSetup: './global-setup.ts',

  use: {
    baseURL: 'http://localhost:4321',
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
