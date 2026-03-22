import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/stores/**', 'src/lib/**', 'src/components/**', 'src/hooks/**'],
      thresholds: {
        lines: 80,
        branches: 80,
      },
    },
  },
});
