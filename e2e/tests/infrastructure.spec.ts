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
import { io } from 'socket.io-client';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Attempt a Socket.IO connection and resolve true/false within `timeoutMs`. */
function socketConnects(url: string, timeoutMs = 5_000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = io(url, {
      transports: ['websocket'],
      reconnection: false,
      timeout: timeoutMs,
    });
    const timer = setTimeout(() => {
      socket.disconnect();
      resolve(false);
    }, timeoutMs);

    socket.on('connect', () => {
      clearTimeout(timer);
      socket.disconnect();
      resolve(true);
    });
    socket.on('connect_error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Infrastructure', () => {
  test('Backend health endpoint returns status ok @infra @smoke', async ({ request }) => {
    const res = await request.get('http://localhost:3001/health');

    expect(
      res.status(),
      'GET /health must return 200. Is docker-compose up --build running?',
    ).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({ status: 'ok' });
  });

  test('nginx proxies /socket.io/ polling to backend @infra @smoke', async ({ request }) => {
    // A minimal Engine.IO handshake — EIO=4 is Socket.IO v4
    const res = await request.get(
      'http://localhost:3000/socket.io/?EIO=4&transport=polling',
    );

    expect(
      res.status(),
      'nginx must proxy /socket.io/ to back:3001. Check nginx.conf resolver + proxy_pass.',
    ).toBe(200);
  });

  test('WebSocket can connect to backend via nginx proxy @infra @smoke', async () => {
    const connected = await socketConnects('http://localhost:3000');

    expect(
      connected,
      'Socket.IO WebSocket connection through nginx proxy must succeed within 5 s.',
    ).toBe(true);
  });
});
