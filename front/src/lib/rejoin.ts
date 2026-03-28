const REJOIN_KEY = 'sommelierArena:rejoin';

/** Credential stored for both host and participant to rejoin a session. */
export interface RejoinCredential {
  /** ADJECTIVE-NOUN identity (host ID or participant pseudonym). */
  id: string;
  /** 4-digit session code. */
  code: string;
}

export function saveRejoin(id: string, code: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(REJOIN_KEY, JSON.stringify({ id, code }));
}

export function loadRejoin(): RejoinCredential | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(REJOIN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RejoinCredential>;
    if (parsed.id && parsed.code) return { id: parsed.id, code: parsed.code };
  } catch {
    // ignore malformed data
  }
  return null;
}

export function clearRejoin(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(REJOIN_KEY);
}
