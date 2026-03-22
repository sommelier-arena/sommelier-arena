import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Leaderboard } from '../../../components/common/Leaderboard';

const rankings = [
  { pseudonym: 'Alice', score: 300, rank: 1 },
  { pseudonym: 'Bob', score: 200, rank: 2 },
  { pseudonym: 'Charlie', score: 100, rank: 3 },
];

describe('Leaderboard', () => {
  it('renders all participants', () => {
    render(<Leaderboard rankings={rankings} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('renders scores', () => {
    render(<Leaderboard rankings={rankings} />);
    expect(screen.getByText('300 pts')).toBeInTheDocument();
    expect(screen.getByText('200 pts')).toBeInTheDocument();
  });

  it('highlights the given pseudonym', () => {
    const { container } = render(
      <Leaderboard rankings={rankings} highlightPseudonym="Bob" />,
    );
    const highlighted = container.querySelector('.bg-violet-50');
    expect(highlighted).toBeInTheDocument();
    expect(highlighted).toHaveTextContent('Bob');
  });

  it('renders empty list without errors', () => {
    render(<Leaderboard rankings={[]} />);
    expect(screen.queryByRole('listitem')).toBeNull();
  });

  it('shows rank positions', () => {
    render(<Leaderboard rankings={rankings} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
