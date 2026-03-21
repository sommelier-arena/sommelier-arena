import { test, expect, type Browser } from '@playwright/test';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fill and submit the host form; returns the session code displayed in the lobby. */
async function hostCreateSession(browser: Browser) {
  const hostCtx = await browser.newContext();
  const hostPage = await hostCtx.newPage();
  await hostPage.goto('/host');
  await expect(hostPage.getByRole('button', { name: /create session/i })).toBeVisible();

  // Wine name
  await hostPage.getByLabel('Wine name').fill('Grand Cru Test');

  // Color
  await hostPage.getByLabel('Wine 1 Color — correct answer').fill('Red');
  await hostPage.getByLabel('Wine 1 Color — distractor 1').fill('White');
  await hostPage.getByLabel('Wine 1 Color — distractor 2').fill('Rosé');
  await hostPage.getByLabel('Wine 1 Color — distractor 3').fill('Orange');

  // Country
  await hostPage.getByLabel('Wine 1 Country — correct answer').fill('France');
  await hostPage.getByLabel('Wine 1 Country — distractor 1').fill('Italy');
  await hostPage.getByLabel('Wine 1 Country — distractor 2').fill('Spain');
  await hostPage.getByLabel('Wine 1 Country — distractor 3').fill('USA');

  // Grape variety
  await hostPage.getByLabel('Wine 1 Grape Variety — correct answer').fill('Merlot');
  await hostPage.getByLabel('Wine 1 Grape Variety — distractor 1').fill('Cabernet');
  await hostPage.getByLabel('Wine 1 Grape Variety — distractor 2').fill('Syrah');
  await hostPage.getByLabel('Wine 1 Grape Variety — distractor 3').fill('Pinot');

  // Vintage year
  await hostPage.getByLabel('Wine 1 Vintage Year — correct answer').fill('2018');
  await hostPage.getByLabel('Wine 1 Vintage Year — distractor 1').fill('2015');
  await hostPage.getByLabel('Wine 1 Vintage Year — distractor 2').fill('2019');
  await hostPage.getByLabel('Wine 1 Vintage Year — distractor 3').fill('2020');

  await hostPage.getByRole('button', { name: /create session/i }).click();

  const codeEl = hostPage.getByText(/^\d{4}$/);
  await expect(codeEl).toBeVisible();
  const code = ((await codeEl.textContent()) ?? '').trim();

  return { hostPage, hostCtx, code };
}

/** Advance host through a single question: reveal then next. */
async function revealAndAdvance(hostPage: import('@playwright/test').Page) {
  await hostPage.getByRole('button', { name: /reveal answer/i }).click();
  // After reveal, "Next" or "Next Question" button appears
  const nextBtn = hostPage.getByRole('button', { name: /next/i });
  await expect(nextBtn).toBeVisible();
  await nextBtn.click();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Full Game Flow', () => {
  test('Full game - one wine, one participant reaches final leaderboard', async ({ browser }) => {
    const { hostPage, hostCtx, code } = await test.step('Host creates session', async () => {
      return hostCreateSession(browser);
    });

    const participantCtx = await browser.newContext();
    const participantPage = await participantCtx.newPage();

    try {
      await test.step('Participant joins session', async () => {
        await participantPage.goto('/play');
        await expect(participantPage.getByRole('button', { name: /join/i })).toBeVisible();
        await participantPage.getByLabel('Session code').fill(code);
        await participantPage.getByRole('button', { name: /join/i }).click();
        // Participant is now in lobby — pseudonym should appear
        await expect(participantPage.getByText(/waiting for the host/i)).toBeVisible();
      });

      await test.step('Host starts the game', async () => {
        await hostPage.getByRole('button', { name: /start game/i }).click();
        // Both should see Q1
        await expect(hostPage.getByRole('button', { name: /reveal answer/i })).toBeVisible();
        await expect(participantPage.getByRole('button').first()).toBeVisible();
      });

      await test.step('Participant answers Q1 (first option)', async () => {
        // Pick the first answer option button on the participant view
        await participantPage.getByRole('button').first().click();
        // After answering, the button area shows "Answer locked in"
        await expect(participantPage.getByText(/answer locked in/i)).toBeVisible();
      });

      await test.step('Host reveals Q1 and advances to Q2', async () => {
        await revealAndAdvance(hostPage);
      });

      await test.step('Host advances through Q2, Q3, Q4 without answering', async () => {
        for (let q = 2; q <= 4; q++) {
          await expect(hostPage.getByRole('button', { name: /reveal answer/i })).toBeVisible();
          await revealAndAdvance(hostPage);
        }
      });

      await test.step('Round leaderboard appears after all questions answered', async () => {
        // After Q4 advance, we may land on round leaderboard before final
        // In a 1-wine session the "next" after round leaderboard goes to final
        const nextOrFinal = hostPage.getByRole('button', { name: /next|final/i }).first();
        if (await nextOrFinal.isVisible()) {
          await nextOrFinal.click();
        }
      });

      await test.step('Final leaderboard is shown with 1 ranking', async () => {
        await expect(hostPage.getByText(/final results/i)).toBeVisible();
        // Rankings list (ol > li items)
        await expect(hostPage.getByRole('listitem')).toHaveCount(1);

        // Participant also sees the final leaderboard
        await expect(participantPage.getByText(/final/i)).toBeVisible();
      });
    } finally {
      await participantCtx.close();
      await hostCtx.close();
    }
  });

  test('Full game - error path: late joiner after game start is rejected', async ({ browser }) => {
    const { hostPage, hostCtx, code } = await test.step('Host creates session', async () => {
      return hostCreateSession(browser);
    });

    const participantCtx = await browser.newContext();
    const lateCtx = await browser.newContext();

    try {
      // One participant joins normally
      const participantPage = await participantCtx.newPage();
      await participantPage.goto('/play');
      await participantPage.getByLabel('Session code').fill(code);
      await participantPage.getByRole('button', { name: /join/i }).click();
      await expect(participantPage.getByText(/waiting for the host/i)).toBeVisible();

      // Host starts the game
      await test.step('Host starts game', async () => {
        await hostPage.getByRole('button', { name: /start game/i }).click();
        await expect(hostPage.getByRole('button', { name: /reveal answer/i })).toBeVisible();
      });

      await test.step('Late joiner is rejected with an error', async () => {
        const latePage = await lateCtx.newPage();
        await latePage.goto('/play');
        await latePage.getByLabel('Session code').fill(code);
        await latePage.getByRole('button', { name: /join/i }).click();
        await expect(latePage.getByRole('alert')).toBeVisible();
      });
    } finally {
      await participantCtx.close();
      await lateCtx.close();
      await hostCtx.close();
    }
  });
});
