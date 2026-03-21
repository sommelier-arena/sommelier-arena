import { io } from 'socket.io-client';

// In Docker: PUBLIC_BACKEND_URL is not set, so socket connects to same-origin
// (proxied through nginx /socket.io/ → back:3001).
// In local dev (Option B): front/.env sets PUBLIC_BACKEND_URL=http://localhost:3001.
const BACKEND_URL =
  import.meta.env.PUBLIC_BACKEND_URL || undefined;

export const socket = io(BACKEND_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});
