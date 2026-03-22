import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { ParticipantLobby } from '../../../components/participant/ParticipantLobby';
import { RevealView } from '../../../components/participant/RevealView';
import { RoundLeaderboard } from '../../../components/participant/RoundLeaderboard';
import { FinalLeaderboard } from '../../../components/participant/FinalLeaderboard';
import { SessionEnded } from '../../../components/participant/SessionEnded';
import type { QuestionPayload, ParticipantRevealPayload } from '../../../types/events';

// ── ParticipantLobby ─────────────────────────────────────────────────────────

describe('ParticipantLobby', () => {
  it('renders the assigned pseudonym', () => {
    render(<ParticipantLobby pseudonym="EARTHY-VINE" />);
    expect(screen.getByText(/EARTHY-VINE/)).toBeInTheDocument();
  });

  it('shows a waiting message', () => {
    render(<ParticipantLobby pseudonym="EARTHY-VINE" />);
    expect(screen.getByText(/waiting/i)).toBeInTheDocument();
  });
});

// ── RevealView ────────────────────────────────────────────────────────────────

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

const revealData: ParticipantRevealPayload = {
  correctOptionId: 'o1',
  myPoints: 100,
  myTotalScore: 300,
};

describe('RevealView', () => {
  it('shows all options', () => {
    render(<RevealView question={question} revealData={revealData} selectedOptionId="o1" />);
    expect(screen.getByText('Rouge')).toBeInTheDocument();
    expect(screen.getByText('Blanc')).toBeInTheDocument();
  });

  it('shows points earned', () => {
    render(<RevealView question={question} revealData={revealData} selectedOptionId="o1" />);
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });
});

// ── RoundLeaderboard ──────────────────────────────────────────────────────────

describe('RoundLeaderboard', () => {
  const rankings = [
    { pseudonym: 'Alice', score: 300, rank: 1 },
    { pseudonym: 'Bob', score: 200, rank: 2 },
  ];

  it('renders all participants', () => {
    render(<RoundLeaderboard rankings={rankings} pseudonym="Alice" />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows scores', () => {
    render(<RoundLeaderboard rankings={rankings} pseudonym="Alice" />);
    expect(screen.getByText('300 pts')).toBeInTheDocument();
  });
});

// ── FinalLeaderboard ──────────────────────────────────────────────────────────

describe('FinalLeaderboard', () => {
  const rankings = [
    { pseudonym: 'Alice', score: 500, rank: 1 },
    { pseudonym: 'Bob', score: 300, rank: 2 },
  ];

  it('renders final rankings', () => {
    render(<FinalLeaderboard rankings={rankings} pseudonym="Charlie" />);
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
    expect(screen.getByText('500 pts')).toBeInTheDocument();
  });
});

// ── SessionEnded ──────────────────────────────────────────────────────────────

describe('SessionEnded', () => {
  it('renders an end message', () => {
    render(<SessionEnded />);
    // Should show some "session ended" or "thank you" type message
    expect(screen.getByRole('heading') || document.body.textContent).toBeTruthy();
  });
});
