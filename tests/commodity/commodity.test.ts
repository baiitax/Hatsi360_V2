import { describe, expect, it } from 'vitest';
import {
  assessCommodityReadiness,
  describeReadiness,
  type ReadinessInput,
} from '@/lib/commodity/readiness';
import { resolveCommodityTerm, normalise, isSearchable } from '@/lib/commodity/resolve';
import { findConversion, unitsAreComparable, findUnitByCode } from '@/lib/commodity/units';
import type { UnitRecord } from '@/lib/commodity/types';

/**
 * Phase 04 — commodity intelligence.
 *
 * The theme running through every block below is refusal. A platform that fills
 * a gap with a plausible default is worse than one that says "not recorded",
 * because the user cannot tell the difference. So these tests assert the
 * refusals as carefully as the successes.
 */

/* ------------------------------------------------------------ readiness -- */

function input(overrides: Partial<ReadinessInput> = {}): ReadinessInput {
  return {
    commodityId: 6,
    name: 'Maize (White)',
    slug: 'maize-white',
    isActive: true,
    hasDescription: true,
    hasDefaultGrade: true,
    gradeCount: 3,
    varietyCount: 0,
    synonymCount: 2,
    observationCount: 6,
    publishedObservationCount: 6,
    marketCount: 2,
    unitCount: 1,
    priceTypeCount: 2,
    gradeUsedCount: 1,
    // The default vantage point is a public read, which cannot see unpublished
    // rows. Tests that need the complete picture set this explicitly.
    countsAreComplete: false,
    ...overrides,
  };
}

describe('readiness — the capabilities are gated on measured counts', () => {
  it('allows price comparison with two published observations and a unit', () => {
    const readiness = assessCommodityReadiness(input());
    expect(readiness.canComparePrices).toBe(true);
  });

  it('refuses price comparison with a single published observation', () => {
    const readiness = assessCommodityReadiness(input({ publishedObservationCount: 1, observationCount: 1 }));
    expect(readiness.canComparePrices).toBe(false);
    expect(readiness.gaps.join(' ')).toContain('Comparing a price against a previous one');
  });

  it('refuses price comparison when no unit is recorded', () => {
    // Without a unit the figure is a bare number, not a price.
    const readiness = assessCommodityReadiness(input({ unitCount: 0 }));
    expect(readiness.canComparePrices).toBe(false);
  });

  it('refuses history below the 7-observation indicator threshold', () => {
    const readiness = assessCommodityReadiness(input({ publishedObservationCount: 6 }));
    expect(readiness.canShowHistory).toBe(false);
    expect(readiness.gaps.join(' ')).toContain('7-period moving average');
  });

  it('allows history at exactly seven observations', () => {
    const readiness = assessCommodityReadiness(
      input({ publishedObservationCount: 7, observationCount: 7 }),
    );
    expect(readiness.canShowHistory).toBe(true);
  });

  it('refuses market comparison below two markets', () => {
    const readiness = assessCommodityReadiness(input({ marketCount: 1 }));
    expect(readiness.canShowMarketComparison).toBe(false);
    expect(readiness.gaps.join(' ')).toContain('Comparing across markets');
  });

  it('refuses grade comparison when only one grade appears in observations', () => {
    // Three grades defined, one used. Comparing them would compare nothing.
    const readiness = assessCommodityReadiness(input({ gradeCount: 3, gradeUsedCount: 1 }));
    expect(readiness.canShowGradeComparison).toBe(false);
    expect(readiness.gaps.join(' ')).toContain('cannot be compared against each other');
  });

  it('allows grade comparison when two grades appear in observations', () => {
    const readiness = assessCommodityReadiness(input({ gradeCount: 3, gradeUsedCount: 2 }));
    expect(readiness.canShowGradeComparison).toBe(true);
  });
});

describe('readiness — it does not claim what it cannot see', () => {
  it('says a published observation is unavailable, not that nothing was collected', () => {
    // price_observations is RLS-protected: a public read sees only published
    // rows. Asserting "nothing was recorded" from that vantage point would state
    // something the platform cannot verify.
    const readiness = assessCommodityReadiness(
      input({ observationCount: 0, publishedObservationCount: 0, marketCount: 0 }),
    );
    expect(readiness.gaps.join(' ')).toContain('No published price observation is available');
    expect(readiness.gaps.join(' ')).not.toContain('have been recorded');
    expect(readiness.countsAreComplete).toBe(false);
  });

  it('says nothing was recorded when the counts are known to be complete', () => {
    const readiness = assessCommodityReadiness(
      input({ observationCount: 0, publishedObservationCount: 0, marketCount: 0, countsAreComplete: true }),
    );
    expect(readiness.gaps.join(' ')).toContain('No price observations have been recorded');
    expect(readiness.countsAreComplete).toBe(true);
  });

  it('describes the two vantage points differently', () => {
    const publicView = describeReadiness(
      assessCommodityReadiness(input({ observationCount: 0, publishedObservationCount: 0 })),
    );
    const completeView = describeReadiness(
      assessCommodityReadiness(
        input({ observationCount: 0, publishedObservationCount: 0, countsAreComplete: true }),
      ),
    );
    expect(publicView).toBe('No published price observation is available for this commodity.');
    expect(completeView).toContain('have been recorded');
    expect(publicView).not.toBe(completeView);
  });

  it('still reports a recorded-but-unpublished record when it can see one', () => {
    const readiness = assessCommodityReadiness(
      input({ observationCount: 6, publishedObservationCount: 0, countsAreComplete: true }),
    );
    expect(readiness.gaps.join(' ')).toContain('none are published');
  });
});

describe('readiness — it distinguishes unpublished from absent', () => {
  it('says so when observations exist but none are published', () => {
    const readiness = assessCommodityReadiness(
      input({ observationCount: 6, publishedObservationCount: 0 }),
    );
    expect(readiness.gaps.join(' ')).toContain('none are published');
  });

  it('says so when no observations exist at all', () => {
    // With complete counts, "nothing was recorded" is a claim the platform can
    // actually make.
    const readiness = assessCommodityReadiness(
      input({
        observationCount: 0,
        publishedObservationCount: 0,
        marketCount: 0,
        countsAreComplete: true,
      }),
    );
    expect(readiness.gaps.join(' ')).toContain('No price observations have been recorded');
  });

  it('describes the two cases differently', () => {
    const none = describeReadiness(
      assessCommodityReadiness(
        input({
          observationCount: 0,
          publishedObservationCount: 0,
          marketCount: 0,
          countsAreComplete: true,
        }),
      ),
    );
    const unpublished = describeReadiness(
      assessCommodityReadiness(input({ observationCount: 6, publishedObservationCount: 0 })),
    );
    expect(none).toContain('No price observations');
    expect(unpublished).toContain('none published');
    expect(none).not.toBe(unpublished);
  });
});

describe('readiness — every gap is named, not scored', () => {
  it('names a missing description', () => {
    const readiness = assessCommodityReadiness(input({ hasDescription: false }));
    expect(readiness.gaps.join(' ')).toContain('No description has been recorded');
  });

  it('names a missing default grade and says why it matters', () => {
    const readiness = assessCommodityReadiness(input({ hasDefaultGrade: false }));
    expect(readiness.gaps.join(' ')).toContain('No default grade is set');
    expect(readiness.gaps.join(' ')).toContain('known quality level');
  });

  it('names missing synonyms in terms of what the user loses', () => {
    const readiness = assessCommodityReadiness(input({ synonymCount: 0 }));
    expect(readiness.gaps.join(' ')).toContain('local trade name');
  });

  it('does not report a missing-varieties gap when varieties are recorded', () => {
    const readiness = assessCommodityReadiness(input({ varietyCount: 3 }));
    expect(readiness.varietyCount).toBe(3);
    expect(readiness.gaps.join(' ')).not.toContain('No varieties are recorded');
  });

  it('flags an inactive duplicate record', () => {
    const readiness = assessCommodityReadiness(input({ isActive: false }));
    expect(readiness.gaps.join(' ')).toContain('inactive');
  });

  it('produces no percentage score to be misread', () => {
    const readiness = assessCommodityReadiness(input());
    // A "62% complete" profile implies a scale the platform never defined.
    expect(Object.keys(readiness)).not.toContain('completenessScore');
    expect(['complete', 'partial', 'minimal']).toContain(readiness.completeness);
  });

  it('labels a commodity with no content as minimal', () => {
    const readiness = assessCommodityReadiness(
      input({ hasDescription: false, hasDefaultGrade: false, gradeCount: 0, synonymCount: 0 }),
    );
    expect(readiness.completeness).toBe('minimal');
  });

  it('labels a fully-populated commodity as complete', () => {
    const readiness = assessCommodityReadiness(
      input({ gradeUsedCount: 2, publishedObservationCount: 8, observationCount: 8 }),
    );
    expect(readiness.completeness).toBe('complete');
  });

  it('gives a positive description when history is available', () => {
    const description = describeReadiness(
      assessCommodityReadiness(input({ publishedObservationCount: 8, observationCount: 8 })),
    );
    expect(description).toContain('published observation(s) across');
  });
});

/* ------------------------------------------------------------- synonyms -- */

const COMMODITIES = [
  { id: 6, name: 'Maize (White)', slug: 'maize-white', isActive: true },
  { id: 7, name: 'Maize (Yellow)', slug: 'maize-yellow', isActive: true },
  { id: 2, name: 'Paddy Rice (duplicate record)', slug: 'paddy-rice-duplicate-record', isActive: false },
  { id: 8, name: 'Millet', slug: 'millet', isActive: true },
];

const SYNONYMS = [
  { commodityId: 6, synonym: 'corn' },
  { commodityId: 7, synonym: 'corn' },
  { commodityId: 8, synonym: 'gero' },
  { commodityId: 2, synonym: 'rice' },
];

describe('resolution — it never guesses between crops', () => {
  it('resolves an exact slug', () => {
    const result = resolveCommodityTerm('maize-white', { commodities: COMMODITIES, synonyms: SYNONYMS });
    expect(result.kind).toBe('exact_slug');
    expect(result.commodityId).toBe(6);
  });

  it('resolves an exact name', () => {
    // "Maize (White)" has slug "maize-white", so the name match is the one that
    // fires — the slug check runs first and correctly does not match here.
    const result = resolveCommodityTerm('Maize (White)', {
      commodities: COMMODITIES,
      synonyms: SYNONYMS,
    });
    expect(result.kind).toBe('exact_name');
    expect(result.commodityId).toBe(6);
  });

  it('resolves a unique synonym', () => {
    const result = resolveCommodityTerm('gero', { commodities: COMMODITIES, synonyms: SYNONYMS });
    expect(result.kind).toBe('unique_synonym');
    expect(result.commodityId).toBe(8);
    expect(result.matchedTerm).toBe('gero');
  });

  it('refuses a synonym shared by two commodities', () => {
    // "corn" is recorded for both white and yellow maize. Picking one would send
    // a trader to the wrong prices, so the interface must ask.
    const result = resolveCommodityTerm('corn', { commodities: COMMODITIES, synonyms: SYNONYMS });
    expect(result.kind).toBe('ambiguous');
    expect(result.commodityId).toBeNull();
    expect(result.candidates.map((c) => c.commodityId)).toEqual([6, 7]);
  });

  it('never resolves to an inactive duplicate record', () => {
    const result = resolveCommodityTerm('paddy-rice-duplicate-record', {
      commodities: COMMODITIES,
      synonyms: SYNONYMS,
    });
    expect(result.kind).toBe('none');
  });

  it('ignores a synonym that belongs only to an inactive record', () => {
    const result = resolveCommodityTerm('rice', { commodities: COMMODITIES, synonyms: SYNONYMS });
    expect(result.kind).toBe('none');
  });

  it('returns none for an unknown term', () => {
    const result = resolveCommodityTerm('quinoa', { commodities: COMMODITIES, synonyms: SYNONYMS });
    expect(result.kind).toBe('none');
  });

  it('returns none for an empty term', () => {
    const result = resolveCommodityTerm('   ', { commodities: COMMODITIES, synonyms: SYNONYMS });
    expect(result.kind).toBe('none');
  });

  it('prefers an exact slug over a looser synonym match', () => {
    const result = resolveCommodityTerm('millet', { commodities: COMMODITIES, synonyms: SYNONYMS });
    expect(result.kind).toBe('exact_slug');
  });

  it('flags two active commodities sharing a name rather than picking one', () => {
    const result = resolveCommodityTerm('Maize', {
      commodities: [
        { id: 20, name: 'Maize', slug: 'maize-a', isActive: true },
        { id: 21, name: 'Maize', slug: 'maize-b', isActive: true },
      ],
      synonyms: [],
    });
    expect(result.kind).toBe('ambiguous');
  });
});

describe('normalisation — conservative by design', () => {
  it('folds case and collapses whitespace', () => {
    expect(normalise('  Maize   (White) ')).toBe('maize white');
  });

  it("strips apostrophes so a possessive form matches the plain one", () => {
    expect(normalise("Farmer's Beans")).toBe('farmers beans');
    expect(normalise("farmers' beans")).toBe('farmers beans');
  });

  it('does not equate terms that name different things', () => {
    // A normaliser that went further would start merging genuinely distinct
    // commodities, which is a mistake the user cannot see.
    expect(normalise('maize')).not.toBe(normalise('maize (white)'));
    expect(normalise('rice')).not.toBe(normalise('paddy rice'));
  });

  it('treats a two-character term as searchable and one as not', () => {
    expect(isSearchable('ma')).toBe(true);
    expect(isSearchable('m')).toBe(false);
    expect(isSearchable('  ')).toBe(false);
  });
});

/* ---------------------------------------------------------------- units -- */

const KG: UnitRecord = {
  id: 1, code: 'kg', name: 'kilogram', pluralName: 'kilograms',
  dimension: 'weight', baseUnitId: null, baseFactor: 1, isSpecific: true,
};
const TONNE: UnitRecord = {
  id: 2, code: 'tonne', name: 'tonne', pluralName: 'tonnes',
  dimension: 'weight', baseUnitId: 1, baseFactor: 1000, isSpecific: true,
};
const BAG: UnitRecord = {
  id: 3, code: 'bag', name: 'bag', pluralName: 'bags',
  dimension: 'weight', baseUnitId: null, baseFactor: null, isSpecific: false,
};
const LITRE: UnitRecord = {
  id: 4, code: 'litre', name: 'litre', pluralName: 'litres',
  dimension: 'volume', baseUnitId: null, baseFactor: 1, isSpecific: true,
};

describe('conversion — it refuses rather than approximates', () => {
  it('converts between units that share a dimension and have factors', () => {
    const result = findConversion(TONNE, KG);
    expect(result.possible).toBe(true);
    if (result.possible) {
      expect(result.factor).toBe(1000);
      expect(result.explanation).toContain('base unit');
    }
  });

  it('converts in the other direction too', () => {
    const result = findConversion(KG, TONNE);
    expect(result.possible).toBe(true);
    if (result.possible) expect(result.factor).toBeCloseTo(0.001, 9);
  });

  it('treats the same unit as a factor of one', () => {
    const result = findConversion(KG, KG);
    expect(result.possible).toBe(true);
    if (result.possible) expect(result.factor).toBe(1);
  });

  it('refuses to convert across dimensions', () => {
    // A weight is not a volume, and no factor makes them equal.
    const result = findConversion(KG, LITRE);
    expect(result.possible).toBe(false);
    if (!result.possible) expect(result.reason).toContain('different kinds of quantity');
  });

  it('refuses a unit with no recorded factor', () => {
    // The real case: 56 of 58 observations are in `bag` with no approved
    // conversion. Assuming 1 bag = 100 kg would be an invention.
    const result = findConversion(BAG, KG);
    expect(result.possible).toBe(false);
    if (!result.possible) {
      expect(result.reason).toContain('No approved conversion factor');
      expect(result.reason).toContain('not something to assume');
    }
  });

  it('refuses in either direction when the factor is missing', () => {
    expect(findConversion(KG, BAG).possible).toBe(false);
    expect(findConversion(BAG, TONNE).possible).toBe(false);
  });

  it('explains the arithmetic when it succeeds', () => {
    const result = findConversion(TONNE, KG);
    expect(result.possible).toBe(true);
    if (result.possible) {
      expect(result.explanation).toContain('tonne');
      expect(result.explanation).toContain('kilogram');
      expect(result.explanation).toContain('weight');
    }
  });

  it('reports units as comparable only when a conversion exists', () => {
    expect(unitsAreComparable(TONNE, KG)).toBe(true);
    expect(unitsAreComparable(BAG, KG)).toBe(false);
    expect(unitsAreComparable(KG, LITRE)).toBe(false);
  });

  it('finds a unit by code, case-insensitively', () => {
    expect(findUnitByCode('KG', [KG, TONNE, BAG])?.id).toBe(1);
    expect(findUnitByCode(' bag ', [KG, TONNE, BAG])?.id).toBe(3);
    expect(findUnitByCode('stone', [KG, TONNE, BAG])).toBeNull();
  });
});
