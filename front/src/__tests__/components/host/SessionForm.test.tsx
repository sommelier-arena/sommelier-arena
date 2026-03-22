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
    expect(screen.getByDisplayValue('Rouge')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Blanc')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Rosé')).toBeInTheDocument();
  });

  it('vintage_year distractors have default values pre-filled', () => {
    render(<SessionForm onSubmit={vi.fn()} />);
    expect(screen.getByDisplayValue('2015')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2016')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2018')).toBeInTheDocument();
  });

  it('correct answer fields are blank by default', async () => {
    render(<SessionForm onSubmit={vi.fn()} />);
    // Find all correct answer inputs; they should have no value
    const correctAnswerInputs = screen.getAllByPlaceholderText(/correct answer/i);
    correctAnswerInputs.forEach((input) => {
      expect((input as HTMLInputElement).value).toBe('');
    });
  });

  it('grape_variety has no pre-filled distractors', () => {
    render(<SessionForm onSubmit={vi.fn()} />);
    // Get all inputs that are blank — this confirms grape_variety distractors are empty
    const allInputs = screen.getAllByRole('textbox');
    // Grape variety distractor fields should be empty (not pre-filled)
    const grapeInputs = allInputs.filter(
      (el) => (el as HTMLInputElement).value === '' && el.getAttribute('placeholder')?.toLowerCase().includes('distractor'),
    );
    expect(grapeInputs.length).toBeGreaterThan(0);
  });

  it('calls onSubmit with correct shape when form is filled and submitted', async () => {
    const onSubmit = vi.fn();
    render(<SessionForm onSubmit={onSubmit} hostId="TANNIC-FALCON" />);

    // Fill wine name
    await userEvent.type(screen.getByPlaceholderText(/château margaux 2015/i), 'Château Test');

    // Fill correct answers
    const correctAnswerInputs = screen.getAllByPlaceholderText(/correct answer/i);
    for (const input of correctAnswerInputs) {
      await userEvent.type(input, 'Answer');
    }

    // Fill any blank distractor fields (grape_variety has no defaults)
    const distractorInputs1 = screen.getAllByPlaceholderText('Distractor 1');
    const distractorInputs2 = screen.getAllByPlaceholderText('Distractor 2');
    const distractorInputs3 = screen.getAllByPlaceholderText('Distractor 3');
    for (const input of [...distractorInputs1, ...distractorInputs2, ...distractorInputs3]) {
      if ((input as HTMLInputElement).value === '') {
        await userEvent.type(input, 'Option');
      }
    }

    fireEvent.click(screen.getByRole('button', { name: /create session/i }));
    expect(onSubmit).toHaveBeenCalledOnce();
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toHaveProperty('wines');
    expect(payload).toHaveProperty('timerSeconds', 60);
    expect(payload).toHaveProperty('hostId', 'TANNIC-FALCON');
  });
});
