import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { SessionForm } from '../../../components/host/SessionForm';

// Headless UI's Combobox with anchor uses ResizeObserver internally
beforeAll(() => {
  globalThis.ResizeObserver ??= class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
});

describe('SessionForm', () => {
  it('renders all 5 question category sections', () => {
    render(<SessionForm onSubmit={vi.fn()} />);
    expect(screen.getByText('Color')).toBeInTheDocument();
    expect(screen.getByText('Region')).toBeInTheDocument();
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
    // Find all combobox inputs whose accessible label ends with "— correct answer"
    const correctAnswerInputs = screen.getAllByRole('combobox', { name: /— correct answer/i });
    expect(correctAnswerInputs).toHaveLength(5); // one per category
    // All correct answer fields should have a non-empty default value
    correctAnswerInputs.forEach((input) => {
      expect((input as HTMLInputElement).value).not.toBe('');
    });
  });

  it('correct answer comboboxes have category-specific placeholder text', () => {
    render(<SessionForm onSubmit={vi.fn()} />);
    // Each category's correct-answer combobox should have a hint placeholder
    expect(screen.getByRole('combobox', { name: /Wine 1 Color — correct answer/i }))
      .toHaveAttribute('placeholder', 'e.g. Rouge');
    expect(screen.getByRole('combobox', { name: /Wine 1 Grape Variety — correct answer/i }))
      .toHaveAttribute('placeholder', 'e.g. Cabernet Sauvignon');
    expect(screen.getByRole('combobox', { name: /Wine 1 Vintage Year — correct answer/i }))
      .toHaveAttribute('placeholder', 'e.g. 2019');
    expect(screen.getByRole('combobox', { name: /Wine 1 Wine Name — correct answer/i }))
      .toHaveAttribute('placeholder', 'e.g. Château Pétrus');
  });

  it('distractor comboboxes have category-specific placeholder text', () => {
    render(<SessionForm onSubmit={vi.fn()} />);
    // Spot-check a few distractor placeholders
    expect(screen.getByRole('combobox', { name: /Wine 1 Color — distractor 1/i }))
      .toHaveAttribute('placeholder', 'e.g. Blanc');
    expect(screen.getByRole('combobox', { name: /Wine 1 Vintage Year — distractor 2/i }))
      .toHaveAttribute('placeholder', 'e.g. 2020');
    expect(screen.getByRole('combobox', { name: /Wine 1 Grape Variety — distractor 3/i }))
      .toHaveAttribute('placeholder', 'e.g. Syrah');
  });

  it('grape_variety has pre-filled distractors', () => {
    render(<SessionForm onSubmit={vi.fn()} />);
    expect(screen.getByDisplayValue('Pinot Noir')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Syrah')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Merlot')).toBeInTheDocument();
  });

  it('calls onSubmit with correct shape when form is filled and submitted', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SessionForm onSubmit={onSubmit} hostId="TANNIC-FALCON" />);

    // All combobox fields have pre-filled defaults — no wine name input exists any more
    await user.click(screen.getByRole('button', { name: /create tasting/i }));
    expect(onSubmit).toHaveBeenCalledOnce();
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toHaveProperty('wines');
    expect(payload).toHaveProperty('timerSeconds', 60);
    expect(payload).toHaveProperty('hostId', 'TANNIC-FALCON');
    // Wine name is derived from wine_name correct answer default
    expect(payload.wines[0]).toHaveProperty('name', 'Château Pétrus');
  });

  it('submits form after closing combobox dropdown with Escape key', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SessionForm onSubmit={onSubmit} hostId="TANNIC-FALCON" />);

    // Open the Color correct answer combobox dropdown
    const colorInput = screen.getByRole('combobox', { name: /Wine 1 Color — correct answer/i });
    await user.click(colorInput);
    await user.type(colorInput, 'ou');

    // Close the dropdown with Escape — this returns focus to the combobox without selecting
    await user.keyboard('{Escape}');

    // Dropdown is now closed; submit button is accessible again
    await user.click(screen.getByRole('button', { name: /create tasting/i }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('renders optional tasting title input', () => {
    render(<SessionForm onSubmit={vi.fn()} />);
    const titleInput = screen.getByRole('textbox', { name: /tasting title/i });
    expect(titleInput).toBeInTheDocument();
    expect((titleInput as HTMLInputElement).value).toBe('');
  });

  it('uses custom title in payload when provided', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SessionForm onSubmit={onSubmit} hostId="TANNIC-FALCON" />);

    await user.type(screen.getByRole('textbox', { name: /tasting title/i }), 'My Custom Title');
    await user.click(screen.getByRole('button', { name: /create tasting/i }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0][0]).toHaveProperty('title', 'My Custom Title');
  });

  it('falls back to wine_name correct answer as title when title input is empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SessionForm onSubmit={onSubmit} hostId="TANNIC-FALCON" />);

    // No title entered — title should fall back to wine_name correct answer default
    await user.click(screen.getByRole('button', { name: /create tasting/i }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0][0]).toHaveProperty('title', 'Château Pétrus');
  });

  it('renders Edit Blind Tasting heading and Update Tasting button when isEditing=true', () => {
    render(<SessionForm onSubmit={vi.fn()} isEditing />);
    expect(screen.getByRole('heading', { name: /edit blind tasting/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update tasting/i })).toBeInTheDocument();
  });

  it('pre-fills wine fields when initialWines provided', () => {
    const initialWines = [{
      name: 'Existing Wine',
      questions: [
        { category: 'color' as const, correctAnswer: 'Rouge', distractors: ['Blanc', 'Rosé', 'Orange'] as [string, string, string] },
        { category: 'region' as const, correctAnswer: 'France', distractors: ['Italy', 'Spain', 'USA'] as [string, string, string] },
        { category: 'grape_variety' as const, correctAnswer: 'Merlot', distractors: ['Syrah', 'Pinot Noir', 'Cabernet'] as [string, string, string] },
        { category: 'vintage_year' as const, correctAnswer: '2020', distractors: ['2018', '2019', '2021'] as [string, string, string] },
        { category: 'wine_name' as const, correctAnswer: 'Test Wine', distractors: ['A', 'B', 'C'] as [string, string, string] },
      ],
    }];
    render(<SessionForm onSubmit={vi.fn()} initialWines={initialWines} />);
    // Wine name is now derived from wine_name correct answer, not a separate field
    expect(screen.getByDisplayValue('Test Wine')).toBeInTheDocument();
  });

  it('pre-fills title field when initialTitle provided', () => {
    render(<SessionForm onSubmit={vi.fn()} initialTitle="Friday Night Tasting" isEditing />);
    const titleInput = screen.getByRole('textbox', { name: /tasting title/i });
    expect((titleInput as HTMLInputElement).value).toBe('Friday Night Tasting');
  });
});

