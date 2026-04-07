// In Docker/production: PUBLIC_WINE_ANSWERS_URL is set via build arg.
// In local dev (Mode A): front/.env sets PUBLIC_WINE_ANSWERS_URL=http://localhost:1998.
export const WINE_ANSWERS_URL =
  (import.meta as ImportMeta & { env: Record<string, string> }).env
    .PUBLIC_WINE_ANSWERS_URL || 'http://localhost:1998';
