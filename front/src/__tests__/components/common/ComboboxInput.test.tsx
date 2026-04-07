import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ComboboxInput } from '../../../components/common/ComboboxInput';

beforeAll(() => {
  globalThis.ResizeObserver ??= class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
});

const options = ['Merlot', 'Malbec', 'Cabernet Sauvignon', 'Pinot Noir', 'Syrah'];

function setup(props: Partial<React.ComponentProps<typeof ComboboxInput>> = {}) {
  const onChange = vi.fn();
  const result = render(
    <ComboboxInput
      options={options}
      value=""
      onChange={onChange}
      placeholder="Choose a grape"
      label="Grape variety"
      id="grape"
      {...props}
    />,
  );
  return { onChange, ...result };
}

describe('ComboboxInput', () => {
  it('renders with placeholder', () => {
    setup();
    const input = screen.getByPlaceholderText('Choose a grape');
    expect(input).toBeInTheDocument();
  });

  it('shows options when typing', async () => {
    const user = userEvent.setup();
    setup();
    const input = screen.getByPlaceholderText('Choose a grape');
    await user.click(input);
    await user.type(input, 'M');

    expect(await screen.findByRole('option', { name: 'Merlot' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Malbec' })).toBeInTheDocument();
  });

  it('filters options based on input', async () => {
    const user = userEvent.setup();
    setup();
    const input = screen.getByPlaceholderText('Choose a grape');
    await user.click(input);
    await user.type(input, 'Pinot');

    expect(await screen.findByRole('option', { name: 'Pinot Noir' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Merlot' })).not.toBeInTheDocument();
  });

  it('selects an option on click', async () => {
    const user = userEvent.setup();
    const { onChange } = setup();
    const input = screen.getByPlaceholderText('Choose a grape');
    await user.click(input);
    await user.type(input, 'Mer');

    const option = await screen.findByRole('option', { name: 'Merlot' });
    await user.click(option);

    expect(onChange).toHaveBeenCalledWith('Merlot');
  });

  it('shows "Add [value]" when no exact match', async () => {
    const user = userEvent.setup();
    setup();
    const input = screen.getByPlaceholderText('Choose a grape');
    await user.click(input);
    await user.type(input, 'Tempranillo');

    expect(await screen.findByRole('option', { name: /Add "Tempranillo"/ })).toBeInTheDocument();
  });

  it('calls onChange with custom value via "Add" option', async () => {
    const user = userEvent.setup();
    const { onChange } = setup();
    const input = screen.getByPlaceholderText('Choose a grape');
    await user.click(input);
    await user.type(input, 'Tempranillo');

    const addOption = await screen.findByRole('option', { name: /Add "Tempranillo"/ });
    await user.click(addOption);

    expect(onChange).toHaveBeenCalledWith('Tempranillo');
  });
});
