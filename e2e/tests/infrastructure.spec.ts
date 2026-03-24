/**
 * @infra - Infrastructure smoke tests.
 *
 * These tests MUST be discovered and executed BEFORE any suite that touches
 * the UI.  They act as a mandatory gate: if the stack is not healthy the
 * remaining tests should be skipped, not reported as wrong failures.
 *
 * Tags: @infra, @smoke
 */
import { test, expect } from '@playwright/test';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Attempt a raw WebSocket connection and resolve true/false within timeoutMs. */
function wsConnects(url: string, timeoutMs = 5_000): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) { resolved = true; ws.close(); resolve(false); }
    }, timeoutMs);

    const ws = new WebSocket(url);
    ws.addEventListener('open', () => {
      if (!resolved) { resolved = true; clearTimeout(timer); ws.close(); resolve(true); }
    });
    ws.addEventListener('error', () => {
      if (!resolved) { resolved = true; clearTimeout(timer); resolve(false); }
    });
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Infrastructure', () => {
  test('PartyKit dev server responds on port 1999 @infra @smoke', async ({ request }) => {
    const res = await request.get('http://localhost:1999/');
    expect(
      res.status(),
      'GET http://localhost:1999/ must return 2xx or 4xx (not connection refused). Is docker-compose up running?',
    ).toBeLessThan(500);
  });

  test('Frontend loads on port 3000 @infra @smoke', async ({ page }) => {
    const res = await page.goto('http://localhost:3000/');
    expect(
      res?.status(),
      'GET http://localhost:3000/ must return 200. Is the front service running?',
    ).toBe(200);
    await expect(page.getByRole('heading', { name: /sommelier arena/i })).toBeVisible();
  });

  test('PartyKit WebSocket endpoint accepts connections @infra @smoke', async ({ page }) => {
    // Use page.evaluate to test WebSocket from a browser context
    const connected = await page.evaluate(async () => {
      return new Promise<boolean>((resolve) => {
        const ws = new WebSocket('ws://localhost:1999/parties/main/test-room');
        const timer = setTimeout(() => { ws.close(); resolve(false); }, 5000);
        ws.addEventListener('open', () => { clearTimeout(timer); ws.close(); resolve(true); });
        ws.addEventListener('error', () => { clearTimeout(timer); resolve(false); });
      });
    });
    expect(
      connected,
      'WebSocket to PartyKit on ws://localhost:1999/parties/main/test-room must open within 5 s.',
    ).toBe(true);
  });

  test('Docs site loads on port 3002 @infra @smoke', async ({ request }) => {
    const res = await request.get('http://localhost:3002/');
    expect(
      res.status(),
      'GET http://localhost:3002/ must return 200. Is the docs service running?',
    ).toBe(200);
  });
});
