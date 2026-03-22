import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { HostLobby } from '../../../components/host/HostLobby';

describe('HostLobby', () => {
  it('renders the session code', () => {
    render(<HostLobby code="4829" participants={[]} onStart={vi.fn()} />);
    expect(screen.getByText('4829')).toBeInTheDocument();
  });

  it('shows participant count', () => {
    render(<HostLobby code="4829" participants={['Alice', 'Bob']} onStart={vi.fn()} />);
    expect(screen.getByText('2 / 10')).toBeInTheDocument();
  });

  it('lists participant names', () => {
    render(<HostLobby code="4829" participants={['Alice', 'Bob']} onStart={vi.fn()} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows empty state when no participants', () => {
    render(<HostLobby code="4829" participants={[]} onStart={vi.fn()} />);
    expect(screen.getByText(/No participants yet/i)).toBeInTheDocument();
  });

  it('Start Game button is disabled when no participants', () => {
    render(<HostLobby code="4829" participants={[]} onStart={vi.fn()} />);
    expect(screen.getByRole('button', { name: /start game/i })).toBeDisabled();
  });

  it('Start Game button is enabled when participants present', () => {
    render(<HostLobby code="4829" participants={['Alice']} onStart={vi.fn()} />);
    expect(screen.getByRole('button', { name: /start game/i })).not.toBeDisabled();
  });

  it('calls onStart when Start Game is clicked', () => {
    const onStart = vi.fn();
    render(<HostLobby code="4829" participants={['Alice']} onStart={onStart} />);
    fireEvent.click(screen.getByRole('button', { name: /start game/i }));
    expect(onStart).toHaveBeenCalledOnce();
  });
});
