import { test, expect } from '@playwright/test';
import { io } from 'socket.io-client';

/** Returns true when a Socket.IO connection succeeds within `timeoutMs`. */
function socketConnects(url: string, timeoutMs = 5_000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = io(url, { transports: ['websocket'], reconnection: false, timeout: timeoutMs });
    const timer = setTimeout(() => { socket.disconnect(); resolve(false); }, timeoutMs);
    socket.on('connect', () => { clearTimeout(timer); socket.disconnect(); resolve(true); });
    socket.on('connect_error', () => { clearTimeout(timer); resolve(false); });
  });
}

// Reusable helper: fill in a minimal valid session (1 wine, all fields)
async function fillMinimalSession(page: import('@playwright/test').Page) {
  await page.getByLabel('Wine name').fill('Château Test');

  // Color question
  await page.getByLabel('Wine 1 Color — correct answer').fill('Red');
  await page.getByLabel('Wine 1 Color — distractor 1').fill('White');
  await page.getByLabel('Wine 1 Color — distractor 2').fill('Rosé');
  await page.getByLabel('Wine 1 Color — distractor 3').fill('Orange');

  // Country question
  await page.getByLabel('Wine 1 Country — correct answer').fill('France');
  await page.getByLabel('Wine 1 Country — distractor 1').fill('Italy');
  await page.getByLabel('Wine 1 Country — distractor 2').fill('Spain');
  await page.getByLabel('Wine 1 Country — distractor 3').fill('USA');

  // Grape variety question
  await page.getByLabel('Wine 1 Grape Variety — correct answer').fill('Merlot');
  await page.getByLabel('Wine 1 Grape Variety — distractor 1').fill('Cabernet');
  await page.getByLabel('Wine 1 Grape Variety — distractor 2').fill('Syrah');
  await page.getByLabel('Wine 1 Grape Variety — distractor 3').fill('Pinot');

  // Vintage year question
  await page.getByLabel('Wine 1 Vintage Year — correct answer').fill('2018');
  await page.getByLabel('Wine 1 Vintage Year — distractor 1').fill('2015');
  await page.getByLabel('Wine 1 Vintage Year — distractor 2').fill('2019');
  await page.getByLabel('Wine 1 Vintage Year — distractor 3').fill('2020');
}

test.describe('Host Session', () => {
  test.beforeAll(async () => {
    const reachable = await socketConnects('http://localhost:3000');
    if (!reachable) {
      test.skip(
        true,
        'Socket.IO not reachable via nginx proxy (http://localhost:3000). ' +
          'Run `docker-compose up --build -d` and wait until back is healthy.',
      );
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/host');
    // Wait for the React app to hydrate
    await expect(page.getByRole('button', { name: /create session/i })).toBeVisible();
  });

  test('Host Session - happy path creates session and shows 4-digit code', async ({ page }) => {
    await test.step('Fill in session form', async () => {
      await fillMinimalSession(page);
    });

    await test.step('Submit the form', async () => {
      await page.getByRole('button', { name: /create session/i }).click();
    });

    await test.step('Lobby shows a 4-digit session code', async () => {
      // The code is displayed as a status region or visible text
      const codeText = page.getByText(/^\d{4}$/);
      await expect(codeText).toBeVisible();
    });
  });

  test('Host Session - boundary: submit with empty wine name shows error', async ({ page }) => {
    await test.step('Leave wine name empty and submit', async () => {
      // Fill everything except the wine name
      await page.getByLabel('Wine 1 Color — correct answer').fill('Red');
      await page.getByRole('button', { name: /create session/i }).click();
    });

    await test.step('Inline error is announced via role=alert', async () => {
      await expect(page.getByRole('alert')).toContainText(/wine 1.*name is required/i);
    });
  });

  test('Host Session - boundary: submit with empty correct answer shows error', async ({ page }) => {
    await test.step('Fill wine name but leave correct answer empty', async () => {
      await page.getByLabel('Wine name').fill('Test Wine');
      await page.getByRole('button', { name: /create session/i }).click();
    });

    await test.step('Alert contains field-specific error', async () => {
      await expect(page.getByRole('alert')).toContainText(/correct answer is required/i);
    });
  });
});
