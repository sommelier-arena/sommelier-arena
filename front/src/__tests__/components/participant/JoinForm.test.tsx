import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { JoinForm } from '../../../components/participant/JoinForm';

describe('JoinForm', () => {
  it('renders a 4-digit code input', () => {
    render(<JoinForm onJoin={vi.fn()} error={null} />);
    const input = screen.getByLabelText(/tasting code/i);
    expect(input).toBeInTheDocument();
    expect((input as HTMLInputElement).maxLength).toBe(4);
  });

  it('calls onJoin with 4-digit code on submit', async () => {
    const onJoin = vi.fn();
    render(<JoinForm onJoin={onJoin} error={null} />);
    await userEvent.type(screen.getByLabelText(/tasting code/i), '1234');
    fireEvent.click(screen.getByRole('button', { name: /join/i }));
    expect(onJoin).toHaveBeenCalledWith('1234');
  });

  it('does not call onJoin with less than 4 digits', async () => {
    const onJoin = vi.fn();
    render(<JoinForm onJoin={onJoin} error={null} />);
    await userEvent.type(screen.getByLabelText(/tasting code/i), '123');
    fireEvent.click(screen.getByRole('button', { name: /join/i }));
    expect(onJoin).not.toHaveBeenCalled();
  });

  it('does not call onJoin with non-numeric code', async () => {
    const onJoin = vi.fn();
    render(<JoinForm onJoin={onJoin} error={null} />);
    await userEvent.type(screen.getByLabelText(/tasting code/i), 'ABCD');
    fireEvent.click(screen.getByRole('button', { name: /join/i }));
    expect(onJoin).not.toHaveBeenCalled();
  });

  it('shows error message when error prop is set', () => {
    render(<JoinForm onJoin={vi.fn()} error="Session not found" />);
    expect(screen.getByText('Session not found')).toBeInTheDocument();
  });
});
