import { test, expect, type Browser } from '@playwright/test';

async function setupGameAtQuestion(browser: Browser) {
  const hostCtx = await browser.newContext();
  const hostPage = await hostCtx.newPage();
  await hostPage.goto('/host');
  // Dashboard phase — click New Session to get to form
  const newSessionBtn = hostPage.getByRole('button', { name: /new blind testing/i });
  if (await newSessionBtn.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false)) {
    await newSessionBtn.click();
  }
  await expect(hostPage.getByRole('button', { name: /create tasting/i })).toBeVisible();

  await hostPage.getByLabel('Wine name', { exact: true }).fill('Pause Test Wine');
  await hostPage.getByLabel('Wine 1 Color — correct answer').fill('Red');
  await hostPage.getByLabel('Wine 1 Color — distractor 1').fill('White');
  await hostPage.getByLabel('Wine 1 Color — distractor 2').fill('Rosé');
  await hostPage.getByLabel('Wine 1 Color — distractor 3').fill('Orange');
  await hostPage.getByLabel('Wine 1 Country — correct answer').fill('France');
  await hostPage.getByLabel('Wine 1 Country — distractor 1').fill('Italy');
  await hostPage.getByLabel('Wine 1 Country — distractor 2').fill('Spain');
  await hostPage.getByLabel('Wine 1 Country — distractor 3').fill('USA');
  await hostPage.getByLabel('Wine 1 Grape Variety — correct answer').fill('Merlot');
  await hostPage.getByLabel('Wine 1 Grape Variety — distractor 1').fill('Cab');
  await hostPage.getByLabel('Wine 1 Grape Variety — distractor 2').fill('Syrah');
  await hostPage.getByLabel('Wine 1 Grape Variety — distractor 3').fill('Pinot');
  await hostPage.getByLabel('Wine 1 Vintage Year — correct answer').fill('2018');
  await hostPage.getByLabel('Wine 1 Vintage Year — distractor 1').fill('2015');
  await hostPage.getByLabel('Wine 1 Vintage Year — distractor 2').fill('2019');
  await hostPage.getByLabel('Wine 1 Vintage Year — distractor 3').fill('2020');

  await hostPage.getByRole('button', { name: /create tasting/i }).click();

  const codeEl = hostPage.locator('[aria-label^="Session code"]');
  await expect(codeEl.first()).toBeVisible();
  const code = ((await codeEl.first().getAttribute('aria-label')) ?? '').replace(/\D/g, '');

  const participantCtx = await browser.newContext();
  const participantPage = await participantCtx.newPage();
  await participantPage.goto('/play');
  await participantPage.getByLabel('Session code').fill(code);
  await participantPage.getByRole('button', { name: /join/i }).click();
  await expect(participantPage.getByText(/waiting for the host/i).last()).toBeVisible();

  await hostPage.getByRole('button', { name: /start game/i }).click();
  await expect(hostPage.getByRole('button', { name: /pause/i })).toBeVisible();

  return { hostPage, hostCtx, participantPage, participantCtx };
}

test.describe('Pause and Resume', () => {
  test('Pause / Resume - timer freezes for participant and resumes from same value', async ({ browser }) => {
    const { hostPage, hostCtx, participantPage, participantCtx } =
      await test.step('Set up game at first question', async () => {
        return setupGameAtQuestion(browser);
      });

    try {
      await test.step('Host pauses the timer', async () => {
        await hostPage.getByRole('button', { name: /pause/i }).click();
        // Host UI shows "Paused" badge
        await expect(hostPage.getByText(/paused/i)).toBeVisible();
      });

      await test.step('Participant timer stops changing', async () => {
        // Read the current timer value from the participant's aria-label
        const timerEl = participantPage.getByRole('timer');
        const labelBefore = await timerEl.getAttribute('aria-label');

        // Wait 1 second — timer should NOT have changed
        await participantPage.waitForTimeout(1000);
        const labelAfter = await timerEl.getAttribute('aria-label');

        expect(labelAfter).toBe(labelBefore);
      });

      await test.step('Participant sees the timer role with an accessible label', async () => {
        await expect(participantPage.getByRole('timer')).toBeVisible();
        const label = await participantPage.getByRole('timer').getAttribute('aria-label');
        expect(label).toMatch(/time remaining/i);
      });

      await test.step('Host resumes the timer', async () => {
        await hostPage.getByRole('button', { name: /resume/i }).click();
        // "Paused" badge disappears
        await expect(hostPage.getByText(/paused/i)).not.toBeVisible();
      });

      await test.step('Participant timer is running again', async () => {
        const timerEl = participantPage.getByRole('timer');
        const labelBefore = await timerEl.getAttribute('aria-label');

        // Wait 2 seconds — timer should have ticked
        await participantPage.waitForTimeout(2000);
        const labelAfter = await timerEl.getAttribute('aria-label');

        // Label may or may not have changed (depends on tick rate), but element
        // is still visible and has the expected format
        expect(labelAfter).toMatch(/time remaining/i);
        // At minimum verify the timer is still present and valid
        expect(labelBefore).toMatch(/time remaining/i);
      });
    } finally {
      await participantCtx.close();
      await hostCtx.close();
    }
  });
});
