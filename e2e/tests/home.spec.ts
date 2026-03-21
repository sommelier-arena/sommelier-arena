import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Home - page structure has correct heading and navigation', async ({ page }) => {
    await expect(page.getByRole('main')).toMatchAriaSnapshot(`
      - main:
        - heading "Sommelier Arena" [level=1]
        - link "I'm the Host"
        - link "Join as Participant"
    `);
  });

  test('Home - Host button navigates to /host', async ({ page }) => {
    await test.step('Click the Host link', async () => {
      await page.getByRole('link', { name: /host/i }).click();
    });

    await test.step('Verify navigation to /host', async () => {
      await expect(page).toHaveURL('/host');
    });
  });

  test('Home - Participant button navigates to /play', async ({ page }) => {
    await test.step('Click the Join link', async () => {
      await page.getByRole('link', { name: /join as participant/i }).click();
    });

    await test.step('Verify navigation to /play', async () => {
      await expect(page).toHaveURL('/play');
    });
  });
});
