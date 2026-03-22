import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { HostQuestion } from '../../../components/host/HostQuestion';
import type { QuestionPayload } from '../../../types/events';

const question: QuestionPayload = {
  questionId: 'q1',
  prompt: 'What color is this wine?',
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
  totalRounds: 2,
  timerMs: 60000,
};

const defaultProps = {
  question,
  answeredCount: 3,
  totalCount: 6,
  timerMs: 45000,
  isPaused: false,
  onPause: vi.fn(),
  onResume: vi.fn(),
  onReveal: vi.fn(),
  onEnd: vi.fn(),
};

describe('HostQuestion', () => {
  it('renders the question prompt', () => {
    render(<HostQuestion {...defaultProps} />);
    expect(screen.getByText('What color is this wine?')).toBeInTheDocument();
  });

  it('shows answered count', () => {
    render(<HostQuestion {...defaultProps} />);
    // answeredCount and totalCount are rendered in separate spans
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/\/ 6 answered/)).toBeInTheDocument();
  });

  it('shows all answer options', () => {
    render(<HostQuestion {...defaultProps} />);
    expect(screen.getByText('Rouge')).toBeInTheDocument();
    expect(screen.getByText('Blanc')).toBeInTheDocument();
    expect(screen.getByText('Rosé')).toBeInTheDocument();
    expect(screen.getByText('Orange')).toBeInTheDocument();
  });

  it('shows Pause button when not paused', () => {
    render(<HostQuestion {...defaultProps} isPaused={false} />);
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });

  it('shows Resume button when paused', () => {
    render(<HostQuestion {...defaultProps} isPaused={true} />);
    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
  });

  it('calls onPause when Pause is clicked', () => {
    const onPause = vi.fn();
    render(<HostQuestion {...defaultProps} onPause={onPause} isPaused={false} />);
    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
    expect(onPause).toHaveBeenCalledOnce();
  });

  it('calls onReveal when Reveal is clicked', () => {
    const onReveal = vi.fn();
    render(<HostQuestion {...defaultProps} onReveal={onReveal} />);
    fireEvent.click(screen.getByRole('button', { name: /reveal/i }));
    expect(onReveal).toHaveBeenCalledOnce();
  });
});
