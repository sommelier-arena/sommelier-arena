import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SessionCreated } from '../../../components/host/SessionCreated';

describe('SessionCreated', () => {
  it('renders the session code prominently', () => {
    render(<SessionCreated code="4829" hostId="TANNIC-FALCON" />);
    expect(screen.getByText('4829')).toBeInTheDocument();
  });

  it('renders the session code without displaying host ID (host ID removed from UI)', () => {
    render(<SessionCreated code="4829" hostId="TANNIC-FALCON" />);
    // Host ID is passed as prop but not displayed in the UI
    expect(screen.queryByText('TANNIC-FALCON')).not.toBeInTheDocument();
    // Session code is displayed prominently
    expect(screen.getByText('4829')).toBeInTheDocument();
  });

  it('renders a Copy participant link button', () => {
    render(<SessionCreated code="4829" hostId="TANNIC-FALCON" />);
    expect(screen.getByRole('button', { name: /copy participant link/i })).toBeInTheDocument();
  });

  it('renders a WhatsApp share link', () => {
    render(<SessionCreated code="4829" hostId="TANNIC-FALCON" />);
    const link = screen.getByRole('link', { name: /whatsapp/i });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toContain('wa.me');
  });

  it('does not render an iMessage share link (removed in v2)', () => {
    render(<SessionCreated code="4829" hostId="TANNIC-FALCON" />);
    expect(screen.queryByRole('link', { name: /imessage/i })).not.toBeInTheDocument();
  });

  it('participant share URL contains the session code', () => {
    render(<SessionCreated code="4829" hostId="TANNIC-FALCON" />);
    // The participant URL includes ?code=4829 for direct auto-join
    const urlEl = screen.getByText(/\/play\?code=4829/);
    expect(urlEl).toBeInTheDocument();
  });

  it('copy button shows "Copied!" feedback', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    render(<SessionCreated code="4829" hostId="TANNIC-FALCON" />);
    fireEvent.click(screen.getByRole('button', { name: /copy participant link/i }));
    await screen.findByRole('button', { name: /copied/i });
  });
});
