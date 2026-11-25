import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const page = readFileSync(join(process.cwd(), 'src/app/(commodity-profile)/commodities/[slug]/page.tsx'), 'utf8');
const queries = readFileSync(join(process.cwd(), 'src/lib/trade/queries.ts'), 'utf8');
const dataSource = readFileSync(join(process.cwd(), 'src/lib/data/supabase.ts'), 'utf8');
const commodityQueries = readFileSync(join(process.cwd(), 'src/lib/commodity/queries.ts'), 'utf8');

describe('commodity detail route', () => {
  it('returns the framework 404 for unknown commodities', () => {
    expect(page).toContain("import { notFound } from 'next/navigation'");
    expect(page).toContain('if (!commodity) notFound()');
    expect(page).toContain('const getCommodityForRequest = cache(async (slug: string)');
    expect(page).toContain('generateMetadata');
  });

  it('reuses the page observation set for series and movement instead of rereading the catalogue', () => {
    expect(page).toContain('getCommoditySeriesOptions(commodity.id, observations)');
    expect(page).toContain('getCommodityProfileBySlug(slug, observations)');
    expect(page).toContain('getCommodityMovementFromObservations(commodity, observations)');
    expect(page).not.toContain('getMarketMovements(200)');
    expect(queries).toContain('publishedRows?: readonly PriceObservation[]');
    expect(queries).toContain('buildMovements([commodity], new Map([[commodity.id, observations]]), 1)');
    expect(page).toContain('source.getCommodityBySlugForDetail(slug)');
    expect(dataSource).toContain('async getCommodityBySlugForDetail(slug)');
    expect(dataSource).toContain(".from('commodities')");
    expect(dataSource).toContain(".eq('is_active', true)");
    expect(commodityQueries).toContain('publishedRows?: readonly PriceObservation[]');
    expect(commodityQueries).toContain('publishedRows\n      ? Promise.resolve({ data: null })');
  });

  it('validates the slug before streaming the data-heavy detail body and keeps a loading fallback', () => {
    expect(page.indexOf('if (!commodity) notFound()')).toBeLessThan(page.indexOf('<Suspense'));
    expect(page).toContain('<Suspense fallback={<ProfileLoading />}>');
  });

  it('falls back to the all-time range for absent or invalid range parameters', () => {
    expect(page).toContain("PRICE_RANGES.find((candidate) => candidate.key === 'all')!");
    expect(page).toContain('const rangeKey = range.key');
  });

  it('provides mobile-friendly cards as well as semantic desktop tables', () => {
    expect(page).toContain('md:hidden');
    expect(page).toContain('hidden overflow-x-auto rounded-panel border border-terminal-border md:block');
    expect(page).toContain('<dl className="mt-3 grid grid-cols-2 gap-3');
  });
});
