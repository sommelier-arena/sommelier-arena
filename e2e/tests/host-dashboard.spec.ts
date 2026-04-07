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

  const newBtn = page.getByRole('button', { name: /new blind testing/i });
  if (await newBtn.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false)) {
    await newBtn.click();
  }
  await expect(page.getByRole('button', { name: /create tasting/i })).toBeVisible();

  await page.getByLabel('Wine 1 Wine Name — correct answer').fill('Dashboard Test Wine');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /create tasting/i }).click();

  const codeEl = page.locator('[aria-label^="Tasting code"]');
  await expect(codeEl.first()).toBeVisible();
  const aria = (await codeEl.first().getAttribute('aria-label')) ?? '';
  const code = aria.replace(/\D/g, '');

  return { page, ctx, code };
}

test.describe('Host Dashboard', () => {
  test('Dashboard shows at /host and has "New Blind Testing" button @smoke', async ({ page }) => {
    await page.goto('/host');
    await expect(page.getByRole('button', { name: /new blind testing/i })).toBeVisible();
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
      // The session code should be visible (match exact digits, avoid matching share URL)
      await expect(page.getByText(code, { exact: true })).toBeVisible({ timeout: 10_000 });
      // The Open badge should be present
      await expect(page.getByText(/🟢 Open/)).toBeVisible({ timeout: 8000 });
      // The Open button should be present
      await expect(page.getByRole('button', { name: /^open$/i })).toBeVisible();
    });

    await ctx.close();
  });

  test('host can delete a session from the dashboard @smoke', async ({ browser }) => {
    const { page, ctx, code } = await test.step('Create a session', async () => {
      return createSessionGetCode(browser);
    });

    await test.step('Navigate back to the dashboard', async () => {
      await page.goto('/host');
    });

    await test.step('Session appears in the dashboard', async () => {
      await expect(page.getByText(code, { exact: true })).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Click the delete button for the session', async () => {
      const deleteBtn = page.getByRole('button', { name: new RegExp(`Delete tasting ${code}`, 'i') });
      await expect(deleteBtn).toBeVisible({ timeout: 10_000 });
      await deleteBtn.click();
    });

    await test.step('Session is no longer listed in the dashboard', async () => {
      await expect(page.getByText(code)).not.toBeVisible({ timeout: 10_000 });
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
      await expect(openBtn).toBeVisible({ timeout: 10_000 });
      await openBtn.click();
      // Should see the session code in the lobby
      await expect(page.getByText(code, { exact: true })).toBeVisible({ timeout: 10_000 });
    });

    await ctx.close();
  });
});
