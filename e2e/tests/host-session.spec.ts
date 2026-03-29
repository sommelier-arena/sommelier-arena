import { test, expect, type Browser } from '@playwright/test';

// Reusable helper: fill in a minimal valid session (1 wine, all fields)
async function fillMinimalSession(page: import('@playwright/test').Page) {
  await page.getByLabel('Wine name', { exact: true }).fill('Château Test');

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

  // Wine name question
  await page.getByLabel('Wine 1 Wine Name — correct answer').fill('Château Test 2018');
  await page.getByLabel('Wine 1 Wine Name — distractor 1').fill('Château Margaux');
  await page.getByLabel('Wine 1 Wine Name — distractor 2').fill('Château Lafite');
  await page.getByLabel('Wine 1 Wine Name — distractor 3').fill('Château Latour');
}

test.describe('Host Session', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/host');
    // After dashboard loads, click New Blind Testing to get to the form
    const newSessionBtn = page.getByRole('button', { name: /new blind testing/i });
    // Use waitFor — isVisible() returns immediately without retrying. On mobile/slow browsers
    // React may not have hydrated yet, causing isVisible() to return false prematurely.
    if (await newSessionBtn.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false)) {
      await newSessionBtn.click();
    }
    // Wait for the React app to hydrate and show the form
    await expect(page.getByRole('button', { name: /create tasting/i })).toBeVisible();
  });

  test('Host Session - happy path creates session and shows 4-digit code @smoke', async ({ page }) => {
    await test.step('Fill in session form', async () => {
      await fillMinimalSession(page);
    });

    await test.step('Submit the form', async () => {
      await page.getByRole('button', { name: /create tasting/i }).click();
    });

    await test.step('Lobby shows a 4-digit session code', async () => {
      const codeEl = page.locator('[aria-label^="Session code"]');
      await expect(codeEl.first()).toBeVisible();
    });
  });

  test('Host Session - boundary: submit with empty wine name shows error @smoke', async ({ page }) => {
    await test.step('Leave wine name empty and submit', async () => {
      await page.getByLabel('Wine 1 Color — correct answer').fill('Red');
      await page.getByRole('button', { name: /create tasting/i }).click();
    });

    await test.step('Inline error is announced via role=alert', async () => {
      await expect(page.getByRole('alert')).toContainText(/wine 1.*name is required/i);
    });
  });

  test('Host Session - boundary: submit with empty correct answer shows error @smoke', async ({ page }) => {
    await test.step('Fill wine name, clear a correct answer, then submit', async () => {
      await page.getByLabel('Wine name', { exact: true }).fill('Test Wine');
      // Clear the Color correct answer (it has a default value — clear it to trigger validation)
      await page.getByLabel('Wine 1 Color — correct answer').clear();
      await page.getByRole('button', { name: /create tasting/i }).click();
    });

    await test.step('Alert contains field-specific error', async () => {
      await expect(page.getByRole('alert')).toContainText(/correct answer is required/i);
    });
  });

  test('Host Session - URL updates to include ?code= after session is created @smoke', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/host');

    const newBtn = page.getByRole('button', { name: /new blind testing/i });
    if (await newBtn.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false)) {
      await newBtn.click();
    }
    await expect(page.getByRole('button', { name: /create tasting/i })).toBeVisible();

    await page.getByLabel('Wine name', { exact: true }).fill('URL Test Wine');
    await page.getByLabel('Wine 1 Color — correct answer').fill('Red');
    await page.getByLabel('Wine 1 Color — distractor 1').fill('White');
    await page.getByLabel('Wine 1 Color — distractor 2').fill('Rosé');
    await page.getByLabel('Wine 1 Color — distractor 3').fill('Orange');
    await page.getByLabel('Wine 1 Country — correct answer').fill('France');
    await page.getByLabel('Wine 1 Country — distractor 1').fill('Italy');
    await page.getByLabel('Wine 1 Country — distractor 2').fill('Spain');
    await page.getByLabel('Wine 1 Country — distractor 3').fill('USA');
    await page.getByLabel('Wine 1 Grape Variety — correct answer').fill('Merlot');
    await page.getByLabel('Wine 1 Grape Variety — distractor 1').fill('Cabernet');
    await page.getByLabel('Wine 1 Grape Variety — distractor 2').fill('Syrah');
    await page.getByLabel('Wine 1 Grape Variety — distractor 3').fill('Pinot');
    await page.getByLabel('Wine 1 Vintage Year — correct answer').fill('2020');
    await page.getByLabel('Wine 1 Vintage Year — distractor 1').fill('2015');
    await page.getByLabel('Wine 1 Vintage Year — distractor 2').fill('2019');
    await page.getByLabel('Wine 1 Vintage Year — distractor 3').fill('2018');
    await page.getByLabel('Wine 1 Wine Name — correct answer').fill('URL Test 2020');
    await page.getByLabel('Wine 1 Wine Name — distractor 1').fill('Château Margaux');
    await page.getByLabel('Wine 1 Wine Name — distractor 2').fill('Château Lafite');
    await page.getByLabel('Wine 1 Wine Name — distractor 3').fill('Château Latour');
    await page.getByRole('button', { name: /create tasting/i }).click();

    const codeEl = page.locator('[aria-label^="Session code"]');
    await expect(codeEl.first()).toBeVisible();

    // After entering lobby, the URL should contain ?code=
    await expect(page).toHaveURL(/[?&]code=\d{4}/);
    await ctx.close();
  });

  test('Host reconnects via share URL in new context @smoke', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();
    await page1.goto('/host');

    const newBtn = page1.getByRole('button', { name: /new blind testing/i });
    if (await newBtn.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false)) {
      await newBtn.click();
    }
    await page1.getByLabel('Wine name', { exact: true }).fill('Reconnect Test Wine');
    await page1.getByLabel('Wine 1 Color — correct answer').fill('Red');
    await page1.getByLabel('Wine 1 Color — distractor 1').fill('White');
    await page1.getByLabel('Wine 1 Color — distractor 2').fill('Rosé');
    await page1.getByLabel('Wine 1 Color — distractor 3').fill('Orange');
    await page1.getByLabel('Wine 1 Country — correct answer').fill('France');
    await page1.getByLabel('Wine 1 Country — distractor 1').fill('Italy');
    await page1.getByLabel('Wine 1 Country — distractor 2').fill('Spain');
    await page1.getByLabel('Wine 1 Country — distractor 3').fill('USA');
    await page1.getByLabel('Wine 1 Grape Variety — correct answer').fill('Merlot');
    await page1.getByLabel('Wine 1 Grape Variety — distractor 1').fill('Cabernet');
    await page1.getByLabel('Wine 1 Grape Variety — distractor 2').fill('Syrah');
    await page1.getByLabel('Wine 1 Grape Variety — distractor 3').fill('Pinot');
    await page1.getByLabel('Wine 1 Vintage Year — correct answer').fill('2020');
    await page1.getByLabel('Wine 1 Vintage Year — distractor 1').fill('2015');
    await page1.getByLabel('Wine 1 Vintage Year — distractor 2').fill('2019');
    await page1.getByLabel('Wine 1 Vintage Year — distractor 3').fill('2018');
    await page1.getByLabel('Wine 1 Wine Name — correct answer').fill('Reconnect Test 2020');
    await page1.getByLabel('Wine 1 Wine Name — distractor 1').fill('Château Margaux');
    await page1.getByLabel('Wine 1 Wine Name — distractor 2').fill('Château Lafite');
    await page1.getByLabel('Wine 1 Wine Name — distractor 3').fill('Château Latour');
    await page1.getByRole('button', { name: /create tasting/i }).click();

    const codeEl = page1.locator('[aria-label^="Session code"]');
    await expect(codeEl.first()).toBeVisible();
    const code = ((await codeEl.first().getAttribute('aria-label')) ?? '').replace(/\D/g, '');
    const shareUrl = page1.url();

    // Open share URL in a new context (simulates host in new tab/browser)
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await page2.goto(shareUrl);

    // Host should be reconnected to the lobby showing the session code
    await expect(page2.getByText(code, { exact: true })).toBeVisible({ timeout: 20_000 });

    await ctx1.close();
    await ctx2.close();
  });

  test('participant remains visible in lobby when host navigates away and back @smoke', async ({ browser }) => {
    // R5-B fix: host session state must survive a navigation away and back to the session URL.
    const hostCtx = await browser.newContext();
    const hostPage = await hostCtx.newPage();

    await test.step('Host creates a session', async () => {
      await hostPage.goto('/host');
      const newBtn = hostPage.getByRole('button', { name: /new blind testing/i });
      if (await newBtn.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false)) {
        await newBtn.click();
      }
      await expect(hostPage.getByRole('button', { name: /create tasting/i })).toBeVisible();
      await fillMinimalSession(hostPage);
      await hostPage.getByRole('button', { name: /create tasting/i }).click();
      const codeEl = hostPage.locator('[aria-label^="Session code"]');
      await expect(codeEl.first()).toBeVisible();
    });

    const code = ((await hostPage.locator('[aria-label^="Session code"]').first().getAttribute('aria-label')) ?? '').replace(/\D/g, '');
    const sessionUrl = hostPage.url();

    const participantCtx = await browser.newContext();
    const participantPage = await participantCtx.newPage();

    try {
      await test.step('Participant joins the session', async () => {
        await participantPage.goto('/play');
        await participantPage.getByLabel('Session code').fill(code);
        await participantPage.getByRole('button', { name: /join/i }).click();
        await expect(participantPage.getByText(/waiting for the host/i).last()).toBeVisible();
      });

      await test.step('Participant pseudonym appears in the host lobby', async () => {
        // The participant list should contain at least one entry
        await expect(hostPage.getByRole('listitem').first()).toBeVisible({ timeout: 10_000 });
      });

      const participantName = ((await hostPage.getByRole('listitem').first().textContent()) ?? '').trim();

      await test.step('Host navigates away to the dashboard', async () => {
        await hostPage.goto('/host');
        await expect(hostPage.getByRole('button', { name: /new blind testing/i })).toBeVisible();
      });

      await test.step('Host navigates back to the session URL', async () => {
        await hostPage.goto(sessionUrl);
        await expect(hostPage.getByText(code, { exact: true })).toBeVisible({ timeout: 10_000 });
      });

      await test.step('Participant is still listed in the lobby', async () => {
        // The participant should still be visible — R5-B regression guard
        await expect(hostPage.getByRole('listitem').first()).toBeVisible({ timeout: 10_000 });
        if (participantName) {
          await expect(hostPage.getByText(participantName)).toBeVisible({ timeout: 10_000 });
        }
      });
    } finally {
      await participantCtx.close();
      await hostCtx.close();
    }
  });
});
