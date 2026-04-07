import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AdminApp } from '../../../components/admin/AdminApp';

const SAMPLE_ANSWERS = {
  color: ['Rouge', 'Blanc'],
  region: ['Bordeaux', 'Bourgogne'],
  grape_variety: ['Merlot'],
  vintage_year: ['2020'],
  wine_name: ['Château Margaux'],
};

let fetchMock: ReturnType<typeof vi.fn>;
let storage: Record<string, string>;

beforeEach(() => {
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock;

  // Mock sessionStorage
  storage = {};
  vi.stubGlobal('sessionStorage', {
    getItem: vi.fn((key: string) => storage[key] ?? null),
    setItem: vi.fn((key: string, val: string) => { storage[key] = val; }),
    removeItem: vi.fn((key: string) => { delete storage[key]; }),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetchAnswersOk() {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => SAMPLE_ANSWERS,
  });
}

describe('AdminApp', () => {
  it('renders login screen when not authenticated', () => {
    render(<AdminApp />);
    expect(screen.getByPlaceholderText('Admin secret')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /admin login/i })).toBeInTheDocument();
  });

  it('stores secret and fetches categories on login', async () => {
    mockFetchAnswersOk();
    const user = userEvent.setup();

    render(<AdminApp />);
    await user.type(screen.getByPlaceholderText('Admin secret'), 'my-secret');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(sessionStorage.setItem).toHaveBeenCalledWith('admin_secret', 'my-secret');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /wine answers/i })).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/answers'),
    );
  });

  it('shows error and clears secret on 401 fetch', async () => {
    // First fetch for dashboard load returns 401
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    });

    const user = userEvent.setup();
    render(<AdminApp />);

    await user.type(screen.getByPlaceholderText('Admin secret'), 'bad-secret');
    await user.click(screen.getByRole('button', { name: /login/i }));

    // Dashboard fetches answers, gets non-ok → shows error
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('renders category list after successful auth', async () => {
    mockFetchAnswersOk();
    const user = userEvent.setup();

    render(<AdminApp />);
    await user.type(screen.getByPlaceholderText('Admin secret'), 'my-secret');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Color').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText('Region').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Grape Variety').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Vintage Year').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Wine Name').length).toBeGreaterThanOrEqual(1);

    // Values for the default selected category (color)
    expect(screen.getByText('Rouge')).toBeInTheDocument();
    expect(screen.getByText('Blanc')).toBeInTheDocument();
  });

  it('calls POST when adding a new answer', async () => {
    mockFetchAnswersOk(); // initial load
    const user = userEvent.setup();

    render(<AdminApp />);
    await user.type(screen.getByPlaceholderText('Admin secret'), 's');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText('Rouge')).toBeInTheDocument();
    });

    // Mock the POST response and the subsequent refresh
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });
    mockFetchAnswersOk(); // re-fetch after add

    const addInput = screen.getByPlaceholderText(/add color/i);
    await user.type(addInput, 'Rosé');
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/answers/color'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ value: 'Rosé' }),
        }),
      );
    });
  });

  it('calls DELETE when deleting an answer', async () => {
    mockFetchAnswersOk(); // initial load
    const user = userEvent.setup();

    render(<AdminApp />);
    await user.type(screen.getByPlaceholderText('Admin secret'), 's');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText('Rouge')).toBeInTheDocument();
    });

    // Mock DELETE and refresh
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });
    mockFetchAnswersOk();

    await user.click(screen.getByRole('button', { name: /delete rouge/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/answers/color/Rouge'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  it('clears secret and returns to login on logout', async () => {
    mockFetchAnswersOk();
    const user = userEvent.setup();

    render(<AdminApp />);
    await user.type(screen.getByPlaceholderText('Admin secret'), 'my-secret');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /wine answers/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /logout/i }));

    expect(sessionStorage.removeItem).toHaveBeenCalledWith('admin_secret');
    expect(screen.getByPlaceholderText('Admin secret')).toBeInTheDocument();
  });
});
