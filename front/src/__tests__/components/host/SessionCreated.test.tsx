import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SessionCreated } from '../../../components/host/SessionCreated';

describe('SessionCreated', () => {
  it('renders the session code prominently', () => {
    render(<SessionCreated code="4829" hostId="TANNIC-FALCON" />);
    expect(screen.getByText('4829')).toBeInTheDocument();
  });

  it('renders the host ID', () => {
    render(<SessionCreated code="4829" hostId="TANNIC-FALCON" />);
    expect(screen.getByText('TANNIC-FALCON')).toBeInTheDocument();
  });

  it('renders a Copy link button', () => {
    render(<SessionCreated code="4829" hostId="TANNIC-FALCON" />);
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
  });

  it('renders a WhatsApp share link', () => {
    render(<SessionCreated code="4829" hostId="TANNIC-FALCON" />);
    const link = screen.getByRole('link', { name: /whatsapp/i });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toContain('wa.me');
  });

  it('renders an iMessage share link', () => {
    render(<SessionCreated code="4829" hostId="TANNIC-FALCON" />);
    const link = screen.getByRole('link', { name: /imessage/i });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toContain('sms:');
  });

  it('share URL contains the session code and hostId', () => {
    render(<SessionCreated code="4829" hostId="TANNIC-FALCON" />);
    // The URL uses window.location.origin in the browser; in jsdom it's 'http://localhost'
    const urlEl = screen.getByText(/\/host\?code=4829.*TANNIC-FALCON/);
    expect(urlEl).toBeInTheDocument();
  });

  it('copy button shows "Copied!" feedback', async () => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    render(<SessionCreated code="4829" hostId="TANNIC-FALCON" />);
    fireEvent.click(screen.getByRole('button', { name: /copy link/i }));
    // The button text changes after clipboard write completes
    await screen.findByRole('button', { name: /copied/i });
  });
});
