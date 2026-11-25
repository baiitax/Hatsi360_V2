import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

/**
 * Tests are isolated by default. This config deliberately does not call
 * `loadEnv` or read `.env.local`; `tests/setup/isolate-environment.ts` refuses
 * ambient application credentials and accepts only explicitly named local-test
 * endpoints. Live Supabase authentication and remote DB access are never a
 * default test behaviour.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` throws by design when imported outside a React Server
      // Component. Under Vitest it is a no-op, so server modules can be tested.
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup/isolate-environment.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    globals: true,
  },
});
