/**
 * sessionStorage.ts
 * Handles all localStorage CRUD for host session entries.
 * Extracted here to keep hostStore and useHostSocket focused on state/events.
 */
import type { SessionListEntry } from '../types/events';

const SESSIONS_KEY_PREFIX = 'sommelierArena:sessions:';

function key(hostId: string): string {
  return `${SESSIONS_KEY_PREFIX}${hostId}`;
}

function readAll(hostId: string): SessionListEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(key(hostId)) ?? '[]');
  } catch {
    return [];
  }
}

function writeAll(hostId: string, sessions: SessionListEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key(hostId), JSON.stringify(sessions));
  } catch {
    // localStorage may be unavailable (private browsing, storage quota)
  }
}

/** Persist a new session entry. If a session with the same code already exists, it is replaced. */
export function saveSession(hostId: string, entry: SessionListEntry): void {
  const all = readAll(hostId);
  const idx = all.findIndex((s) => s.code === entry.code);
  if (idx >= 0) {
    all[idx] = entry;
  } else {
    all.push(entry);
  }
  writeAll(hostId, all);
}

/** Load all persisted sessions for a host. Returns empty array when nothing is stored. */
export function loadSessions(hostId: string): SessionListEntry[] {
  return readAll(hostId);
}

/**
 * Merge-update an existing session — only the provided fields are overwritten.
 * title and createdAt are always preserved from the existing entry.
 * If the session does not exist yet, the patch is saved as-is.
 */
export function mergeSession(
  hostId: string,
  code: string,
  patch: Partial<SessionListEntry>,
): void {
  const all = readAll(hostId);
  const idx = all.findIndex((s) => s.code === code);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...patch, code };
  } else {
    all.push({ code, title: code, createdAt: new Date().toISOString(), status: 'waiting', participantCount: 0, ...patch });
  }
  writeAll(hostId, all);
}
