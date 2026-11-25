import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

/**
<<<<<<< HEAD
 * Tests are isolated by default. This config deliberately does not call
 * `loadEnv` or read `.env.local`; `tests/setup/isolate-environment.ts` refuses
 * ambient application credentials and accepts only explicitly named local-test
 * endpoints. Live Supabase authentication and remote DB access are never a
 * default test behaviour.
 */
=======
 * The test configuration.
 *
 * The alias block maps `@` to `src/` and neutralises `server-only`, which throws
 * by design when it is imported outside a React Server Component. Under Vitest
 * it is a no-op, so the server modules can be tested directly.
 *
 * ## Why the environment is loaded here
 *
 * A large part of this suite is *behavioural*: `tests/auth/demo-access.test.ts`
 * signs in as each demo account, `tests/data-integrity/*` read the live
 * database, `tests/api-routes.test.ts` calls the route handlers. Those tests
 * read `NEXT_PUBLIC_SUPABASE_URL` and the publishable key from `process.env`.
 *
 * Vitest does not populate `process.env` from `.env.local` — that is Vite's
 * `import.meta.env` mechanism, and it does not reach the test process. So the
 * suite used to pass only when the caller happened to have the variables
 * exported in their shell, and failed with a confusing "the demo agent could
 * not authenticate" on a machine that had them only in the file.
 *
 * Loading the file here makes the suite reproducible: `npm test` behaves the
 * same way for everyone, and a genuinely missing credential now fails as a
 * missing credential rather than as a failed sign-in.
 *
 * The file is gitignored and is never committed. Nothing here exposes a secret
 * to the browser bundle — this is the test process, and `tests/security/
 * client-bundle.test.ts` separately asserts that the browser bundle never
 * receives a server key.
 */
const env = loadEnv(process.cwd(), '', '');

// Only variables the file actually declares are copied across, and an existing
// shell value always wins — so an explicit override in CI still takes effect.
for (const [key, value] of Object.entries(env)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2
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
