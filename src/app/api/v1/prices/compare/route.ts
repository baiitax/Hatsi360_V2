import { z } from 'zod';
import { createApiHandler } from '@/lib/api/handler';
import { errors } from '@/lib/api/response';
import { getDataSource } from '@/lib/data';
import {
  groupByComparisonSeries,
  isPriceTypeComparable,
  selectDominantComparisonSeries,
  summariseByMarket,
  unitIdForComparison,
} from '@/lib/pricing';

const querySchema = z
  .object({
    commodity: z.string().trim().min(1, 'commodity is required.').max(120),
    price_type: z
      .enum([
        'farmgate',
        'wholesale_asking',
        'wholesale_transaction',
        'retail',
        'processor_procurement',
        'export_buy',
        'export_sell',
        'indicative',
        'unspecified',
      ])
      .optional(),
    markets: z.string().trim().max(2000).optional(),
  })
  .refine(
    (value) => !value.markets || value.markets.split(',').every((m) => m.trim().length > 0),
    { message: 'markets must be a comma-separated list of market slugs.' },
  );

/**
 * GET /api/v1/prices/compare
 *
 * The same commodity, at the same price type, across markets.
 *
 * Only figures with compatible measurement units are compared. When the records
 * use different units the response says so explicitly and excludes them.
 */
export const GET = createApiHandler({
  query: querySchema,
  handler: async (context) => {
    const source = await getDataSource();
    const [commodities, markets] = await Promise.all([
      source.listCommodities(),
      source.listMarkets(),
    ]);

    const commodity = commodities.find((c) => c.slug === context.commodity);
    if (!commodity) {
      return errors.notFound(`Unknown commodity slug "${context.commodity}".`);
    }

    const requestedMarkets = context.markets
      ? context.markets
          .split(',')
          .map((slug) => slug.trim())
          .filter(Boolean)
      : undefined;

    const marketIds = requestedMarkets
      ? markets.filter((m) => requestedMarkets.includes(m.slug)).map((m) => m.id)
      : undefined;

    if (requestedMarkets && marketIds && marketIds.length !== requestedMarkets.length) {
      const known = new Set(markets.map((m) => m.slug));
      const unknown = requestedMarkets.filter((slug) => !known.has(slug));
      return errors.notFound(`Unknown market slug(s): ${unknown.join(', ')}.`);
    }

    const observations = await source.listObservationsForAnalysis({
      commodityId: commodity.id,
      priceType: context.price_type,
    });

    const scoped = marketIds
      ? observations.filter((o) => marketIds.includes(o.marketId))
      : observations;

    const priceType = context.price_type ?? scoped.find((o) => isPriceTypeComparable(o.priceType))?.priceType;
    const typed =
      priceType && isPriceTypeComparable(priceType)
        ? scoped.filter((o) => o.priceType === priceType)
        : [];

    // Select one exact grade/variety/unit/currency series across markets. A
    // shared dimension or unit family does not justify averaging raw amounts.
    const { selected: primary, excluded } = selectDominantComparisonSeries(typed, {
      includeMarket: false,
    });
    const summaries = summariseByMarket(primary);
    const primaryUnitId = primary[0] ? unitIdForComparison(primary[0]) : null;

    // The spread is the lowest and highest median in the comparison — not the
    // first and last rows, which are ordered by market rather than by price.
    const byAmount = [...summaries].sort((a, b) => a.medianAmount - b.medianAmount);
    const spread =
      byAmount.length > 1
        ? {
            lowestMarket: byAmount[0]!.marketName,
            lowestAmount: byAmount[0]!.medianAmount,
            highestMarket: byAmount[byAmount.length - 1]!.marketName,
            highestAmount: byAmount[byAmount.length - 1]!.medianAmount,
            spreadAmount:
              byAmount[byAmount.length - 1]!.medianAmount - byAmount[0]!.medianAmount,
          }
        : null;

    return {
      commodity: { slug: commodity.slug, name: commodity.name },
      priceType,
      specification: primary[0]
        ? {
            grade: primary[0].gradeName,
            variety: primary[0].varietyName,
            currency: primary[0].currencyCode,
            unitId: primaryUnitId,
          }
        : null,
      unit: primary[0]
        ? {
            code: primary[0].unitCode ?? null,
            name: primary[0].unitName ?? null,
            recorded: primary.every((o) => o.unitIsSpecific !== false),
          }
        : null,
      comparisonRule:
        'Only one exact commodity, price type, grade, variety, currency and unit series is compared across markets. Indicative and unspecified price types are not comparable. Other specification groups are returned separately as excluded.',
      prices: summaries.map((summary) => ({
        market: { slug: summary.marketSlug, id: summary.marketId, name: summary.marketName },
        state: summary.stateName,
        priceType: summary.priceType,
        grade: summary.gradeName,
        variety: summary.varietyName,
        medianAmount: summary.medianAmount,
        latestAmount: summary.latestAmount,
        minAmount: summary.minAmount,
        maxAmount: summary.maxAmount,
        observationCount: summary.observationCount,
        currency: summary.currencyCode,
        windowStart: summary.windowStart,
        windowEnd: summary.windowEnd,
        freshnessState: summary.freshnessState,
        isStale: summary.isStale,
        timestampNeedsReview: summary.timestampNeedsReview,
      })),
      spread,
      excludedForUnitMismatch: [...excluded
        .filter((o) => unitIdForComparison(o) !== primaryUnitId)
        .reduce((groups, observation) => {
          const key = `${unitIdForComparison(observation) ?? 'no-unit'}`;
          const group = groups.get(key) ?? [];
          group.push(observation);
          groups.set(key, group);
          return groups;
        }, new Map<string, typeof excluded>())]
        .map(([unitId, list]) => ({
          unitId,
          unitCode: list[0]?.unitCode ?? null,
          observationCount: list.length,
          markets: Array.from(new Set(list.map((o) => o.marketName))),
        })),
      excludedForSpecificationMismatch: [
        ...groupByComparisonSeries(
          excluded.filter((observation) => unitIdForComparison(observation) === primaryUnitId),
          { includeMarket: false },
        ),
      ].map(([, group]) => ({
          grade: group[0]?.gradeName ?? null,
          variety: group[0]?.varietyName ?? null,
          unit: group[0]?.unitCode ?? null,
          currency: group[0]?.currencyCode ?? null,
          observationCount: group.length,
          markets: Array.from(new Set(group.map((o) => o.marketName))),
        })),

    };
  },
});
