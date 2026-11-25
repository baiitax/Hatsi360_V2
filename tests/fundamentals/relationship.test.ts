import { describe, expect, it } from 'vitest';
import {
  classifyRelationship,
  windowOverlaps,
  RELATIONSHIP_OVERLAY_NOTE,
  type RelationshipInput,
} from '@/lib/fundamentals/relationship';
import { RELATIONSHIP_TYPE_LABELS, RELATIONSHIP_CAUSALITY_NOTE } from '@/lib/fundamentals/types';

/**
 * The causal guard.
 *
 * §15: *"Never automatically classify a factor as a direct cause simply because
 * its date overlaps a price movement."*
 *
 * These tests exist to make that rule executable. The default is the weakest
 * category; a stronger claim requires evidence the caller must supply.
 */

const PERIOD = { periodStart: '2026-11-01T00:00:00.000Z', periodEnd: '2026-11-14T00:00:00.000Z' };

function input(overrides: Partial<RelationshipInput> = {}): RelationshipInput {
  return {
    eventAt: '2026-11-05T00:00:00.000Z',
    publishedAt: '2026-11-05T00:00:00.000Z',
    ...PERIOD,
    documentedImpact: null,
    hasTransmissionMechanism: false,
    sameMarket: false,
    sameRegion: false,
    ...overrides,
  };
}

describe('date overlap alone never asserts cause', () => {
  it('a factor inside the window with nothing else is a temporal association', () => {
    const result = classifyRelationship(input());
    expect(result.type).toBe('temporal_association');
    expect(result.isCausalClaim).toBe(false);
    expect(result.explanation).toContain('not proof of causality');
  });

  it('a factor outside the window is unconfirmed', () => {
    const result = classifyRelationship(input({ eventAt: '2026-10-01T00:00:00.000Z' }));
    expect(result.type).toBe('unconfirmed');
    expect(result.isCausalClaim).toBe(false);
  });

  it('a factor with no timestamp is unconfirmed', () => {
    const result = classifyRelationship(input({ eventAt: null, publishedAt: null }));
    expect(result.type).toBe('unconfirmed');
  });
});

describe('stronger categories require more than a date', () => {
  it('same region alone is context, not cause', () => {
    const result = classifyRelationship(input({ sameRegion: true }));
    expect(result.type).toBe('strong_contextual_relevance');
    expect(result.isCausalClaim).toBe(false);
  });

  it('same market alone is context, not cause', () => {
    const result = classifyRelationship(input({ sameMarket: true }));
    expect(result.type).toBe('strong_contextual_relevance');
  });

  it('a mechanism without documented impact is still not cause', () => {
    const result = classifyRelationship(
      input({ sameRegion: true, hasTransmissionMechanism: true }),
    );
    expect(result.type).toBe('potential_transmission_mechanism');
    expect(result.isCausalClaim).toBe(false);
  });

  it('a mechanism without shared geography is not upgraded', () => {
    // A plausible mechanism about somewhere else is not relevant to this price.
    const result = classifyRelationship(input({ hasTransmissionMechanism: true }));
    expect(result.type).toBe('temporal_association');
  });

  it('only documented impact may assert cause', () => {
    const result = classifyRelationship(
      input({
        sameRegion: true,
        hasTransmissionMechanism: true,
        documentedImpact: 'Ministry order removing 40% of arrivals, cited in the source.',
      }),
    );
    expect(result.type).toBe('directly_documented_impact');
    expect(result.isCausalClaim).toBe(true);
    expect(result.explanation).toContain('not the date overlap');
  });
});

describe('the strongest category is never reached by coincidence', () => {
  it('a perfect date overlap with full context but no impact stays short of cause', () => {
    const result = classifyRelationship(
      input({ sameMarket: true, sameRegion: true, hasTransmissionMechanism: true }),
    );
    expect(result.type).not.toBe('directly_documented_impact');
    expect(result.isCausalClaim).toBe(false);
  });

  it('documented impact outside the window is still unconfirmed', () => {
    // Even a documented impact does not reach back outside the window.
    const result = classifyRelationship(
      input({ eventAt: '2026-09-01T00:00:00.000Z', documentedImpact: 'Documented.' }),
    );
    expect(result.type).toBe('unconfirmed');
  });
});

describe('window boundaries', () => {
  it('a factor on the start boundary overlaps', () => {
    expect(windowOverlaps(PERIOD.periodStart, PERIOD.periodStart, PERIOD.periodEnd)).toBe(true);
  });

  it('a factor on the end boundary overlaps', () => {
    expect(windowOverlaps(PERIOD.periodEnd, PERIOD.periodStart, PERIOD.periodEnd)).toBe(true);
  });

  it('a factor a minute before the window does not', () => {
    expect(
      windowOverlaps('2026-10-31T23:59:00.000Z', PERIOD.periodStart, PERIOD.periodEnd),
    ).toBe(false);
  });

  it('an unparseable timestamp does not overlap', () => {
    expect(windowOverlaps('not-a-date', PERIOD.periodStart, PERIOD.periodEnd)).toBe(false);
    expect(windowOverlaps(null, PERIOD.periodStart, PERIOD.periodEnd)).toBe(false);
  });

  it('falls back to the publication date when there is no event date', () => {
    const result = classifyRelationship(input({ eventAt: null, publishedAt: '2026-11-05T00:00:00.000Z' }));
    expect(result.type).toBe('temporal_association');
  });
});

describe('every relationship type is labelled', () => {
  it('the vocabulary is complete', () => {
    for (const label of Object.values(RELATIONSHIP_TYPE_LABELS)) {
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

describe('the causality note travels with the overlay', () => {
  it('states that overlap is not proof', () => {
    expect(RELATIONSHIP_OVERLAY_NOTE).toContain('not proof of causality');
  });

  it('the type-level note says the same thing', () => {
    expect(RELATIONSHIP_CAUSALITY_NOTE).toContain('Temporal overlap is contextual');
  });
});
