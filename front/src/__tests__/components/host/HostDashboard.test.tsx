import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { HostDashboard } from '../../../components/host/HostDashboard';
import type { SessionListEntry } from '../../../types/events';

const activeSessions: SessionListEntry[] = [
  {
    code: '1234',
    title: 'Wine Night 1',
    createdAt: new Date().toISOString(),
    status: 'active',
    participantCount: 5,
  },
];

const endedSessions: SessionListEntry[] = [
  {
    code: '5678',
    title: 'Old Session',
    createdAt: new Date().toISOString(),
    status: 'ended',
    participantCount: 8,
    finalRankings: [{ pseudonym: 'Alice', score: 300 }],
  },
];

describe('HostDashboard', () => {
  it('renders host ID', () => {
    render(
      <HostDashboard
        hostId="TANNIC-FALCON"
        sessions={[]}
        onOpenSession={vi.fn()}
        onViewResults={vi.fn()}
        onNewSession={vi.fn()} onDeleteSession={vi.fn()}
      />,
    );
    expect(screen.getByText('TANNIC-FALCON')).toBeInTheDocument();
  });

  it('renders active sessions section when sessions are active', () => {
    render(
      <HostDashboard
        hostId="TANNIC-FALCON"
        sessions={activeSessions}
        onOpenSession={vi.fn()}
        onViewResults={vi.fn()}
        onNewSession={vi.fn()} onDeleteSession={vi.fn()}
      />,
    );
    expect(screen.getByText('Wine Night 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open/i })).toBeInTheDocument();
  });

  it('calls onOpenSession when Open button is clicked', () => {
    const onOpenSession = vi.fn();
    render(
      <HostDashboard
        hostId="TANNIC-FALCON"
        sessions={activeSessions}
        onOpenSession={onOpenSession}
        onViewResults={vi.fn()}
        onNewSession={vi.fn()} onDeleteSession={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /open/i }));
    expect(onOpenSession).toHaveBeenCalledWith('1234');
  });

  it('renders ended sessions section with Results button', () => {
    render(
      <HostDashboard
        hostId="TANNIC-FALCON"
        sessions={endedSessions}
        onOpenSession={vi.fn()}
        onViewResults={vi.fn()}
        onNewSession={vi.fn()} onDeleteSession={vi.fn()}
      />,
    );
    expect(screen.getByText('Old Session')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /results/i })).toBeInTheDocument();
  });

  it('calls onViewResults when Results button is clicked', () => {
    const onViewResults = vi.fn();
    render(
      <HostDashboard
        hostId="TANNIC-FALCON"
        sessions={endedSessions}
        onOpenSession={vi.fn()}
        onViewResults={onViewResults}
        onNewSession={vi.fn()} onDeleteSession={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /results/i }));
    expect(onViewResults).toHaveBeenCalledWith(endedSessions[0]);
  });

  it('Results button is disabled when session has no finalRankings', () => {
    render(
      <HostDashboard
        hostId="TANNIC-FALCON"
        sessions={[{ ...endedSessions[0], finalRankings: undefined }]}
        onOpenSession={vi.fn()}
        onViewResults={vi.fn()}
        onNewSession={vi.fn()} onDeleteSession={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /results/i })).toBeDisabled();
  });

  it('shows "🟢 Open" badge on active sessions', () => {
    render(
      <HostDashboard
        hostId="TANNIC-FALCON"
        sessions={activeSessions}
        onOpenSession={vi.fn()}
        onViewResults={vi.fn()}
        onNewSession={vi.fn()} onDeleteSession={vi.fn()}
      />,
    );
    // The badge text "🟢 Open" appears in a span inside the card
    expect(screen.getByText(/🟢 Open/)).toBeInTheDocument();
  });

  it('shows "⚪ Ended" badge on ended sessions', () => {
    render(
      <HostDashboard
        hostId="TANNIC-FALCON"
        sessions={endedSessions}
        onOpenSession={vi.fn()}
        onViewResults={vi.fn()}
        onNewSession={vi.fn()} onDeleteSession={vi.fn()}
      />,
    );
    expect(screen.getByText(/ended/i)).toBeInTheDocument();
  });

  it('shows "No tastings yet" message when sessions list is empty', () => {
    render(
      <HostDashboard
        hostId="TANNIC-FALCON"
        sessions={[]}
        onOpenSession={vi.fn()}
        onViewResults={vi.fn()}
        onNewSession={vi.fn()} onDeleteSession={vi.fn()}
      />,
    );
    expect(screen.getByText(/No tastings yet/i)).toBeInTheDocument();
  });

  it('calls onNewSession when New Session button is clicked', () => {
    const onNewSession = vi.fn();
    render(
      <HostDashboard
        hostId="TANNIC-FALCON"
        sessions={[]}
        onOpenSession={vi.fn()}
        onViewResults={vi.fn()}
        onNewSession={onNewSession}
        onDeleteSession={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /new blind testing/i }));
    expect(onNewSession).toHaveBeenCalledOnce();
  });

  it('calls onDeleteSession with correct code when delete button is clicked (active session)', () => {
    const onDeleteSession = vi.fn();
    const session = { code: '1234', title: 'Test Wine', createdAt: new Date().toISOString(), status: 'waiting' as const, participantCount: 0 };
    render(
      <HostDashboard
        hostId="TANNIC-FALCON"
        sessions={[session]}
        onOpenSession={vi.fn()}
        onViewResults={vi.fn()}
        onNewSession={vi.fn()}
        onDeleteSession={onDeleteSession}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /delete session 1234/i }));
    expect(onDeleteSession).toHaveBeenCalledWith('1234');
  });

  it('calls onDeleteSession with correct code when delete button is clicked (ended session)', () => {
    const onDeleteSession = vi.fn();
    const session = { code: '5678', title: 'Old Wine', createdAt: new Date().toISOString(), status: 'ended' as const, participantCount: 2 };
    render(
      <HostDashboard
        hostId="TANNIC-FALCON"
        sessions={[session]}
        onOpenSession={vi.fn()}
        onViewResults={vi.fn()}
        onNewSession={vi.fn()}
        onDeleteSession={onDeleteSession}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /delete session 5678/i }));
    expect(onDeleteSession).toHaveBeenCalledWith('5678');
  });
});
