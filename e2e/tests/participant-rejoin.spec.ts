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

  const newSessionBtn = hostPage.getByRole('button', { name: /new session/i });
  if (await newSessionBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await newSessionBtn.click();
  }
  await expect(hostPage.getByRole('button', { name: /create session/i })).toBeVisible();

  await hostPage.getByLabel('Wine name').fill('Rejoin Test Wine');
  await hostPage.getByLabel('Wine 1 Color — correct answer').fill('Red');
  await hostPage.getByLabel('Wine 1 Color — distractor 1').fill('White');
  await hostPage.getByLabel('Wine 1 Color — distractor 2').fill('Rosé');
  await hostPage.getByLabel('Wine 1 Color — distractor 3').fill('Orange');
  await hostPage.getByLabel('Wine 1 Country — correct answer').fill('France');
  await hostPage.getByLabel('Wine 1 Country — distractor 1').fill('Italy');
  await hostPage.getByLabel('Wine 1 Country — distractor 2').fill('Spain');
  await hostPage.getByLabel('Wine 1 Country — distractor 3').fill('USA');
  await hostPage.getByLabel('Wine 1 Grape Variety — correct answer').fill('Merlot');
  await hostPage.getByLabel('Wine 1 Grape Variety — distractor 1').fill('Cabernet');
  await hostPage.getByLabel('Wine 1 Grape Variety — distractor 2').fill('Syrah');
  await hostPage.getByLabel('Wine 1 Grape Variety — distractor 3').fill('Pinot');
  await hostPage.getByLabel('Wine 1 Vintage Year — correct answer').fill('2020');
  await hostPage.getByLabel('Wine 1 Vintage Year — distractor 1').fill('2015');
  await hostPage.getByLabel('Wine 1 Vintage Year — distractor 2').fill('2019');
  await hostPage.getByLabel('Wine 1 Vintage Year — distractor 3').fill('2018');
  await hostPage.getByLabel('Wine 1 Wine Name — correct answer').fill('Rejoin Test 2020');
  await hostPage.getByLabel('Wine 1 Wine Name — distractor 1').fill('Château Margaux');
  await hostPage.getByLabel('Wine 1 Wine Name — distractor 2').fill('Château Lafite');
  await hostPage.getByLabel('Wine 1 Wine Name — distractor 3').fill('Château Latour');
  await hostPage.getByRole('button', { name: /create session/i }).click();

  const codeEl = hostPage.getByText(/^\d{4}$/);
  await expect(codeEl).toBeVisible();
  const code = ((await codeEl.textContent()) ?? '').trim();

  // --- Participant ---
  const participantCtx = await browser.newContext();
  const participantPage = await participantCtx.newPage();
  await participantPage.goto('/play');
  await participantPage.getByRole('textbox').fill(code);
  await participantPage.getByRole('button', { name: /join/i }).click();
  // Participant sees their pseudonym in lobby
  await expect(participantPage.getByText(/waiting for host/i)).toBeVisible({ timeout: 5000 });

  return { hostPage, hostCtx, participantPage, participantCtx, code };
}

test.describe('Participant Rejoin', () => {
  test('Participant auto-rejoins after page refresh mid-game @smoke', async ({ browser }) => {
    const { hostPage, hostCtx, participantPage, participantCtx, code } =
      await test.step('Setup: host creates session, participant joins', async () => {
        return createSessionAndJoin(browser);
      });

    await test.step('Host starts game', async () => {
      await hostPage.getByRole('button', { name: /start game/i }).click();
      await expect(participantPage.getByRole('button').first()).toBeVisible({ timeout: 5000 });
    });

    await test.step('Participant refreshes page', async () => {
      await participantPage.reload();
    });

    await test.step('Participant auto-rejoins and sees question or lobby', async () => {
      // After rejoin, participant should be back in the game (question or lobby)
      await expect(participantPage.getByText(new RegExp(`${code}|waiting|question`, 'i'))).toBeVisible({ timeout: 8000 });
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
      // Reveal each question and advance
      for (let i = 0; i < 5; i++) {
        const revealBtn = hostPage.getByRole('button', { name: /reveal answer/i });
        if (await revealBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await revealBtn.click();
          const nextBtn = hostPage.getByRole('button', { name: /next/i });
          await expect(nextBtn).toBeVisible();
          await nextBtn.click();
        } else {
          break;
        }
      }
    });

    await test.step('Host clicks "See Final Results"', async () => {
      const finalBtn = hostPage.getByRole('button', { name: /see final results/i });
      if (await finalBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await finalBtn.click();
      }
    });

    await test.step('Participant sees final leaderboard with "Play Another Session" button', async () => {
      await expect(participantPage.getByRole('button', { name: /play another session/i })).toBeVisible({ timeout: 8000 });
    });

    await test.step('Participant clicks "Play Another Session" and lands on join form', async () => {
      await participantPage.getByRole('button', { name: /play another session/i }).click();
      // Should navigate to /play and show the join form (no stale code pre-filled)
      await expect(participantPage).toHaveURL(/\/play/);
      await expect(participantPage.getByRole('textbox')).toBeVisible({ timeout: 5000 });
      // The textbox should be empty (no stale session code)
      await expect(participantPage.getByRole('textbox')).toHaveValue('');
    });

    await hostCtx.close();
    await participantCtx.close();
  });
});
