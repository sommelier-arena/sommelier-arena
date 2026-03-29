import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { NavBar } from '../../../components/common/NavBar';

describe('NavBar', () => {
  it('renders the logo link with aria-label', () => {
    render(<NavBar />);
    expect(screen.getByRole('link', { name: /sommelier arena — home/i })).toBeInTheDocument();
  });

  it('renders Host a Tasting nav link pointing to /host', () => {
    render(<NavBar />);
    const link = screen.getByRole('link', { name: /host a tasting/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/host');
  });

  it("renders Join a Tasting nav link pointing to /play", () => {
    render(<NavBar />);
    const link = screen.getByRole('link', { name: /join a tasting/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/play');
  });

  it('renders Read the Docs link', () => {
    render(<NavBar />);
    expect(screen.getByRole('link', { name: /read the docs/i })).toBeInTheDocument();
  });

  it('renders Git Repository link', () => {
    render(<NavBar />);
    expect(screen.getByRole('link', { name: /git repository/i })).toBeInTheDocument();
  });

  it('has a nav element with accessible label', () => {
    render(<NavBar />);
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
  });
});
