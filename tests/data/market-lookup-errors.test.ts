import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  results: {} as Record<string, { data: unknown[] | null; error: { message: string } | null }>,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      const builder: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'order']) {
        builder[method] = () => builder;
      }
      builder.range = async () => mockState.results[table];
      builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve(mockState.results[table]).then(resolve, reject);
      return builder;
    },
  }),
}));

import { supabaseSource } from '@/lib/data/supabase';

const validMarket = {
  id: 4,
  legacy_id: null,
  market_zone_id: null,
  state_id: 2,
  name: 'Fixture Market',
  slug: 'fixture-market',
  description: null,
  address: null,
  latitude: null,
  longitude: null,
  is_active: true,
};

beforeEach(() => {
  mockState.results = {
    markets: { data: [validMarket], error: null },
    states: { data: [{ id: 2, name: 'Kano', slug: 'kano' }], error: null },
    published_price_observations: { data: [], error: null },
  };
});

describe('market slug lookup failure semantics', () => {
  it('returns an active market when the query succeeds', async () => {
    await expect(supabaseSource.getMarketBySlug('fixture-market')).resolves.toMatchObject({
      id: 4,
      slug: 'fixture-market',
      stateName: 'Kano',
      observationCount: 0,
    });
  });

  it('returns null only after a successful lookup finds no matching market', async () => {
    mockState.results.markets = { data: [], error: null };
    await expect(supabaseSource.getMarketBySlug('missing-market')).resolves.toBeNull();
  });

  it('propagates a market-table query error instead of turning it into not-found', async () => {
    mockState.results.markets = { data: null, error: { message: 'market query failed' } };
    await expect(supabaseSource.getMarketBySlug('fixture-market')).rejects.toThrow(
      'Could not read active markets: market query failed',
    );
  });

  it('propagates a state lookup error instead of turning it into not-found', async () => {
    mockState.results.states = { data: null, error: { message: 'state query failed' } };
    await expect(supabaseSource.getMarketBySlug('fixture-market')).rejects.toThrow(
      'Could not read market states: state query failed',
    );
  });

  it('propagates published-coverage query errors rather than hiding an operational failure', async () => {
    mockState.results.published_price_observations = {
      data: null,
      error: { message: 'coverage query failed' },
    };
    await expect(supabaseSource.getMarketBySlug('fixture-market')).rejects.toThrow(
      'Could not read published market coverage: coverage query failed',
    );
  });
});
