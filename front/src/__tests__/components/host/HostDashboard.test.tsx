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
        onNewSession={vi.fn()}
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
        onNewSession={vi.fn()}
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
        onNewSession={vi.fn()}
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
        onNewSession={vi.fn()}
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
        onNewSession={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /results/i }));
    expect(onViewResults).toHaveBeenCalledWith(endedSessions[0]);
  });

  it('shows "No sessions yet" message when sessions list is empty', () => {
    render(
      <HostDashboard
        hostId="TANNIC-FALCON"
        sessions={[]}
        onOpenSession={vi.fn()}
        onViewResults={vi.fn()}
        onNewSession={vi.fn()}
      />,
    );
    expect(screen.getByText(/No sessions yet/i)).toBeInTheDocument();
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
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /new session/i }));
    expect(onNewSession).toHaveBeenCalledOnce();
  });
});
