import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
  getMarketBySlug: vi.fn(),
  listObservationsForAnalysis: vi.fn(),
  listCommodities: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('@/lib/data', () => ({
  getDataSource: async () => ({
    getMarketBySlug: mock.getMarketBySlug,
    listObservationsForAnalysis: mock.listObservationsForAnalysis,
    listCommodities: mock.listCommodities,
  }),
}));

vi.mock('next/navigation', () => ({ notFound: mock.notFound }));

import MarketDetailPage from '@/app/(site)/markets/[slug]/page';

const market = {
  id: 4,
  legacyId: null,
  marketZoneId: null,
  stateId: 2,
  name: 'Dawanau International Grains Market',
  slug: 'dawanau-international-grains-market',
  description: null,
  address: null,
  latitude: null,
  longitude: null,
  isActive: true,
  stateName: 'Kano',
  stateSlug: 'kano',
  countryName: 'Nigeria',
  countryCode: 'NG',
  marketZoneName: null,
  latestObservationAt: null,
  observationCount: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  mock.getMarketBySlug.mockResolvedValue(market);
  mock.listObservationsForAnalysis.mockResolvedValue([]);
  mock.listCommodities.mockResolvedValue([]);
});

describe('market detail not-found and server-error handling', () => {
  it('renders a valid market record', async () => {
    await expect(
      MarketDetailPage({ params: Promise.resolve({ slug: 'dawanau-international-grains-market' }) }),
    ).resolves.toBeTruthy();
    expect(mock.getMarketBySlug).toHaveBeenCalledWith('dawanau-international-grains-market');
    expect(mock.notFound).not.toHaveBeenCalled();
  });

  it('uses Next notFound for a successfully queried but missing market record', async () => {
    mock.getMarketBySlug.mockResolvedValue(null);
    await expect(
      MarketDetailPage({ params: Promise.resolve({ slug: 'missing-market' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mock.notFound).toHaveBeenCalledOnce();
  });

  it('propagates a genuine database/query error rather than converting it to 404', async () => {
    mock.getMarketBySlug.mockRejectedValue(new Error('market query unavailable'));
    await expect(
      MarketDetailPage({ params: Promise.resolve({ slug: 'fixture-market' }) }),
    ).rejects.toThrow('market query unavailable');
    expect(mock.notFound).not.toHaveBeenCalled();
  });
});
