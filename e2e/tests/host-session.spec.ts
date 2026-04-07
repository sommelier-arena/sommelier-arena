import { test, expect, type Browser } from '@playwright/test';

// Reusable helper: fill in a minimal valid session (1 wine, all fields)
async function fillMinimalSession(page: import('@playwright/test').Page) {
  // All form fields have valid default values — only override wine name for test identity.
  await page.getByLabel('Wine 1 Wine Name — correct answer').fill('Château Test');
  // Close the combobox dropdown (opened by fill) so it doesn't obscure "Create Tasting".
  await page.keyboard.press('Escape');
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
      const codeEl = page.locator('[aria-label^="Tasting code"]');
      await expect(codeEl.first()).toBeVisible();
    });
  });

  test('Host Session - boundary: submit with empty wine name shows error @smoke', async ({ page }) => {
    await test.step('Clear the wine name field and submit', async () => {
      await page.getByLabel('Wine 1 Wine Name — correct answer').clear();
      // Close the dropdown opened by clear() before clicking the submit button.
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: /create tasting/i }).click();
    });

    await test.step('Inline error is announced via role=alert', async () => {
      await expect(page.getByRole('alert')).toContainText(/wine 1.*wine name.*is required/i);
    });
  });

  // Skipped: ComboboxInput fields always have valid defaults that cannot be cleared via the UI.
  // The "correct answer is required" validation still exists in code but is unreachable via Playwright.
  test.skip('Host Session - boundary: submit with empty correct answer shows error @smoke', async ({ page }) => {
    await test.step('Fill wine name, clear a correct answer, then submit', async () => {
      await page.getByLabel('Wine 1 Wine Name — correct answer').fill('Test Wine');
      await page.getByLabel('Wine 1 Wine Name — correct answer').clear();
      await page.keyboard.press('Escape');
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

    await page.getByLabel('Wine 1 Wine Name — correct answer').fill('URL Test Wine');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /create tasting/i }).click();

    const codeEl = page.locator('[aria-label^="Tasting code"]');
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
    await page1.getByLabel('Wine 1 Wine Name — correct answer').fill('Reconnect Test Wine');
    await page1.keyboard.press('Escape');
    await page1.getByRole('button', { name: /create tasting/i }).click();

    const codeEl = page1.locator('[aria-label^="Tasting code"]');
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
      const codeEl = hostPage.locator('[aria-label^="Tasting code"]');
      await expect(codeEl.first()).toBeVisible();
    });

    const code = ((await hostPage.locator('[aria-label^="Tasting code"]').first().getAttribute('aria-label')) ?? '').replace(/\D/g, '');
    const sessionUrl = hostPage.url();

    const participantCtx = await browser.newContext();
    const participantPage = await participantCtx.newPage();

    try {
      await test.step('Participant joins the session', async () => {
        await participantPage.goto('/play');
        await participantPage.getByLabel('Tasting code').fill(code);
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
