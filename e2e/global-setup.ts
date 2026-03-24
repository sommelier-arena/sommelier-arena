/**
 * Global setup for Playwright E2E tests.
 *
 * Polls the PartyKit backend (localhost:1999) to verify the Docker stack is
 * running before any tests start. Fails fast with a clear message rather than
 * letting tests time out one by one.
 *
 * Start the stack first: docker-compose up -d
 */
import { chromium } from '@playwright/test';

const PARTYKIT_URL = 'http://localhost:1999/';
const FRONT_URL = 'http://localhost:3000/';
const POLL_INTERVAL_MS = 1_000;
const TIMEOUT_MS = 15_000;

async function waitFor(url: string): Promise<void> {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const deadline = Date.now() + TIMEOUT_MS;
  let lastError = '';

  while (Date.now() < deadline) {
    try {
      const res = await page.request.get(url, { timeout: 2_000 });
      if (res.status() < 500) {
        await browser.close();
        return;
      }
    } catch (err: unknown) {
      lastError = String(err);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  await browser.close();
  throw new Error(
    `Docker stack not reachable at ${url} after ${TIMEOUT_MS / 1000}s.\n` +
    `Start it with: docker-compose up -d\n` +
    `Last error: ${lastError}`,
  );
}

export default async function globalSetup() {
  await waitFor(PARTYKIT_URL);
  await waitFor(FRONT_URL);
}
