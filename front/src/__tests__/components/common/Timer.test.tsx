import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Timer } from '../../../components/common/Timer';

describe('Timer', () => {
  it('renders seconds from ms', () => {
    render(<Timer remainingMs={30000} />);
    expect(screen.getByRole('timer')).toHaveTextContent('30');
  });

  it('rounds up partial seconds', () => {
    render(<Timer remainingMs={29500} />);
    expect(screen.getByRole('timer')).toHaveTextContent('30');
  });

  it('shows 0 when ms is 0', () => {
    render(<Timer remainingMs={0} />);
    expect(screen.getByRole('timer')).toHaveTextContent('0');
  });

  it('has accessible aria-label', () => {
    render(<Timer remainingMs={5000} />);
    expect(screen.getByRole('timer')).toHaveAccessibleName('Time remaining: 5 seconds');
  });

  it('uses singular for 1 second', () => {
    render(<Timer remainingMs={1000} />);
    expect(screen.getByRole('timer')).toHaveAccessibleName('Time remaining: 1 second');
  });

  it('uses red color when <= 10 seconds', () => {
    const { container } = render(<Timer remainingMs={8000} />);
    expect(container.firstChild).toHaveClass('text-red-500');
  });

  it('uses amber color for 11–30 seconds', () => {
    const { container } = render(<Timer remainingMs={20000} />);
    expect(container.firstChild).toHaveClass('text-amber-500');
  });

  it('uses normal color for > 30 seconds', () => {
    const { container } = render(<Timer remainingMs={60000} />);
    expect(container.firstChild).toHaveClass('text-slate-700');
  });
});
