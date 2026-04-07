/**
 * Tests for features new in v2.0 (PartyKit migration).
 * Tags: @smoke, @full
 */
import { test, expect, type Browser } from '@playwright/test';

// ── Helper: fill and submit a session form ────────────────────────────────────

async function createSession(browser: Browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/host');

  // Dashboard phase — click New Session
  const newSessionBtn = page.getByRole('button', { name: /new blind testing/i });
  // Use waitFor — isVisible() returns immediately without retrying. On mobile/slow browsers
  // React may not have hydrated yet, causing isVisible() to return false prematurely.
  if (await newSessionBtn.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false)) {
    await newSessionBtn.click();
  }
  await expect(page.getByRole('button', { name: /create tasting/i })).toBeVisible();

  await page.getByLabel('Wine name', { exact: true }).fill('Test Wine v2');

  await page.getByRole('button', { name: /create tasting/i }).click();

  const codeEl = page.locator('[aria-label^="Tasting code"]');
  await expect(codeEl.first()).toBeVisible();
  const code = ((await codeEl.first().getAttribute('aria-label')) ?? '').replace(/\D/g, '');

  return { page, ctx, code };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('New features (v2.0)', () => {
  test('Host dashboard shows at /host before session creation @smoke', async ({ page }) => {
    await page.goto('/host');
    await test.step('Dashboard heading or Sommelier Arena branding is visible', async () => {
      await expect(page.getByRole('heading', { name: /sommelier arena/i })).toBeVisible();
    });
    await test.step('New Session button is present', async () => {
      await expect(page.getByRole('button', { name: /new blind testing/i })).toBeVisible();
    });
  });

  test('Host ID is displayed on dashboard @smoke', async ({ page }) => {
    await page.goto('/host');
    // Host ID is in ADJECTIVE-NOUN format
    await test.step('Host ID matches Adjective-NOUN pattern', async () => {
      const hostIdText = page.getByText(/^[A-Z]+-[A-Z]+$/);
      await expect(hostIdText).toBeVisible();
    });
  });

  test('Session form has wine_name category @smoke', async ({ page }) => {
    await page.goto('/host');
    const newSessionBtn = page.getByRole('button', { name: /new blind testing/i });
    if (await newSessionBtn.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false)) {
      await newSessionBtn.click();
    }
    await expect(page.getByText('Wine Name', { exact: true })).toBeVisible();
  });

  test('Session form has timer slider @smoke', async ({ page }) => {
    await page.goto('/host');
    const newSessionBtn = page.getByRole('button', { name: /new blind testing/i });
    if (await newSessionBtn.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false)) {
      await newSessionBtn.click();
    }
    const slider = page.getByRole('slider', { name: /timer/i });
    await expect(slider).toBeVisible();
    await expect(slider).toHaveValue('60');
  });

  test('SessionCreated component shows share buttons after creation @full', async ({ browser }) => {
    const { page } = await createSession(browser);

    await test.step('Share link section visible', async () => {
      await expect(page.getByRole('button', { name: /copy participant link/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /whatsapp/i })).toBeVisible();
    });
  });

  test('Participant can join and see lobby @full', async ({ browser }) => {
    const { code } = await createSession(browser);

    const participantCtx = await browser.newContext();
    const participantPage = await participantCtx.newPage();

    await participantPage.goto('/play');
    await participantPage.getByLabel(/tasting code/i).fill(code);
    await participantPage.getByRole('button', { name: /join/i }).click();

    await test.step('Participant enters waiting lobby', async () => {
      await expect(participantPage.getByText(/waiting/i).last()).toBeVisible({ timeout: 10_000 });
    });

    await participantCtx.close();
  });

  test('Question view shows 2x2 option grid @full', async ({ browser }) => {
    const { page: hostPage, code } = await createSession(browser);

    const participantCtx = await browser.newContext();
    const participantPage = await participantCtx.newPage();

    await participantPage.goto('/play');
    await participantPage.getByLabel(/tasting code/i).fill(code);
    await participantPage.getByRole('button', { name: /join/i }).click();
    await expect(participantPage.getByText(/waiting/i).last()).toBeVisible({ timeout: 10_000 });

    // Host starts game
    await hostPage.getByRole('button', { name: /start game/i }).click();

    await test.step('Participant sees 4 answer buttons in 2x2 grid', async () => {
      // Target buttons inside the options grid specifically to avoid NavBar/other buttons
      const grid = participantPage.locator('.grid-cols-2');
      await expect(grid).toBeVisible({ timeout: 10_000 });
      const buttons = grid.getByRole('button');
      await expect(buttons).toHaveCount(4);
    });

    await participantCtx.close();
  });

  test('Participant can change answer before reveal @full', async ({ browser }) => {
    const { page: hostPage, code } = await createSession(browser);

    const participantCtx = await browser.newContext();
    const participantPage = await participantCtx.newPage();

    await participantPage.goto('/play');
    await participantPage.getByLabel(/tasting code/i).fill(code);
    await participantPage.getByRole('button', { name: /join/i }).click();
    await expect(participantPage.getByText(/waiting/i).last()).toBeVisible({ timeout: 10_000 });

    // Wait for host to receive lobby:updated (participant count > 0 enables Start Game)
    await expect(hostPage.getByRole('button', { name: /start game/i })).toBeEnabled({ timeout: 10_000 });
    await hostPage.getByRole('button', { name: /start game/i }).click();

    // Wait for question buttons to appear (aria-pressed is on the button itself)
    const optionButtons = participantPage.locator('button[aria-pressed]');
    await expect(optionButtons.first()).toBeVisible({ timeout: 10_000 });

    await test.step('Select first option', async () => {
      await optionButtons.first().click();
    });

    await test.step('Select a different option — should not be blocked', async () => {
      const allOptions = await optionButtons.all();
      if (allOptions.length > 1) {
        await allOptions[1].click();
        // Second button should now have aria-pressed=true
        await expect(allOptions[1]).toHaveAttribute('aria-pressed', 'true');
        // First should no longer be pressed
        await expect(allOptions[0]).toHaveAttribute('aria-pressed', 'false');
      }
    });

    await participantCtx.close();
  });

  test('Host can edit tasting in lobby before game starts @full', async ({ browser }) => {
    const { page: hostPage } = await createSession(browser);

    await test.step('Edit Tasting button is visible in lobby', async () => {
      await expect(hostPage.getByRole('button', { name: /edit tasting/i })).toBeVisible();
    });

    await test.step('Click Edit Tasting shows the form in edit mode with original title', async () => {
      await hostPage.getByRole('button', { name: /edit tasting/i }).click();
      await expect(hostPage.getByRole('button', { name: /update tasting/i })).toBeVisible();
      await expect(hostPage.getByRole('heading', { name: /edit blind tasting/i }).first()).toBeVisible();
    });

    await test.step('Submit updated wines returns to lobby', async () => {
      // Change the wine name
      await hostPage.getByLabel('Wine name', { exact: true }).fill('Updated Wine');
      await hostPage.getByRole('button', { name: /update tasting/i }).click();
      // Should return to lobby (SessionCreated / code display visible)
      await expect(hostPage.locator('[aria-label^="Tasting code"]').first()).toBeVisible({ timeout: 10_000 });
    });
  });
});
