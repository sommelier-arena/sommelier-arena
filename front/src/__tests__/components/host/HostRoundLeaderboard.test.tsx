import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { HostRoundLeaderboard } from '../../../components/host/HostRoundLeaderboard';

const onNext = vi.fn();
const onEnd = vi.fn();

describe('HostRoundLeaderboard', () => {
  it('shows "Next Round" button when not the last round', () => {
    render(
      <HostRoundLeaderboard
        rankings={[]}
        roundIndex={0}
        totalRounds={2}
        onNext={onNext}
        onEnd={onEnd}
      />,
    );
    expect(screen.getByRole('button', { name: /next round/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /see final results/i })).not.toBeInTheDocument();
  });

  it('shows "See Final Results" button on the last round', () => {
    render(
      <HostRoundLeaderboard
        rankings={[]}
        roundIndex={1}
        totalRounds={2}
        onNext={onNext}
        onEnd={onEnd}
      />,
    );
    expect(screen.getByRole('button', { name: /see final results/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next round/i })).not.toBeInTheDocument();
  });

  it('shows "See Final Results" when there is only one round (roundIndex 0, totalRounds 1)', () => {
    render(
      <HostRoundLeaderboard
        rankings={[]}
        roundIndex={0}
        totalRounds={1}
        onNext={onNext}
        onEnd={onEnd}
      />,
    );
    expect(screen.getByRole('button', { name: /see final results/i })).toBeInTheDocument();
  });

  it('clicking the primary button calls onNext', () => {
    const handleNext = vi.fn();
    render(
      <HostRoundLeaderboard
        rankings={[]}
        roundIndex={0}
        totalRounds={2}
        onNext={handleNext}
        onEnd={onEnd}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /next round/i }));
    expect(handleNext).toHaveBeenCalledOnce();
  });

  it('clicking End button calls onEnd', () => {
    const handleEnd = vi.fn();
    render(
      <HostRoundLeaderboard
        rankings={[]}
        roundIndex={0}
        totalRounds={2}
        onNext={onNext}
        onEnd={handleEnd}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /end/i }));
    expect(handleEnd).toHaveBeenCalledOnce();
  });

  it('displays round number in heading', () => {
    render(
      <HostRoundLeaderboard
        rankings={[]}
        roundIndex={1}
        totalRounds={3}
        onNext={onNext}
        onEnd={onEnd}
      />,
    );
    expect(screen.getByText(/after round 2/i)).toBeInTheDocument();
  });
});
