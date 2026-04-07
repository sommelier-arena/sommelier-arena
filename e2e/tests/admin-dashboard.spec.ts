import { test, expect } from '@playwright/test';

const ADMIN_SECRET = 'dev-secret-123';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/admin');
  await page.getByPlaceholder('Admin secret').fill(ADMIN_SECRET);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('heading', { name: 'Wine Answers' })).toBeVisible();
}

test.describe('Admin Dashboard', () => {
  test('login flow @full', async ({ page }) => {
    await test.step('navigate to admin and verify login form', async () => {
      await page.goto('/admin');
      await expect(page.getByPlaceholder('Admin secret')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
    });

    await test.step('accept correct password and show dashboard', async () => {
      await page.getByPlaceholder('Admin secret').fill(ADMIN_SECRET);
      await page.getByRole('button', { name: 'Login' }).click();
      await expect(page.getByRole('heading', { name: 'Wine Answers' })).toBeVisible();
    });

    await test.step('verify category tabs visible', async () => {
      const nav = page.getByRole('navigation', { name: 'Categories' });
      await expect(nav).toBeVisible();
      await expect(nav.getByRole('button', { name: /color/i })).toBeVisible();
    });
  });

  test('add and delete an answer @full', async ({ page }) => {
    const uniqueValue = `TestColor-${Date.now()}`;

    await test.step('login', async () => {
      await login(page);
    });

    await test.step('select color category', async () => {
      await page.getByRole('navigation', { name: 'Categories' })
        .getByRole('button', { name: /color/i }).click();
    });

    await test.step('add a new answer', async () => {
      await page.getByLabel(/new color value/i).fill(uniqueValue);
      await page.getByRole('button', { name: 'Add' }).click();
      await expect(page.getByText(uniqueValue)).toBeVisible();
    });

    await test.step('delete the answer', async () => {
      await page.getByRole('button', { name: `Delete ${uniqueValue}` }).click();
      await expect(page.getByText(uniqueValue)).not.toBeVisible();
    });
  });

  test('logout @full', async ({ page }) => {
    await test.step('login', async () => {
      await login(page);
    });

    await test.step('click logout and verify login form returns', async () => {
      await page.getByRole('button', { name: /log\s?out/i }).click();
      await expect(page.getByPlaceholder('Admin secret')).toBeVisible();
    });
  });
});
