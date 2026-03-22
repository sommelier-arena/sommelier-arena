/**
 * host-dashboard.spec.ts
 * CUJ-11: Host sessions dashboard — shows open + ended sessions, Open / Results buttons.
 *
 * Tags: @smoke
 */
import { test, expect, type Browser } from '@playwright/test';

/** Create a session and return to dashboard (without starting the game). */
async function createSessionGetCode(browser: Browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/host');

  const newBtn = page.getByRole('button', { name: /new session/i });
  if (await newBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await newBtn.click();
  }
  await expect(page.getByRole('button', { name: /create session/i })).toBeVisible();

  await page.getByLabel('Wine name').fill('Dashboard Test Wine');
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
  await page.getByLabel('Wine 1 Wine Name — correct answer').fill('Dashboard Test 2020');
  await page.getByLabel('Wine 1 Wine Name — distractor 1').fill('Château Margaux');
  await page.getByLabel('Wine 1 Wine Name — distractor 2').fill('Château Lafite');
  await page.getByLabel('Wine 1 Wine Name — distractor 3').fill('Château Latour');

  await page.getByRole('button', { name: /create session/i }).click();

  const codeEl = page.getByText(/^\d{4}$/);
  await expect(codeEl).toBeVisible();
  const code = ((await codeEl.textContent()) ?? '').trim();

  return { page, ctx, code };
}

test.describe('Host Dashboard', () => {
  test('Dashboard shows at /host and has "New Session" button @smoke', async ({ page }) => {
    await page.goto('/host');
    await expect(page.getByRole('button', { name: /new session/i })).toBeVisible();
  });

  test('Dashboard shows host ID @smoke', async ({ page }) => {
    await page.goto('/host');
    // Host ID is displayed as WORD-WORD format
    await expect(page.getByText(/[A-Z]+-[A-Z]+/)).toBeVisible();
  });

  test('Created session appears in dashboard with "Open" badge and "Open" button @smoke', async ({ browser }) => {
    const { page, ctx, code } = await test.step('Create a session', async () => {
      return createSessionGetCode(browser);
    });

    await test.step('Navigate to lobby then back to dashboard to verify persistence', async () => {
      // We are in lobby. Go back to dashboard.
      await page.goto('/host');
    });

    await test.step('Dashboard shows the session in Active Sessions', async () => {
      // The session code should be visible
      await expect(page.getByText(code)).toBeVisible({ timeout: 5000 });
      // The Open badge should be present
      await expect(page.getByText(/🟢 Open/)).toBeVisible();
      // The Open button should be present
      await expect(page.getByRole('button', { name: /^open$/i })).toBeVisible();
    });

    await ctx.close();
  });

  test('Host can navigate back to an open session via "Open" button @smoke', async ({ browser }) => {
    const { page, ctx, code } = await test.step('Create a session', async () => {
      return createSessionGetCode(browser);
    });

    await test.step('Navigate to dashboard', async () => {
      await page.goto('/host');
    });

    await test.step('Click Open button — host rejoins lobby', async () => {
      const openBtn = page.getByRole('button', { name: /^open$/i }).first();
      await expect(openBtn).toBeVisible({ timeout: 5000 });
      await openBtn.click();
      // Should see the session code in the lobby
      await expect(page.getByText(code)).toBeVisible({ timeout: 5000 });
    });

    await ctx.close();
  });
});
