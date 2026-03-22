import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { SessionForm } from '../../../components/host/SessionForm';

describe('SessionForm', () => {
  it('renders all 5 question category sections', () => {
    render(<SessionForm onSubmit={vi.fn()} />);
    expect(screen.getByText('Color')).toBeInTheDocument();
    expect(screen.getByText('Country')).toBeInTheDocument();
    expect(screen.getByText('Grape Variety')).toBeInTheDocument();
    expect(screen.getByText('Vintage Year')).toBeInTheDocument();
    expect(screen.getByText('Wine Name')).toBeInTheDocument();
  });

  it('timer slider is present with default value 60', () => {
    render(<SessionForm onSubmit={vi.fn()} />);
    const slider = screen.getByRole('slider', { name: /timer/i });
    expect(slider).toBeInTheDocument();
    expect((slider as HTMLInputElement).value).toBe('60');
    expect((slider as HTMLInputElement).min).toBe('15');
    expect((slider as HTMLInputElement).max).toBe('120');
  });

  it('color distractors have default values pre-filled', () => {
    render(<SessionForm onSubmit={vi.fn()} />);
    // Correct answer and distractors are all distinct
    expect(screen.getByDisplayValue('Rouge')).toBeInTheDocument();  // correct answer
    expect(screen.getByDisplayValue('Blanc')).toBeInTheDocument();   // distractor 1
    expect(screen.getByDisplayValue('Rosé')).toBeInTheDocument();    // distractor 2
    expect(screen.getByDisplayValue('Orange')).toBeInTheDocument();  // distractor 3
  });

  it('vintage_year distractors have default values pre-filled', () => {
    render(<SessionForm onSubmit={vi.fn()} />);
    expect(screen.getByDisplayValue('2015')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2016')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2018')).toBeInTheDocument();
  });

  it('correct answer fields are pre-filled with example values by default', () => {
    render(<SessionForm onSubmit={vi.fn()} />);
    const correctAnswerInputs = screen.getAllByPlaceholderText(/correct answer/i);
    // All correct answer fields should have a non-empty default value
    correctAnswerInputs.forEach((input) => {
      expect((input as HTMLInputElement).value).not.toBe('');
    });
  });

  it('grape_variety has pre-filled distractors', () => {
    render(<SessionForm onSubmit={vi.fn()} />);
    expect(screen.getByDisplayValue('Pinot Noir')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Syrah')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Merlot')).toBeInTheDocument();
  });

  it('calls onSubmit with correct shape when form is filled and submitted', async () => {
    const onSubmit = vi.fn();
    render(<SessionForm onSubmit={onSubmit} hostId="TANNIC-FALCON" />);

    // Fill wine name
    await userEvent.type(screen.getByPlaceholderText(/château margaux 2015/i), 'Château Test');

    // All inputs already have defaults — just submit
    fireEvent.click(screen.getByRole('button', { name: /create session/i }));
    expect(onSubmit).toHaveBeenCalledOnce();
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toHaveProperty('wines');
    expect(payload).toHaveProperty('timerSeconds', 60);
    expect(payload).toHaveProperty('hostId', 'TANNIC-FALCON');
  });
});
