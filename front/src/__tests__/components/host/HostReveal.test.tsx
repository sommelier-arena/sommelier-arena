import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { HostReveal } from '../../../components/host/HostReveal';
import type { QuestionPayload, HostRevealPayload } from '../../../types/events';

const question: QuestionPayload = {
  questionId: 'q1',
  prompt: 'What color?',
  category: 'color',
  options: [
    { id: 'o1', text: 'Rouge' },
    { id: 'o2', text: 'Blanc' },
    { id: 'o3', text: 'Rosé' },
    { id: 'o4', text: 'Orange' },
  ],
  roundIndex: 0,
  questionIndex: 0,
  totalQuestions: 5,
  totalRounds: 1,
  timerMs: 60000,
};

const revealData: HostRevealPayload = {
  correctOptionId: 'o1',
  results: [
    { pseudonym: 'Alice', points: 100, totalScore: 300 },
  ],
};

describe('HostReveal', () => {
  it('renders question options', () => {
    render(<HostReveal question={question} revealData={revealData} onNext={vi.fn()} onEnd={vi.fn()} />);
    expect(screen.getByText('Rouge')).toBeInTheDocument();
  });

  it('has a Next button', () => {
    render(<HostReveal question={question} revealData={revealData} onNext={vi.fn()} onEnd={vi.fn()} />);
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('calls onNext when Next is clicked', () => {
    const onNext = vi.fn();
    render(<HostReveal question={question} revealData={revealData} onNext={onNext} onEnd={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onNext).toHaveBeenCalledOnce();
  });
});

import { HostRoundLeaderboard } from '../../../components/host/HostRoundLeaderboard';

describe('HostRoundLeaderboard', () => {
  const rankings = [
    { pseudonym: 'Alice', score: 300, rank: 1 },
    { pseudonym: 'Bob', score: 200, rank: 2 },
  ];

  it('renders participant names', () => {
    render(
      <HostRoundLeaderboard rankings={rankings} roundIndex={0} totalRounds={2} onNext={vi.fn()} onEnd={vi.fn()} />,
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('calls onNext when Next Round is clicked', () => {
    const onNext = vi.fn();
    render(
      <HostRoundLeaderboard rankings={rankings} roundIndex={0} totalRounds={2} onNext={onNext} onEnd={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onNext).toHaveBeenCalledOnce();
  });
});

import { HostFinalLeaderboard } from '../../../components/host/HostFinalLeaderboard';

describe('HostFinalLeaderboard', () => {
  const rankings = [
    { pseudonym: 'Alice', score: 500, rank: 1 },
    { pseudonym: 'Bob', score: 300, rank: 2 },
  ];

  it('renders final rankings', () => {
    render(<HostFinalLeaderboard rankings={rankings} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('500 pts')).toBeInTheDocument();
  });
});
