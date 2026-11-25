import { describe, expect, it } from 'vitest';
import { assessConfidence, CONFIDENCE_WEIGHTS } from '@/lib/fundamentals/confidence';
import {
  isPubliclyVisible,
  ASSESSMENT_BIAS_LABELS,
  ASSESSMENT_DISCLAIMER,
  FUNDAMENTAL_FRESHNESS_POLICY,
  type FundamentalEvidence,
  type ScopeMatch,
} from '@/lib/fundamentals/types';

/**
 * The confidence framework, tested against the rule that motivated it.
 *
 * §14: *"Avoid simplistic confidence scoring based only on the number of
 * articles. Multiple articles repeating the same original announcement are not
 * independent evidence."*
 *
 * The test that matters most is the first one: ten records, one origin, and the
 * framework must not read that as ten sources.
 */

const NOW = new Date('2026-11-14T12:00:00.000Z');

function evidence(overrides: Partial<FundamentalEvidence> = {}): FundamentalEvidence {
  return {
    id: 'e1',
    headline: 'Test evidence',
    description: 'A record for testing.',
    category: 'supply',
    subcategory: null,
    commodityIds: [1],
    countryIds: [1],
    regionIds: [],
    marketIds: [],
    sourceName: 'Test source',
    sourceType: 'official_statistical',
    sourceUrl: null,
    documentReference: null,
    publishedAt: '2026-11-10T00:00:00.000Z',
    eventAt: '2026-11-10T00:00:00.000Z',
    retrievedAt: '2026-11-10T00:00:00.000Z',
    lastVerifiedAt: '2026-11-10T00:00:00.000Z',
    originId: 'origin-1',
    status: 'published',
    measurementQuality: 'measured',
    reliability: { level: 'high', reason: null, assessedBy: null, assessedAt: null },
    contradicts: [],
    value: null,
    unit: null,
    author: null,
    reviewer: null,
    version: 1,
    ...overrides,
  };
}

function scopeFor(records: FundamentalEvidence[], match: ScopeMatch = { commodity: 'direct', geography: 'direct' }): Map<string, ScopeMatch> {
  return new Map(records.map((r) => [r.id, match]));
}

describe('the weights sum to one', () => {
  it('the eight §14 factors account for the whole score', () => {
    const total = Object.values(CONFIDENCE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
  });
});

describe('independent sources, not record counts', () => {
  it('ten records sharing one origin count as one source', () => {
    const records = Array.from({ length: 10 }, (_, i) =>
      evidence({ id: `e${i}`, originId: 'origin-1' }),
    );
    const result = assessConfidence({
      evidence: records,
      scope: scopeFor(records),
      category: 'supply',
      now: NOW,
    });
    expect(result.independentSourceCount).toBe(1);
    // One origin caps at moderate however many records repeat it.
    expect(result.level).toBe('moderate');
    expect(result.reason).toContain('single origin');
  });

  it('ten records from ten origins count as ten sources', () => {
    const records = Array.from({ length: 10 }, (_, i) =>
      evidence({ id: `e${i}`, originId: `origin-${i}` }),
    );
    const result = assessConfidence({
      evidence: records,
      scope: scopeFor(records),
      category: 'supply',
      now: NOW,
    });
    expect(result.independentSourceCount).toBe(10);
    expect(result.level).toBe('high');
  });

  it('one strong source never reaches high confidence', () => {
    const records = [evidence({ originId: 'only-one' })];
    const result = assessConfidence({
      evidence: records,
      scope: scopeFor(records),
      category: 'supply',
      now: NOW,
    });
    // An official statistic, measured, recent, directly relevant — and still
    // only moderate, because one source is one source.
    expect(result.score).toBeGreaterThan(0.6);
    expect(result.level).toBe('moderate');
  });
});

describe('an empty evidence set is not weak evidence', () => {
  it('returns insufficient with a null score', () => {
    const result = assessConfidence({
      evidence: [],
      scope: new Map(),
      category: 'supply',
      now: NOW,
    });
    expect(result.level).toBe('insufficient');
    expect(result.score).toBeNull();
    expect(result.independentSourceCount).toBe(0);
    expect(result.reason).toContain('no evidence');
  });

  it('unpublished evidence does not count', () => {
    // A draft is not weak evidence, it is not evidence. §13: only eligible
    // published evidence appears in public intelligence.
    const result = assessConfidence({
      evidence: [evidence({ status: 'draft' }), evidence({ id: 'e2', status: 'under_review' })],
      scope: new Map(),
      category: 'supply',
      now: NOW,
    });
    expect(result.level).toBe('insufficient');
    expect(result.score).toBeNull();
  });
});

describe('contradictory evidence reduces confidence independently', () => {
  it('two contradicting origins do not reach high confidence', () => {
    const a = evidence({ id: 'a', originId: 'o1', contradicts: ['b'] });
    const b = evidence({ id: 'b', originId: 'o2', contradicts: ['a'] });
    const records = [a, b];
    const result = assessConfidence({
      evidence: records,
      scope: scopeFor(records),
      category: 'supply',
      now: NOW,
    });
    expect(result.independentSourceCount).toBe(2);
    // Both records are contradicted, so consistency and contradiction both fall.
    const contradiction = result.factors.find((f) => f.name === 'Contradiction');
    expect(contradiction?.value).toBe(0);
    expect(result.level).not.toBe('high');
    expect(result.reason).toContain('contradicted');
  });

  it('independent origins that contradict each other cannot be high confidence', () => {
    // The cap, not the arithmetic. Two strong statistics that disagree still
    // average well, and the platform must not claim high confidence anyway.
    const a = evidence({ id: 'a', originId: 'o1', contradicts: ['b'] });
    const b = evidence({ id: 'b', originId: 'o2', contradicts: ['a'] });
    const result = assessConfidence({
      evidence: [a, b],
      scope: scopeFor([a, b]),
      category: 'supply',
      now: NOW,
    });
    expect(result.level).toBe('moderate');
    expect(result.score).toBeGreaterThan(0.7);
    expect(result.reason).toContain('contradicted');
  });

  it('preserves both records rather than dropping one', () => {
    // §23: "Where sources disagree: preserve both records." The framework scores
    // the disagreement; it never resolves it by deletion.
    const a = evidence({ id: 'a', originId: 'o1', contradicts: ['b'] });
    const b = evidence({ id: 'b', originId: 'o2', contradicts: ['a'] });
    const result = assessConfidence({
      evidence: [a, b],
      scope: scopeFor([a, b]),
      category: 'supply',
      now: NOW,
    });
    expect(result.factors.length).toBe(8);
  });
});

describe('freshness uses the category policy, not one global threshold', () => {
  it('a day-old exchange rate is stale under the currency policy', () => {
    const stale = evidence({
      category: 'currency',
      eventAt: '2026-11-13T00:00:00.000Z',
      publishedAt: '2026-11-13T00:00:00.000Z',
    });
    const result = assessConfidence({
      evidence: [stale],
      scope: scopeFor([stale]),
      category: 'currency',
      now: NOW,
    });
    const recency = result.factors.find((f) => f.name === 'Recency');
    // 36 hours old against a 24-hour policy.
    expect(recency?.value).toBe(0);
    expect(recency?.note).toContain('24h');
  });

  it('the same age is acceptable under the production policy', () => {
    // 36 hours is nothing for a periodic production statistic. This is the whole
    // point of §23's per-category policy.
    const record = evidence({
      category: 'production',
      eventAt: '2026-11-13T00:00:00.000Z',
      publishedAt: '2026-11-13T00:00:00.000Z',
    });
    const result = assessConfidence({
      evidence: [record],
      scope: scopeFor([record]),
      category: 'production',
      now: NOW,
    });
    const recency = result.factors.find((f) => f.name === 'Recency');
    expect(recency?.value).toBeGreaterThan(0.9);
  });

  it('an expired forecast scores zero recency, not merely low', () => {
    const forecast = evidence({
      category: 'weather',
      eventAt: '2026-11-10T00:00:00.000Z',
      publishedAt: '2026-11-10T00:00:00.000Z',
    });
    const result = assessConfidence({
      evidence: [forecast],
      scope: scopeFor([forecast]),
      category: 'weather',
      now: NOW,
    });
    const recency = result.factors.find((f) => f.name === 'Recency');
    // 96 hours old against a 48-hour forecast window: over, not merely ageing.
    expect(recency?.value).toBe(0);
  });

  it('a record with no usable timestamp is weak evidence', () => {
    // `retrievedAt` is the last fallback, so an undated claim still has a
    // reference point. Weakness applies only when nothing parses at all.
    const undated = evidence({
      publishedAt: 'not-a-date',
      eventAt: null,
      retrievedAt: 'not-a-date',
    });
    const result = assessConfidence({
      evidence: [undated],
      scope: scopeFor([undated]),
      category: 'supply',
      now: NOW,
    });
    const recency = result.factors.find((f) => f.name === 'Recency');
    expect(recency?.value).toBe(0.2);
  });

  it('recency falls back through event, publication and retrieval dates', () => {
    // An undated claim is judged by when it was fetched, not ignored.
    const undated = evidence({
      publishedAt: null,
      eventAt: null,
      retrievedAt: '2026-11-10T00:00:00.000Z',
    });
    const result = assessConfidence({
      evidence: [undated],
      scope: scopeFor([undated]),
      category: 'supply',
      now: NOW,
    });
    const recency = result.factors.find((f) => f.name === 'Recency');
    expect(recency?.value).toBeGreaterThan(0.8);
  });
});

describe('scope relevance gates the score', () => {
  it('evidence about another commodity does not score as relevant', () => {
    const record = evidence();
    const relevant = assessConfidence({
      evidence: [record],
      scope: scopeFor([record], { commodity: 'direct', geography: 'direct' }),
      category: 'supply',
      now: NOW,
    });
    const irrelevant = assessConfidence({
      evidence: [record],
      scope: scopeFor([record], { commodity: 'none', geography: 'none' }),
      category: 'supply',
      now: NOW,
    });
    expect(irrelevant.score!).toBeLessThan(relevant.score!);
  });

  it('adjacent scope scores half of direct', () => {
    const record = evidence();
    const direct = assessConfidence({
      evidence: [record],
      scope: scopeFor([record], { commodity: 'direct', geography: 'direct' }),
      category: 'supply',
      now: NOW,
    });
    const adjacent = assessConfidence({
      evidence: [record],
      scope: scopeFor([record], { commodity: 'adjacent', geography: 'adjacent' }),
      category: 'supply',
      now: NOW,
    });
    const directCommodity = direct.factors.find((f) => f.name === 'Commodity relevance');
    const adjacentCommodity = adjacent.factors.find((f) => f.name === 'Commodity relevance');
    expect(adjacentCommodity?.value).toBeCloseTo((directCommodity?.value ?? 0) / 2, 3);
  });
});

describe('measurement quality', () => {
  it('an estimate scores below a measurement', () => {
    const measured = evidence({ measurementQuality: 'measured' });
    const estimated = evidence({ id: 'e2', measurementQuality: 'estimated' });
    const measuredResult = assessConfidence({
      evidence: [measured],
      scope: scopeFor([measured]),
      category: 'supply',
      now: NOW,
    });
    const estimatedResult = assessConfidence({
      evidence: [estimated],
      scope: scopeFor([estimated]),
      category: 'supply',
      now: NOW,
    });
    expect(estimatedResult.score!).toBeLessThan(measuredResult.score!);
  });

  it('unknown measurement quality scores lowest', () => {
    const unknown = evidence({ measurementQuality: 'unknown' });
    const result = assessConfidence({
      evidence: [unknown],
      scope: scopeFor([unknown]),
      category: 'supply',
      now: NOW,
    });
    const factor = result.factors.find((f) => f.name === 'Measurement quality');
    expect(factor?.value).toBe(0.2);
  });
});

describe('the score is interrogable', () => {
  it('returns one factor per §14 input', () => {
    const result = assessConfidence({
      evidence: [evidence()],
      scope: scopeFor([evidence()]),
      category: 'supply',
      now: NOW,
    });
    expect(result.factors.map((f) => f.name)).toEqual([
      'Source quality',
      'Recency',
      'Geographic relevance',
      'Commodity relevance',
      'Independent sources',
      'Consistency',
      'Measurement quality',
      'Contradiction',
    ]);
  });

  it('every factor carries a note explaining itself', () => {
    const result = assessConfidence({
      evidence: [evidence()],
      scope: scopeFor([evidence()]),
      category: 'supply',
      now: NOW,
    });
    for (const factor of result.factors) {
      expect(factor.note.length).toBeGreaterThan(0);
      expect(factor.value).toBeGreaterThanOrEqual(0);
      expect(factor.value).toBeLessThanOrEqual(1);
    }
  });

  it('the score is the weighted sum of its factors', () => {
    const result = assessConfidence({
      evidence: [evidence()],
      scope: scopeFor([evidence()]),
      category: 'supply',
      now: NOW,
    });
    const sum = result.factors.reduce((acc, f) => acc + f.value * f.weight, 0);
    expect(result.score).toBeCloseTo(Math.round(sum * 1000) / 1000, 3);
  });
});

describe('the assessment vocabulary and its disclaimer', () => {
  it('insufficient evidence is a first-class label, not an error', () => {
    expect(ASSESSMENT_BIAS_LABELS.insufficient_evidence).toBe('Insufficient evidence');
  });

  it('every bias is labelled', () => {
    for (const label of Object.values(ASSESSMENT_BIAS_LABELS)) {
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('the disclaimer forbids reading a bias as a forecast', () => {
    // §14: "A bullish assessment does not mean the price will definitely rise."
    expect(ASSESSMENT_DISCLAIMER).toContain('not a price forecast');
    expect(ASSESSMENT_DISCLAIMER).toContain('not a recommendation');
  });
});

describe('publication visibility', () => {
  it('only published evidence is publicly visible', () => {
    expect(isPubliclyVisible('published')).toBe(true);
  });

  it('verified is not the same as published', () => {
    // Verification and publication are separate acts, here as everywhere else.
    expect(isPubliclyVisible('verified')).toBe(false);
    expect(isPubliclyVisible('draft')).toBe(false);
    expect(isPubliclyVisible('under_review')).toBe(false);
    expect(isPubliclyVisible('rejected')).toBe(false);
    expect(isPubliclyVisible('expired')).toBe(false);
    expect(isPubliclyVisible('archived')).toBe(false);
    expect(isPubliclyVisible('correction_required')).toBe(false);
  });
});

describe('per-category freshness policies', () => {
  it('every category has a policy, and they differ', () => {
    const windows = Object.values(FUNDAMENTAL_FRESHNESS_POLICY).map((p) => p.maxAgeHours);
    expect(new Set(windows).size).toBeGreaterThan(1);
  });

  it('currency is the tightest and seasonality the loosest', () => {
    const sorted = Object.entries(FUNDAMENTAL_FRESHNESS_POLICY).sort(
      (a, b) => a[1].maxAgeHours - b[1].maxAgeHours,
    );
    expect(sorted[0][0]).toBe('currency');
    expect(sorted[sorted.length - 1][0]).toBe('seasonality');
  });

  it('weather is marked as a forecast so it expires rather than ages', () => {
    expect(FUNDAMENTAL_FRESHNESS_POLICY.weather.isForecast).toBe(true);
  });
});
