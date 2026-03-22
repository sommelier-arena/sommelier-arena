import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { NavBar } from '../../../components/common/NavBar';

// NavBar uses useCurrentUrl() which reads window.location.href.
// jsdom sets window.location.href to 'http://localhost:3000/'.

describe('NavBar', () => {
  it('renders all navigation links', () => {
    render(<NavBar />);
    // Logo link
    expect(screen.getByRole('link', { name: /sommelier arena/i })).toBeInTheDocument();
    // Nav links — use getAllByRole for Home since logo also links to /
    const homeLinks = screen.getAllByRole('link', { name: /home/i });
    expect(homeLinks.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('link', { name: /^host$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^play$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^docs$/i })).toBeInTheDocument();
  });

  it('renders the logo as a home link', () => {
    render(<NavBar />);
    expect(screen.getByRole('link', { name: /sommelier arena/i })).toBeInTheDocument();
  });

  it('always renders the URL span (no hidden class)', () => {
    render(<NavBar />);
    const spans = screen.getAllByTitle(/http/);
    expect(spans.length).toBeGreaterThan(0);
    // Ensure none have 'hidden' in their className (mobile visibility fix)
    spans.forEach((span) => {
      expect(span.className).not.toContain('hidden');
    });
  });

  it('renders the current URL from window.location.href', () => {
    render(<NavBar />);
    // jsdom default is 'http://localhost:3000/' or similar
    const span = screen.getByTitle(/localhost/);
    expect(span).toBeInTheDocument();
  });

  it('renders a copy button', () => {
    render(<NavBar />);
    expect(screen.getByRole('button', { name: /copy current url/i })).toBeInTheDocument();
  });

  it('copy button calls navigator.clipboard.writeText', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<NavBar />);
    fireEvent.click(screen.getByRole('button', { name: /copy current url/i }));
    expect(writeText).toHaveBeenCalled();
  });

  it('copy button shows ✓ feedback after click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<NavBar />);
    fireEvent.click(screen.getByRole('button', { name: /copy current url/i }));
    await screen.findByText('✓');
  });
});
