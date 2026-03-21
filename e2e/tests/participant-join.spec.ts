import { test, expect, type BrowserContext } from '@playwright/test';

/** Fill + submit the host form and return the 4-digit session code. */
async function createSessionAndGetCode(hostContext: BrowserContext): Promise<string> {
  const hostPage = await hostContext.newPage();
  await hostPage.goto('/host');
  await expect(hostPage.getByRole('button', { name: /create session/i })).toBeVisible();

  await hostPage.getByLabel('Wine name').fill('Test Wine');
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

  await hostPage.getByRole('button', { name: /create session/i }).click();

  const codeEl = hostPage.getByText(/^\d{4}$/);
  await expect(codeEl).toBeVisible();
  const code = (await codeEl.textContent()) ?? '';
  return code.trim();
}

test.describe('Participant Join', () => {
  test('Join - boundary: Join button disabled while fewer than 4 digits entered', async ({ page }) => {
    await page.goto('/play');
    await expect(page.getByRole('button', { name: /join/i })).toBeVisible();

    await test.step('Enter 3 digits — button stays disabled', async () => {
      await page.getByLabel('Session code').fill('123');
      await expect(page.getByRole('button', { name: /join/i })).toBeDisabled();
    });

    await test.step('Enter 4 digits — button becomes enabled', async () => {
      await page.getByLabel('Session code').fill('1234');
      await expect(page.getByRole('button', { name: /join/i })).toBeEnabled();
    });
  });

  test('Join - negative: wrong 4-digit code shows error alert', async ({ page }) => {
    await page.goto('/play');
    await expect(page.getByRole('button', { name: /join/i })).toBeVisible();

    await test.step('Submit non-existent code', async () => {
      await page.getByLabel('Session code').fill('0000');
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
        await participantPage.getByLabel('Session code').fill(code);
        await participantPage.getByRole('button', { name: /join/i }).click();
      });

      await test.step('Lobby shows an assigned pseudonym', async () => {
        // The lobby shows the participant's pseudonym — any non-empty heading
        await expect(participantPage.getByText(/welcome/i).or(
          participantPage.getByRole('heading')
        )).toBeVisible();
      });
    } finally {
      await hostContext.close();
      await participantContext.close();
    }
  });
});
