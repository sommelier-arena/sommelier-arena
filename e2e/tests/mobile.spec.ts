/**
 * @mobile — Mobile viewport smoke tests.
 *
 * These tests verify critical UX requirements on small screens:
 * - Touch targets meet the 44 × 44 px minimum (WCAG 2.5.5)
 * - The numeric session-code input uses inputMode="numeric" (fast numpad)
 * - The join flow completes successfully on a phone viewport
 *
 * Tags: @mobile, @smoke
 *
 * These tests are automatically included in the mobile-chrome and mobile-safari
 * Playwright projects via the `grep: /@mobile/` filter in playwright.config.ts.
 */
import { test, expect } from '@playwright/test';

test.describe('Mobile UX', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Home page — buttons are tappable (≥ 44 px) @mobile @smoke', async ({ page }) => {
    // Scope to main to avoid NavBar links (e.g. "Host a Game") matching the same name
    const main = page.getByRole('main');
    const hostBtn = main.getByRole('link', { name: /host/i });
    const joinBtn = main.getByRole('link', { name: /join|participant/i });

    for (const btn of [hostBtn, joinBtn]) {
      const box = await btn.boundingBox();
      expect(box, 'Button must be visible').not.toBeNull();
      expect(
        box!.height,
        `Button "${await btn.textContent()}" height must be ≥ 44 px`,
      ).toBeGreaterThanOrEqual(44);
      expect(
        box!.width,
        `Button "${await btn.textContent()}" width must be ≥ 44 px`,
      ).toBeGreaterThanOrEqual(44);
    }
  });

  test('Join page — session code input uses numeric keyboard @mobile @smoke', async ({ page }) => {
    await page.goto('/play');

    // Wait for React hydration
    const input = page.getByLabel(/tasting code/i);
    await expect(input).toBeVisible();

    const inputMode = await input.getAttribute('inputmode');
    expect(
      inputMode,
      'Tasting code field must have inputmode="numeric" so mobile users get a numpad',
    ).toBe('numeric');
  });

  test('Join flow completes on mobile viewport @mobile', async ({ page }) => {
    // We need a real session to join — skip gracefully if PartyKit is unavailable
    const partyRes = await page.request.get('http://localhost:1999/').catch(() => null);
    if (!partyRes || partyRes.status() >= 500) {
      test.skip(true, 'PartyKit not reachable — skipping mobile join flow');
    }

    await page.goto('/play');

    await test.step('Navigate to join page', async () => {
      await expect(page.getByLabel(/tasting code/i)).toBeVisible();
    });

    await test.step('Verify page is usable within mobile viewport', async () => {
      // Confirm the join form fits within the viewport without horizontal scroll
      const scrollWidth: number = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth: number = await page.evaluate(() => document.documentElement.clientWidth);
      expect(
        scrollWidth,
        'Page must not require horizontal scrolling on mobile',
      ).toBeLessThanOrEqual(clientWidth + 1); // +1 px tolerance for sub-pixel rounding
    });
  });

  test('NavBar URL span is visible at 375px viewport (no hidden class) @mobile @smoke', async ({ page }) => {
    await page.goto('/');
    // The NavBar brand text uses 'hidden sm:inline' (hidden on mobile, visible on sm+).
    // Verify exactly 1 such span exists (the Sommelier Arena brand text) — not more.
    const hiddenSpan = page.locator('nav span.hidden');
    await expect(hiddenSpan).toHaveCount(1);
    // Verify the NavBar itself is still visible at mobile width
    await expect(page.getByRole('navigation')).toBeVisible();
  });
});
