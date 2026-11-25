import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const page = readFileSync(join(process.cwd(), 'src/app/(site)/trade/page.tsx'), 'utf8');
const queries = readFileSync(join(process.cwd(), 'src/lib/trade/queries.ts'), 'utf8');

describe('Trade Intelligence overview responsiveness and data loading', () => {
  it('uses a card layout on narrow screens and a full table at desktop widths', () => {
    expect(page).toContain('MarketWatchCards');
    expect(page).toContain('className="hidden md:block"');
    expect(page).toContain('className="terminal-panel overflow-hidden md:hidden"');
    expect(page).toContain('className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-6"');
  });

  it('does not render a weekly movement column when the overview has no weekly deltas', () => {
    expect(page).toContain('showWeekly={false}');
  });

  it('loads movement and freshness from one shared, parallel observation read', () => {
    expect(page).toContain('getTradeOverviewData(40)');
    expect(queries).toContain('const getCommodityOverviewDataset = cache(async');
    expect(queries).toContain('commodities.map((commodity) =>');
    expect(queries).toContain('const observationSets = await Promise.all(');
    expect(queries).toContain('buildCommodityFreshness(');
    expect(queries).toContain('buildMovements(');
  });
});
