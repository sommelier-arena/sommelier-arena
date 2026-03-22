import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSocket } from '../../lib/socket';

vi.mock('partysocket', () => {
  return {
    default: vi.fn().mockImplementation((opts: { host: string; room: string }) => ({
      host: opts.host,
      room: opts.room,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
    })),
  };
});

describe('createSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a PartySocket with the given room', async () => {
    const PartySocket = (await import('partysocket')).default;
    createSocket('1234');
    expect(PartySocket).toHaveBeenCalledWith(
      expect.objectContaining({ room: '1234' }),
    );
  });

  it('uses PUBLIC_PARTYKIT_HOST as the host', async () => {
    const PartySocket = (await import('partysocket')).default;
    createSocket('5678');
    const callArg = (PartySocket as unknown as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0];
    expect(callArg).toHaveProperty('host');
  });

  it('returns the PartySocket instance', async () => {
    const socket = createSocket('9999');
    expect(socket).toBeDefined();
    expect(socket).toHaveProperty('send');
  });
});
