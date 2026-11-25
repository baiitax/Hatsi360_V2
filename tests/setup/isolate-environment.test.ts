import { describe, expect, it } from 'vitest';

describe('Vitest environment isolation', () => {
  it('does not inherit application credentials and accepts only explicitly named loopback test services', () => {
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').toBe('');

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (url) expect(['localhost', '127.0.0.1', '::1', '[::1]']).toContain(new URL(url).hostname);

    const dbHost = process.env.SUPABASE_DB_HOST;
    if (dbHost) expect(['localhost', '127.0.0.1', '::1', '[::1]']).toContain(dbHost);

    if (!url) {
      expect(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '').toBe('');
      expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').toBe('');
    }
    if (!dbHost) {
      expect(process.env.SUPABASE_DB_NAME ?? '').toBe('');
      expect(process.env.SUPABASE_DB_USER ?? '').toBe('');
      expect(process.env.SUPABASE_DB_PASSWORD ?? '').toBe('');
    }
  });

  it('blocks non-loopback HTTP before a request can be made', async () => {
    await expect(fetch('https://example.invalid')).rejects.toThrow('Vitest network isolation blocked');
  });
});
