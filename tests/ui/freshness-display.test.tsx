import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DataFreshnessIndicator } from '@/components/ui/data-display';
import { MarketComparisonTable } from '@/components/data/PriceTable';
import { ProvenanceLine } from '@/components/ui';

const futureTimestamp = '2099-01-01T00:00:00.000Z';

describe('public freshness displays', () => {
  it('flags a future timestamp instead of rendering a green recently-collected state', () => {
    const html = renderToStaticMarkup(
      <DataFreshnessIndicator
        collectedAt={futureTimestamp}
        verificationStatus="verified"
        priceType="wholesale_transaction"
      />,
    );

    expect(html).toContain('Timestamp needs review');
    expect(html).toContain('later than the platform clock');
    expect(html).not.toContain('bg-success-500');
  });

  it('shows the same future-timestamp review in the observation provenance line', () => {
    const html = renderToStaticMarkup(
      <ProvenanceLine
        collectedAt={futureTimestamp}
        status="verified"
        priceType="wholesale_transaction"
      />,
    );

    expect(html).toContain('Timestamp needs review');
    expect(html).toContain('later than the platform clock');
    expect(html).not.toContain('bg-success-500');
  });

  it('shows each comparison row freshness state with its warning tone', () => {
    const html = renderToStaticMarkup(
      <MarketComparisonTable
        rows={[
          {
            marketId: 1,
            marketSlug: 'sample-market',
            marketName: 'Sample Market',
            stateName: 'Kano',
            medianAmount: 100,
            minAmount: 100,
            maxAmount: 100,
            latestAmount: 100,
            observationCount: 1,
            currencyCode: 'NGN',
            priceType: 'wholesale_transaction',
            unitName: 'kg',
            unitIsSpecific: true,
            unitAmbiguous: false,
            freshnessState: 'future_timestamp',
            isStale: false,
            timestampNeedsReview: true,
            latestCollectedAt: futureTimestamp,
            windowStart: futureTimestamp,
            windowEnd: futureTimestamp,
            changePercent: null,
          },
        ]}
      />,
    );

    expect(html).toContain('aria-label="Freshness: Timestamp needs review"');
    expect(html).toContain('Timestamp needs review');
    expect(html).toContain('bg-red-50');
  });

  it('uses the no-cadence policy rather than a 72-hour label for old verified data', () => {
    const html = renderToStaticMarkup(
      <DataFreshnessIndicator
        collectedAt="2026-08-01T00:00:00.000Z"
        verificationStatus="verified"
        priceType="wholesale_transaction"
      />,
    );

    expect(html).toContain('Latest verified');
    expect(html).not.toContain('Stale');
  });
});
