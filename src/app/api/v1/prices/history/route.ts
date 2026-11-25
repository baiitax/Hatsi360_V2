import { z } from 'zod';
import { createApiHandler } from '@/lib/api/handler';
import { errors } from '@/lib/api/response';
import { getDataSource } from '@/lib/data';
import { buildComparableDailySeries, selectDominantComparisonSeries } from '@/lib/pricing';

const querySchema = z
  .object({
    commodity: z.string().trim().min(1, 'commodity is required.').max(120),
    market: z.string().trim().min(1, 'market is required.').max(120),
    start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'start_date must be YYYY-MM-DD.')
      .optional(),
    end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'end_date must be YYYY-MM-DD.')
      .optional(),
  })
  .refine(
    (value) =>
      !value.start_date ||
      !value.end_date ||
      value.start_date <= value.end_date,
    { message: 'start_date must not be after end_date.' },
  );

/**
 * GET /api/v1/prices/history
 *
 * A daily price series for one commodity in one market.
 *
 * Extended history is a premium capability, so this route is the first to
 * resolve access through the central engine rather than the legacy check. The
 * public read scope stays open at /api/v1/prices/latest: a caller without the
 * entitlement is told which capability is missing and where the free data is,
 * not simply refused.
 */
export const GET = createApiHandler({
  query: querySchema,
  feature: 'commodities.extended_history',
  action: 'read',
  handler: async (context) => {
    const source = await getDataSource();
    const [commodities, markets] = await Promise.all([
      source.listCommodities(),
      source.listMarkets(),
    ]);

    const commodity = commodities.find((c) => c.slug === context.commodity);
    const market = markets.find((m) => m.slug === context.market);

    if (!commodity) {
      return errors.notFound(`Unknown commodity slug "${context.commodity}".`);
    }
    if (!market) {
      return errors.notFound(`Unknown market slug "${context.market}".`);
    }

    const observations = await source.listObservationsForAnalysis({
      commodityId: commodity.id,
      marketId: market.id,
      collectedFrom: context.start_date ? `${context.start_date}T00:00:00.000Z` : undefined,
      collectedTo: context.end_date ? `${context.end_date}T23:59:59.999Z` : undefined,
    });

    const selectedSeries = selectDominantComparisonSeries(observations, { includeMarket: false });
    const series = buildComparableDailySeries(observations).points;
    const selectedObservation = selectedSeries.selected[0] ?? null;

    return {
      commodity: { slug: commodity.slug, name: commodity.name },
      market: { slug: market.slug, name: market.name, state: market.stateName },
      specification: selectedObservation
        ? {
            priceType: selectedObservation.priceType,
            grade: selectedObservation.gradeName,
            variety: selectedObservation.varietyName,
            unit: selectedObservation.unitName,
            currency: selectedObservation.currencyCode,
          }
        : null,
      excludedObservationCount: selectedSeries.excluded.length,
      range: {
        start: context.start_date ?? series[0]?.date ?? null,
        end: context.end_date ?? series[series.length - 1]?.date ?? null,
      },
      series: series.map((point) => ({
        date: point.date,
        medianAmount: point.median,
        minAmount: point.min,
        maxAmount: point.max,
        observations: point.observations,
      })),
      observationCount: selectedSeries.selected.length,
      calculationRule:
        'Each daily point is the median of observations in one exact commodity/market/price-type/grade/variety/unit/currency series. Other specifications and non-comparable price types are excluded and counted separately; minAmount and maxAmount are the observed range.'
    };
  },
});
