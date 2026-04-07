/**
 * participant-rejoin.spec.ts
 * CUJ-6: Participant refresh mid-game (auto-rejoin).
 * CUJ-7: Participant plays again after session ends.
 *
 * Tags: @smoke
 */
import { test, expect, type Browser } from '@playwright/test';

/** Create a session and return page + code. Shared setup. */
async function createSessionAndJoin(browser: Browser) {
  // --- Host ---
  const hostCtx = await browser.newContext();
  const hostPage = await hostCtx.newPage();
  await hostPage.goto('/host');

  const newSessionBtn = hostPage.getByRole('button', { name: /new blind testing/i });
  // Use waitFor — isVisible() returns immediately without retrying. On mobile/slow browsers
  // React may not have hydrated yet, causing isVisible() to return false prematurely.
  if (await newSessionBtn.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false)) {
    await newSessionBtn.click();
  }
  await expect(hostPage.getByRole('button', { name: /create tasting/i })).toBeVisible();

  await hostPage.getByLabel('Wine name', { exact: true }).fill('Rejoin Test Wine');
  await hostPage.getByRole('button', { name: /create tasting/i }).click();

  const codeEl = hostPage.locator('[aria-label^="Tasting code"]');
  await expect(codeEl.first()).toBeVisible();
  const code = ((await codeEl.first().getAttribute('aria-label')) ?? '').replace(/\D/g, '');

  // --- Participant ---
  const participantCtx = await browser.newContext();
  const participantPage = await participantCtx.newPage();
  await participantPage.goto('/play');
  await participantPage.getByRole('textbox').fill(code);
  await participantPage.getByRole('button', { name: /join/i }).click();
  // Participant sees their pseudonym in lobby
  await expect(participantPage.getByText(/waiting for host/i).last()).toBeVisible({ timeout: 10_000 });

  // Wait for URL to include ?id= so we can extract pseudonym for cross-device rejoin tests
  await expect(participantPage).toHaveURL(/[?&]id=[A-Z]+-[A-Z]+/, { timeout: 10_000 }).catch(() => {});

  return { hostPage, hostCtx, participantPage, participantCtx, code };
}

test.describe('Participant Rejoin', () => {
  test('Participant auto-rejoins after page refresh mid-game @smoke', async ({ browser }) => {
    const { hostPage, hostCtx, participantPage, participantCtx, code } =
      await test.step('Setup: host creates session, participant joins', async () => {
        return createSessionAndJoin(browser);
      });

    await test.step('Host starts game', async () => {
      // Wait for lobby:updated to propagate (enables Start Game button)
      await expect(hostPage.getByRole('button', { name: /start game/i })).toBeEnabled({ timeout: 10_000 });
      await hostPage.getByRole('button', { name: /start game/i }).click();
      // Wait for answer buttons specifically (not navbar/other buttons) to confirm question is live
      await expect(participantPage.locator('button[aria-pressed]').first()).toBeVisible({ timeout: 15_000 });
    });

    await test.step('Participant refreshes page', async () => {
      await participantPage.reload();
      // Wait for network activity to settle before asserting rejoin state
      await participantPage.waitForLoadState('networkidle');
    });

    await test.step('Participant auto-rejoins and sees question or lobby', async () => {
      // After rejoin, participant sees answer buttons (question phase) or lobby.
      // Note: the question view does not contain the word "question" or the code as text —
      // use structural locators instead of text matching.
      await expect(
        participantPage.locator('button[aria-pressed]').first()
          .or(participantPage.getByText(/waiting for host/i))
      ).toBeVisible({ timeout: 15000 });
    });

    await hostCtx.close();
    await participantCtx.close();
  });

  test('Participant can play again after session ends @smoke', async ({ browser }) => {
    const { hostPage, hostCtx, participantPage, participantCtx } =
      await test.step('Setup: host creates session, participant joins', async () => {
        return createSessionAndJoin(browser);
      });

    await test.step('Host starts game and skips through all questions', async () => {
      await hostPage.getByRole('button', { name: /start game/i }).click();
      // Use waitFor — isVisible() returns immediately (no retry), so it would
      // return false if the question hasn't rendered yet after game start.
      for (let i = 0; i < 5; i++) {
        const revealBtn = hostPage.getByRole('button', { name: /reveal answer/i });
        const visible = await revealBtn.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false);
        if (visible) {
          await revealBtn.click();
          // First Next: revealed → question leaderboard
          const nextBtn = hostPage.getByRole('button', { name: /next/i });
          await expect(nextBtn).toBeVisible({ timeout: 15_000 });
          await nextBtn.click();
          // Second Next: question leaderboard → next question or round leaderboard
          const nextBtn2 = hostPage.getByRole('button', { name: /next question|see round results/i });
          await expect(nextBtn2).toBeVisible({ timeout: 15_000 });
          await nextBtn2.click();
        } else {
          break;
        }
      }
    });

    await test.step('Host clicks "See Final Results"', async () => {
      const finalBtn = hostPage.getByRole('button', { name: /see final results/i });
      const visible = await finalBtn.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false);
      if (visible) {
        await finalBtn.click();
      }
    });

    await test.step('Participant sees final leaderboard with "Play Another Tasting" button', async () => {
      await expect(participantPage.getByRole('button', { name: /play another tasting/i })).toBeVisible({ timeout: 15_000 });
    });

    await test.step('Participant clicks "Play Another Tasting" and lands on join form', async () => {
      await participantPage.getByRole('button', { name: /play another tasting/i }).click();
      // Should navigate to /play and show the join form (no stale code pre-filled)
      await expect(participantPage).toHaveURL(/\/play/);
      await expect(participantPage.getByRole('textbox')).toBeVisible({ timeout: 10_000 });
      // The textbox should be empty (no stale tasting code)
      await expect(participantPage.getByRole('textbox')).toHaveValue('');
    });

    await hostCtx.close();
    await participantCtx.close();
  });

  test('Participant can rejoin from a different context using ?code=X&id=Y URL @smoke', async ({ browser }) => {
    const { hostPage, hostCtx, participantPage, participantCtx, code } =
      await test.step('Setup: host creates session, participant joins', async () => {
        return createSessionAndJoin(browser);
      });

    // Extract the ?id= param from the participant URL
    const participantUrl = participantPage.url();
    const urlParams = new URL(participantUrl).searchParams;
    const pseudonym = urlParams.get('id');

    await test.step('Participant URL contains ?id= pseudonym', async () => {
      expect(pseudonym).toMatch(/^[A-Z]+-[A-Z]+$/);
    });

    if (pseudonym) {
      await test.step('Simulate cross-device rejoin via ?code=X&id=Y URL', async () => {
        const newCtx = await browser.newContext();
        const newPage = await newCtx.newPage();
        await newPage.goto(`/play?code=${code}&id=${pseudonym}`);

        // Should auto-rejoin and land in lobby (same pseudonym)
        await expect(newPage.getByText(/waiting for host/i).last()).toBeVisible({ timeout: 8000 });

        // URL should still contain the same ?id=
        await expect(newPage).toHaveURL(new RegExp(`id=${pseudonym}`));
        await newCtx.close();
      });
    }

    await hostCtx.close();
    await participantCtx.close();
  });
});
