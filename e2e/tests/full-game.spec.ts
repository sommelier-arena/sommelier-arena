import { test, expect, type Browser } from '@playwright/test';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fill and submit the host form; returns the session code displayed in the lobby. */
async function hostCreateSession(browser: Browser) {
  const hostCtx = await browser.newContext();
  const hostPage = await hostCtx.newPage();
  await hostPage.goto('/host');

  // New dashboard phase — click New Session to get to the form
  const newSessionBtn = hostPage.getByRole('button', { name: /new blind testing/i });
  if (await newSessionBtn.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false)) {
    await newSessionBtn.click();
  }
  await expect(hostPage.getByRole('button', { name: /create tasting/i })).toBeVisible();

  // All form fields have valid default values — only override wine name for test identity.
  await hostPage.getByLabel('Wine 1 Wine Name — correct answer').fill('Grand Cru Test');
  await hostPage.keyboard.press('Escape');
  await hostPage.getByRole('button', { name: /create tasting/i }).click();

  // The visible session code is rendered with an aria-label like "Tasting code: 6 1 8 3".
  // Read the aria-label and extract digits to avoid matching the share URL that contains the code.
  const codeEl = hostPage.locator('[aria-label^="Tasting code"]');
  await expect(codeEl.first()).toBeVisible();
  const aria = (await codeEl.first().getAttribute('aria-label')) ?? '';
  const code = aria.replace(/\D/g, '');

  return { hostPage, hostCtx, code };
}

/** Advance host through a single question: reveal → question_leaderboard → next question. */
async function revealAndAdvance(hostPage: import('@playwright/test').Page) {
  await hostPage.getByRole('button', { name: /reveal answer/i }).click();
  // After reveal, "Next" button appears → goes to question leaderboard
  const nextBtn = hostPage.getByRole('button', { name: /next/i });
  await expect(nextBtn).toBeVisible();
  await nextBtn.click();
  // After question leaderboard, "Next Question" or "See Round Results" appears
  const nextBtn2 = hostPage.getByRole('button', { name: /next question|see round results/i });
  await expect(nextBtn2).toBeVisible();
  await nextBtn2.click();
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
        await participantPage.getByLabel('Tasting code').fill(code);
        await participantPage.getByRole('button', { name: /join/i }).click();
        // Participant is now in lobby — pseudonym should appear
        await expect(participantPage.getByText(/waiting for the host/i).last()).toBeVisible();
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
        // After answering, the button area shows a selection confirmation
        await expect(participantPage.getByText(/selection recorded/i).first()).toBeVisible();
      });

      await test.step('Host reveals Q1 and advances to Q2', async () => {
        await revealAndAdvance(hostPage);
      });

      await test.step('Host advances through Q2, Q3, Q4, Q5 without answering', async () => {
        for (let q = 2; q <= 5; q++) {
          await expect(hostPage.getByRole('button', { name: /reveal answer/i })).toBeVisible();
          await revealAndAdvance(hostPage);
        }
      });

      await test.step('Round leaderboard appears after all questions answered', async () => {
        // After Q4 advance, we may land on round leaderboard before final
        // In a 1-wine session the "next" after round leaderboard goes to final
        const nextOrFinal = hostPage.getByRole('button', { name: /next|final/i }).first();
        const visible = await nextOrFinal.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false);
        if (visible) {
          await nextOrFinal.click();
        }
      });

      await test.step('Final leaderboard is shown with 1 ranking', async () => {
        await expect(hostPage.getByText(/final results/i)).toBeVisible();
        // Rankings list (ol > li items)
        await expect(hostPage.getByRole('listitem')).toHaveCount(1);

        // Participant also sees the final leaderboard
        await expect(participantPage.getByText(/final/i).last()).toBeVisible();
      });

      await test.step('Participant sees "Play Another Tasting" button after game ends @full', async () => {
        await expect(participantPage.getByRole('button', { name: /play another tasting/i })).toBeVisible({ timeout: 10_000 });
      });

      await test.step('Participant clicks "Play Another Tasting" — arrives at clean join form @full', async () => {
        await participantPage.getByRole('button', { name: /play another tasting/i }).click();
        await expect(participantPage).toHaveURL(/\/play/);
        await expect(participantPage.getByRole('textbox')).toHaveValue('');
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
      await participantPage.getByLabel('Tasting code').fill(code);
      await participantPage.getByRole('button', { name: /join/i }).click();
      await expect(participantPage.getByText(/waiting for the host/i).last()).toBeVisible();

      // Host starts the game
      await test.step('Host starts game', async () => {
        await hostPage.getByRole('button', { name: /start game/i }).click();
        await expect(hostPage.getByRole('button', { name: /reveal answer/i })).toBeVisible();
      });

      await test.step('Late joiner is rejected with an error', async () => {
        const latePage = await lateCtx.newPage();
        await latePage.goto('/play');
        await latePage.getByLabel('Tasting code').fill(code);
        await latePage.getByRole('button', { name: /join/i }).click();
        await expect(latePage.getByRole('alert')).toBeVisible();
      });
    } finally {
      await participantCtx.close();
      await lateCtx.close();
      await hostCtx.close();
    }
  });

  test('CUJ-9: Host closes tab mid-game — participants stay in game (1-hour grace period) @full', async ({ browser }) => {
    const { hostPage, hostCtx, code } = await test.step('Host creates session', async () => {
      return hostCreateSession(browser);
    });

    const participantCtx = await browser.newContext();
    try {
      const participantPage = await participantCtx.newPage();
      await participantPage.goto('/play');
      await participantPage.getByLabel('Tasting code').fill(code);
      await participantPage.getByRole('button', { name: /join/i }).click();
      await expect(participantPage.getByText(/waiting for the host/i).last()).toBeVisible();

      await test.step('Host starts game', async () => {
        await hostPage.getByRole('button', { name: /start game/i }).click();
        await expect(hostPage.getByRole('button', { name: /reveal answer/i })).toBeVisible();
      });

      await test.step('Host closes their tab (context close simulates tab close)', async () => {
        await hostCtx.close();
      });

      await test.step('Participant does NOT see ended state (grace period active)', async () => {
        // Wait a few seconds and verify participant is still in-game, not ended
        await participantPage.waitForTimeout(3000);
        // Participant should still see answer buttons (question phase) — not "ended" or "final"
        await expect(participantPage.getByText(/final|ended|tasting has ended/i)).not.toBeVisible();
      });
    } finally {
      await participantCtx.close();
    }
  });
});
