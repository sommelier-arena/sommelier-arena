import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { QuestionView } from '../../../components/participant/QuestionView';
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
  totalRounds: 1,
  timerMs: 60000,
};

describe('QuestionView', () => {
  it('renders the question prompt', () => {
    render(
      <QuestionView question={question} selectedOptionId={null} timerMs={60000} onSelect={vi.fn()} />,
    );
    expect(screen.getByText('What color is this wine?')).toBeInTheDocument();
  });

  it('renders all 4 options in 2×2 grid', () => {
    const { container } = render(
      <QuestionView question={question} selectedOptionId={null} timerMs={60000} onSelect={vi.fn()} />,
    );
    expect(screen.getByText('Rouge')).toBeInTheDocument();
    expect(screen.getByText('Blanc')).toBeInTheDocument();
    expect(screen.getByText('Rosé')).toBeInTheDocument();
    expect(screen.getByText('Orange')).toBeInTheDocument();
    // Check 2×2 grid class
    const grid = container.querySelector('.grid-cols-2');
    expect(grid).toBeInTheDocument();
  });

  it('calls onSelect when an option is clicked', () => {
    const onSelect = vi.fn();
    render(
      <QuestionView question={question} selectedOptionId={null} timerMs={60000} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByText('Rouge').closest('button')!);
    expect(onSelect).toHaveBeenCalledWith('o1');
  });

  it('allows changing selection — second click calls onSelect again', () => {
    const onSelect = vi.fn();
    render(
      <QuestionView question={question} selectedOptionId="o1" timerMs={60000} onSelect={onSelect} />,
    );
    // Click a different option — should NOT be blocked
    fireEvent.click(screen.getByText('Blanc').closest('button')!);
    expect(onSelect).toHaveBeenCalledWith('o2');
  });

  it('highlights selected option with aria-pressed', () => {
    render(
      <QuestionView question={question} selectedOptionId="o1" timerMs={60000} onSelect={vi.fn()} />,
    );
    const rougeButton = screen.getByText('Rouge').closest('button')!;
    expect(rougeButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('non-selected options have aria-pressed false', () => {
    render(
      <QuestionView question={question} selectedOptionId="o1" timerMs={60000} onSelect={vi.fn()} />,
    );
    const blancButton = screen.getByText('Blanc').closest('button')!;
    expect(blancButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('options are NOT disabled (no first-tap lock)', () => {
    render(
      <QuestionView question={question} selectedOptionId="o1" timerMs={60000} onSelect={vi.fn()} />,
    );
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).not.toBeDisabled();
    });
  });

  it('shows "change answer" hint when option is selected', () => {
    render(
      <QuestionView question={question} selectedOptionId="o1" timerMs={60000} onSelect={vi.fn()} />,
    );
    expect(screen.getByText(/change it until the host reveals/i)).toBeInTheDocument();
  });
});
