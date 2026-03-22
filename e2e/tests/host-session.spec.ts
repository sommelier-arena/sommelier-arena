import { test, expect } from '@playwright/test';

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

  // Wine name question
  await page.getByLabel('Wine 1 Wine Name — correct answer').fill('Château Test 2018');
  await page.getByLabel('Wine 1 Wine Name — distractor 1').fill('Château Margaux');
  await page.getByLabel('Wine 1 Wine Name — distractor 2').fill('Château Lafite');
  await page.getByLabel('Wine 1 Wine Name — distractor 3').fill('Château Latour');
}

test.describe('Host Session', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/host');
    // After dashboard loads, click New Session to get to the form
    const newSessionBtn = page.getByRole('button', { name: /new session/i });
    if (await newSessionBtn.isVisible()) {
      await newSessionBtn.click();
    }
    // Wait for the React app to hydrate and show the form
    await expect(page.getByRole('button', { name: /create session/i })).toBeVisible();
  });

  test('Host Session - happy path creates session and shows 4-digit code @smoke', async ({ page }) => {
    await test.step('Fill in session form', async () => {
      await fillMinimalSession(page);
    });

    await test.step('Submit the form', async () => {
      await page.getByRole('button', { name: /create session/i }).click();
    });

    await test.step('Lobby shows a 4-digit session code', async () => {
      const codeText = page.getByText(/^\d{4}$/);
      await expect(codeText).toBeVisible();
    });
  });

  test('Host Session - boundary: submit with empty wine name shows error @smoke', async ({ page }) => {
    await test.step('Leave wine name empty and submit', async () => {
      await page.getByLabel('Wine 1 Color — correct answer').fill('Red');
      await page.getByRole('button', { name: /create session/i }).click();
    });

    await test.step('Inline error is announced via role=alert', async () => {
      await expect(page.getByRole('alert')).toContainText(/wine 1.*name is required/i);
    });
  });

  test('Host Session - boundary: submit with empty correct answer shows error @smoke', async ({ page }) => {
    await test.step('Fill wine name but leave correct answer empty', async () => {
      await page.getByLabel('Wine name').fill('Test Wine');
      await page.getByRole('button', { name: /create session/i }).click();
    });

    await test.step('Alert contains field-specific error', async () => {
      await expect(page.getByRole('alert')).toContainText(/correct answer is required/i);
    });
  });

  test('Host Session - URL updates to include ?code= after session is created @smoke', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/host');

    const newBtn = page.getByRole('button', { name: /new session/i });
    if (await newBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newBtn.click();
    }
    await expect(page.getByRole('button', { name: /create session/i })).toBeVisible();

    await page.getByLabel('Wine name').fill('URL Test Wine');
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
    await page.getByRole('button', { name: /create session/i }).click();

    await expect(page.getByText(/^\d{4}$/)).toBeVisible();

    // After entering lobby, the URL should contain ?code=
    await expect(page).toHaveURL(/[?&]code=\d{4}/);
    await ctx.close();
  });

  test('Host reconnects via share URL in new context @smoke', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();
    await page1.goto('/host');

    const newBtn = page1.getByRole('button', { name: /new session/i });
    if (await newBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newBtn.click();
    }
    await page1.getByLabel('Wine name').fill('Reconnect Test Wine');
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
    await page1.getByRole('button', { name: /create session/i }).click();

    const codeEl = page1.getByText(/^\d{4}$/);
    await expect(codeEl).toBeVisible();
    const code = ((await codeEl.textContent()) ?? '').trim();
    const shareUrl = page1.url();

    // Open share URL in a new context (simulates host in new tab/browser)
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await page2.goto(shareUrl);

    // Host should be reconnected to the lobby showing the session code
    await expect(page2.getByText(code)).toBeVisible({ timeout: 8000 });

    await ctx1.close();
    await ctx2.close();
  });
});
