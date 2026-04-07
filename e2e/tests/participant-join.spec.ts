import { test, expect, type BrowserContext } from '@playwright/test';

/** Fill + submit the host form and return the 4-digit session code. */
async function createSessionAndGetCode(hostContext: BrowserContext): Promise<string> {
  const hostPage = await hostContext.newPage();
  await hostPage.goto('/host');
  // Dashboard phase — click New Session to get to form
  const newSessionBtn = hostPage.getByRole('button', { name: /new blind testing/i });
  if (await newSessionBtn.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false)) {
    await newSessionBtn.click();
  }
  await expect(hostPage.getByRole('button', { name: /create tasting/i })).toBeVisible();

  await hostPage.getByLabel('Wine 1 Wine Name — correct answer').fill('Test Wine');
  await hostPage.keyboard.press('Escape');
  await hostPage.getByRole('button', { name: /create tasting/i }).click();

  const codeEl = hostPage.locator('[aria-label^="Tasting code"]');
  await expect(codeEl.first()).toBeVisible();
  const aria = (await codeEl.first().getAttribute('aria-label')) ?? '';
  return aria.replace(/\D/g, '');
}

test.describe('Participant Join', () => {
  test('Join - boundary: Join button disabled while fewer than 4 digits entered', async ({ page }) => {
    await page.goto('/play');
    await expect(page.getByRole('button', { name: /join/i })).toBeVisible();

    await test.step('Enter 3 digits — button stays disabled', async () => {
      await page.getByLabel('Tasting code').fill('123');
      await expect(page.getByRole('button', { name: /join/i })).toBeDisabled();
    });

    await test.step('Enter 4 digits — button becomes enabled', async () => {
      await page.getByLabel('Tasting code').fill('1234');
      await expect(page.getByRole('button', { name: /join/i })).toBeEnabled();
    });
  });

  test('Join - negative: wrong 4-digit code shows error alert', async ({ page }) => {
    await page.goto('/play');
    await expect(page.getByRole('button', { name: /join/i })).toBeVisible();

    await test.step('Submit non-existent code', async () => {
      await page.getByLabel('Tasting code').fill('0000');
      await page.getByRole('button', { name: /join/i }).click();
    });

    await test.step('Error is announced via role=alert', async () => {
      await expect(page.getByRole('alert')).toBeVisible();
    });
  });

  test('Join - happy path: correct code shows pseudonym in lobby', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const participantContext = await browser.newContext();

    try {
      const code = await test.step('Host creates a session', async () => {
        return createSessionAndGetCode(hostContext);
      });

      const participantPage = await participantContext.newPage();
      await participantPage.goto('/play');

      await test.step('Participant enters the code', async () => {
        await expect(participantPage.getByRole('button', { name: /join/i })).toBeVisible();
        await participantPage.getByLabel('Tasting code').fill(code);
        await participantPage.getByRole('button', { name: /join/i }).click();
      });

      await test.step('Lobby shows an assigned pseudonym', async () => {
        // The lobby shows the participant's pseudonym — any non-empty heading
        await expect(participantPage.getByText(/welcome/i).or(
          participantPage.getByRole('heading')
        )).toBeVisible();
      });

      await test.step('URL updates to include ?code= and ?id= after joining @smoke', async () => {
        await expect(participantPage).toHaveURL(/[?&]code=\d{4}/);
        await expect(participantPage).toHaveURL(/[?&]id=[A-Z]+-[A-Z]+/);
      });
    } finally {
      await hostContext.close();
      await participantContext.close();
    }
  });

  test('Join - direct URL: /play?code=XXXX auto-joins without typing code @smoke', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const participantContext = await browser.newContext();

    try {
      const code = await test.step('Host creates a session', async () => {
        return createSessionAndGetCode(hostContext);
      });

      const participantPage = await participantContext.newPage();

      await test.step('Participant opens share link directly', async () => {
        await participantPage.goto(`/play?code=${code}`);
      });

      await test.step('Participant lands in lobby without typing code', async () => {
        await expect(participantPage.getByText(/waiting/i).last()).toBeVisible({ timeout: 10_000 });
      });

      await test.step('URL includes ?id= (pseudonym assigned)', async () => {
        await expect(participantPage).toHaveURL(/[?&]id=[A-Z]+-[A-Z]+/);
      });
    } finally {
      await hostContext.close();
      await participantContext.close();
    }
  });
});
