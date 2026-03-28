/**
 * multi-round.spec.ts
 * CUJ-4: Multi-wine game — "Next Round" between wines, "See Final Results" after last.
 *
 * Tags: @full
 */
import { test, expect, type Browser, type Page } from '@playwright/test';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fill one wine block on the session form. */
async function fillWine(
  page: Page,
  wineNum: number,
  wineName: string,
) {
  await page.getByLabel(`Wine name`, { exact: true }).nth(wineNum - 1).fill(wineName);

  const prefix = `Wine ${wineNum}`;
  await page.getByLabel(`${prefix} Color — correct answer`).fill('Red');
  await page.getByLabel(`${prefix} Color — distractor 1`).fill('White');
  await page.getByLabel(`${prefix} Color — distractor 2`).fill('Rosé');
  await page.getByLabel(`${prefix} Color — distractor 3`).fill('Orange');

  await page.getByLabel(`${prefix} Country — correct answer`).fill('France');
  await page.getByLabel(`${prefix} Country — distractor 1`).fill('Italy');
  await page.getByLabel(`${prefix} Country — distractor 2`).fill('Spain');
  await page.getByLabel(`${prefix} Country — distractor 3`).fill('USA');

  await page.getByLabel(`${prefix} Grape Variety — correct answer`).fill('Merlot');
  await page.getByLabel(`${prefix} Grape Variety — distractor 1`).fill('Cabernet');
  await page.getByLabel(`${prefix} Grape Variety — distractor 2`).fill('Syrah');
  await page.getByLabel(`${prefix} Grape Variety — distractor 3`).fill('Pinot');

  await page.getByLabel(`${prefix} Vintage Year — correct answer`).fill('2018');
  await page.getByLabel(`${prefix} Vintage Year — distractor 1`).fill('2015');
  await page.getByLabel(`${prefix} Vintage Year — distractor 2`).fill('2019');
  await page.getByLabel(`${prefix} Vintage Year — distractor 3`).fill('2020');

  await page.getByLabel(`${prefix} Wine Name — correct answer`).fill(`${wineName} 2018`);
  await page.getByLabel(`${prefix} Wine Name — distractor 1`).fill('Château Margaux');
  await page.getByLabel(`${prefix} Wine Name — distractor 2`).fill('Château Lafite');
  await page.getByLabel(`${prefix} Wine Name — distractor 3`).fill('Château Latour');
}

/** Create a session with two wines. Returns hostPage, hostCtx, and session code. */
async function hostCreateTwoWineSession(browser: Browser) {
  const hostCtx = await browser.newContext();
  const hostPage = await hostCtx.newPage();
  await hostPage.goto('/host');

  const newSessionBtn = hostPage.getByRole('button', { name: /new session/i });
  if (await newSessionBtn.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false)) {
    await newSessionBtn.click();
  }
  await expect(hostPage.getByRole('button', { name: /create session/i })).toBeVisible();

  // Fill wine 1
  await fillWine(hostPage, 1, 'Bordeaux Rouge');

  // Add wine 2
  await hostPage.getByRole('button', { name: /add wine/i }).click();
  await fillWine(hostPage, 2, 'Burgundy Blanc');

  await hostPage.getByRole('button', { name: /create session/i }).click();

  const codeEl = hostPage.locator('[aria-label^="Session code"]');
  await expect(codeEl.first()).toBeVisible();
  const code = ((await codeEl.first().getAttribute('aria-label')) ?? '').replace(/\D/g, '');

  return { hostPage, hostCtx, code };
}

/** Skip all questions in the current round without answering. */
async function skipRound(hostPage: Page) {
  // Reveal each question and click Next until round leaderboard appears.
  // Use waitFor instead of isVisible — isVisible doesn't retry, so it would
  // return false immediately if the question hasn't rendered yet after a state change.
  while (true) {
    const revealBtn = hostPage.getByRole('button', { name: /reveal answer/i });
    const isQuestion = await revealBtn.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false);
    if (!isQuestion) break;
    await revealBtn.click();
    const nextBtn = hostPage.getByRole('button', { name: /next/i });
    await expect(nextBtn).toBeVisible({ timeout: 10_000 });
    await nextBtn.click();
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Multi-Round Game Flow', () => {
  test('Multi-round — "Next Round" shown after round 1, "See Final Results" after round 2 @full', async ({ browser }) => {
    const { hostPage, hostCtx, code } = await test.step('Host creates 2-wine session', async () => {
      return hostCreateTwoWineSession(browser);
    });

    expect(code).toMatch(/^\d{4}$/);

    // A participant must join before "Start Game" becomes enabled
    const participantCtx = await browser.newContext();
    const participantPage = await participantCtx.newPage();
    await test.step('Participant joins the session', async () => {
      await participantPage.goto('/play');
      await participantPage.getByRole('textbox').fill(code);
      await participantPage.getByRole('button', { name: /join/i }).click();
      await expect(participantPage.getByText(/waiting for host/i).last()).toBeVisible({ timeout: 10_000 });
      // Wait for host to see the participant (Start Game becomes enabled)
      await expect(hostPage.getByRole('button', { name: /start game/i })).toBeEnabled({ timeout: 10_000 });
    });

    await test.step('Host starts game', async () => {
      await hostPage.getByRole('button', { name: /start game/i }).click();
      await expect(hostPage.getByRole('button', { name: /reveal answer/i })).toBeVisible({ timeout: 8000 });
    });

    await test.step('Host completes round 1 questions', async () => {
      await skipRound(hostPage);
    });

    await test.step('Round 1 leaderboard shows "Next Round" (not "See Final Results")', async () => {
      await expect(hostPage.getByRole('button', { name: /next round/i })).toBeVisible();
      await expect(hostPage.getByRole('button', { name: /see final results/i })).not.toBeVisible();
    });

    await test.step('Host clicks "Next Round" — round 2 starts', async () => {
      await hostPage.getByRole('button', { name: /next round/i }).click();
      await expect(hostPage.getByRole('button', { name: /reveal answer/i })).toBeVisible({ timeout: 8000 });
    });

    await test.step('Host completes round 2 questions', async () => {
      await skipRound(hostPage);
    });

    await test.step('Round 2 leaderboard shows "See Final Results" (not "Next Round")', async () => {
      await expect(hostPage.getByRole('button', { name: /see final results/i })).toBeVisible();
      await expect(hostPage.getByRole('button', { name: /next round/i })).not.toBeVisible();
    });

    await test.step('Host clicks "See Final Results" — final leaderboard shown', async () => {
      await hostPage.getByRole('button', { name: /see final results/i }).click();
      await expect(hostPage.getByRole('heading', { name: /final leaderboard/i })).toBeVisible();
    });

    await hostCtx.close();
    await participantCtx.close();
  });
});
