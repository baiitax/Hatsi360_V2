/**
 * Hatsi360 Markets — the fundamental confidence framework.
 *
 * Phase 07 §14 requires a *documented* confidence framework that reflects eight
 * things, and warns against *"simplistic confidence scoring based only on the
 * number of articles."*
 *
 * The trap this file exists to avoid: ten news stories about one ministry
 * announcement look like ten sources. They are one. Every record carries an
 * `originId`, and the independent-source count is a count of **distinct
 * origins** — never a count of records.
 *
 * The output is deliberately arguable. `factors` returns one line per input with
 * its weight and its value, so a reviewer can see exactly which factor dragged a
 * score down and disagree with it. A confidence number nobody can interrogate is
 * a number nobody should trust.
 */

import {
  CLASSIFICATION_AUTHORITY,
  FUNDAMENTAL_FRESHNESS_POLICY,
  isPubliclyVisible,
  MEASUREMENT_QUALITY_WEIGHT,
  type ConfidenceFactor,
  type ConfidenceResult,
  type FundamentalCategory,
  type FundamentalEvidence,
  type ScopeMatch,
} from './types';

/** The eight factors §14 names, with weights summing to 1. */
export const CONFIDENCE_WEIGHTS = {
  /** How authoritative the source class is. */
  sourceQuality: 0.18,
  /** How recent the evidence is, against the category's own policy. */
  recency: 0.14,
  /** Whether the evidence covers the region in question. */
  geographicRelevance: 0.14,
  /** Whether the evidence covers the commodity in question. */
  commodityRelevance: 0.12,
  /** How many *distinct origins* agree. The anti-article-count factor. */
  independentSources: 0.16,
  /** Whether the distinct origins agree with each other. */
  consistency: 0.1,
  /** Measured, reported, estimated or unknown. */
  measurementQuality: 0.08,
  /** Penalty for contradictory evidence, applied after the weighted sum. */
  contradiction: 0.08,
} as const;

/** Below this many distinct origins, confidence cannot exceed `moderate`. */
const MIN_INDEPENDENT_FOR_HIGH = 2;

export interface ConfidenceInput {
  /** The evidence being assessed. Only published records are considered. */
  evidence: FundamentalEvidence[];
  /** How well each record's scope matches the question being asked. */
  scope: Map<string, ScopeMatch>;
  /** Which freshness policy applies. §23 forbids one global threshold. */
  category: FundamentalCategory;
  /** Injectable clock, so a confidence test is a test of the rule. */
  now: Date;
}

const SCOPE_VALUE: Record<ScopeMatch['commodity'], number> = {
  direct: 1,
  adjacent: 0.5,
  none: 0,
};

/**
 * Assess confidence in a directional reading of the supplied evidence.
 *
 * Returns `insufficient` with a `null` score when there is nothing published to
 * assess. That is a real answer, not a failure: §14 makes *insufficient
 * evidence* a first-class assessment outcome, and a platform that scores an
 * empty set as "low confidence" is implying it looked and found little, rather
 * than admitting it has nothing.
 */
export function assessConfidence(input: ConfidenceInput): ConfidenceResult {
  const { evidence, scope, category, now } = input;

  const eligible = evidence.filter((record) => isPubliclyVisible(record.status));

  if (eligible.length === 0) {
    return {
      level: 'insufficient',
      score: null,
      independentSourceCount: 0,
      factors: [],
      reason:
        'No published evidence is available for this scope, so no directional assessment ' +
        'can be supported. An empty evidence set is not weak evidence — it is no evidence.',
    };
  }

  /* 1 — independent origins, not records -------------------------------- */
  // The single most important line in this file. Grouping by `originId` is what
  // stops ten retellings of one announcement from reading as ten sources.
  const origins = new Set(eligible.map((record) => record.originId));
  const independentSourceCount = origins.size;

  // More origins help, with sharply diminishing returns: the step from one to
  // two independent sources matters far more than from nine to ten.
  const independentValue = Math.min(1, Math.log2(independentSourceCount + 1) / Math.log2(4));

  /* 2 — source quality -------------------------------------------------- */
  const sourceQuality =
    eligible.reduce((sum, r) => sum + CLASSIFICATION_AUTHORITY[r.sourceType], 0) /
    eligible.length;

  /* 3 — recency, against this category's own policy --------------------- */
  const policy = FUNDAMENTAL_FRESHNESS_POLICY[category];
  const recency = average(
    eligible.map((record) => {
      const reference = record.eventAt ?? record.publishedAt ?? record.retrievedAt;
      const ageHours = hoursSince(reference, now);
      if (ageHours === null) return 0.2; // no usable timestamp is itself weak evidence
      // A forecast is not "fresh" after its validity window — it is over.
      if (policy.isForecast && ageHours > policy.maxAgeHours) return 0;
      return clamp(1 - ageHours / policy.maxAgeHours);
    }),
  );

  /* 4 and 5 — scope relevance ------------------------------------------ */
  const geographicRelevance = average(
    eligible.map((record) => SCOPE_VALUE[scope.get(record.id)?.geography ?? 'none']),
  );
  const commodityRelevance = average(
    eligible.map((record) => SCOPE_VALUE[scope.get(record.id)?.commodity ?? 'none']),
  );

  /* 6 — consistency between independent origins ------------------------ */
  // Contradiction is tracked per record via `contradicts`. Two origins that
  // contradict each other are not consistent, however many records each has.
  const contradictedIds = new Set(eligible.flatMap((r) => r.contradicts));
  const contradictedCount = eligible.filter((r) => contradictedIds.has(r.id)).length;
  const consistency = clamp(1 - contradictedCount / eligible.length);

  /* 7 — measurement quality -------------------------------------------- */
  const measurementQuality = average(
    eligible.map((record) => MEASUREMENT_QUALITY_WEIGHT[record.measurementQuality]),
  );

  /* 8 — contradiction penalty ------------------------------------------ */
  // Applied as its own weighted factor rather than folded into consistency, so
  // a reviewer can see that a score was reduced by disagreement and not by
  // anything about the sources themselves.
  const contradiction = contradictedCount === 0 ? 1 : clamp(1 - contradictedCount / Math.max(1, independentSourceCount));

  const factors: ConfidenceFactor[] = [
    {
      name: 'Source quality',
      value: round(sourceQuality),
      weight: CONFIDENCE_WEIGHTS.sourceQuality,
      note: `Mean authority across ${eligible.length} published record(s).`,
    },
    {
      name: 'Recency',
      value: round(recency),
      weight: CONFIDENCE_WEIGHTS.recency,
      note: `Measured against the ${policy.label} freshness policy of ${policy.maxAgeHours}h.`,
    },
    {
      name: 'Geographic relevance',
      value: round(geographicRelevance),
      weight: CONFIDENCE_WEIGHTS.geographicRelevance,
      note: 'How well the evidence covers the region in question.',
    },
    {
      name: 'Commodity relevance',
      value: round(commodityRelevance),
      weight: CONFIDENCE_WEIGHTS.commodityRelevance,
      note: 'How well the evidence covers the commodity in question.',
    },
    {
      name: 'Independent sources',
      value: round(independentValue),
      weight: CONFIDENCE_WEIGHTS.independentSources,
      note:
        `${independentSourceCount} distinct origin(s), not ${eligible.length} record(s). ` +
        'Records sharing an origin are one source.',
    },
    {
      name: 'Consistency',
      value: round(consistency),
      weight: CONFIDENCE_WEIGHTS.consistency,
      note:
        contradictedCount === 0
          ? 'No contradictory records among the published set.'
          : `${contradictedCount} of ${eligible.length} record(s) are contradicted by another.`,
    },
    {
      name: 'Measurement quality',
      value: round(measurementQuality),
      weight: CONFIDENCE_WEIGHTS.measurementQuality,
      note: 'Measured values score above estimates; unknown scores lowest.',
    },
    {
      name: 'Contradiction',
      value: round(contradiction),
      weight: CONFIDENCE_WEIGHTS.contradiction,
      note:
        contradictedCount === 0
          ? 'No conflicting evidence identified.'
          : `Conflicting evidence reduces confidence independently of source quality.`,
    },
  ];

  const score = round(
    factors.reduce((sum, factor) => sum + factor.value * factor.weight, 0),
  );

  /* The level ---------------------------------------------------------- */
  // Two independent gates, because a high score on one origin is not high
  // confidence: §14 requires the *number of independent sources* to matter, not
  // just the average quality.
  let level: ConfidenceResult['level'];
  if (score >= 0.7 && independentSourceCount >= MIN_INDEPENDENT_FOR_HIGH) {
    level = 'high';
  } else if (score >= 0.45) {
    level = 'moderate';
  } else {
    level = 'low';
  }

  // A single origin caps at moderate however good it is. One ministry
  // announcement, however authoritative, is one source.
  if (independentSourceCount < MIN_INDEPENDENT_FOR_HIGH && level === 'high') {
    level = 'moderate';
  }

  // Independent origins that directly contradict each other cap the level too.
  //
  // This is a cap rather than a bigger weighted penalty because arithmetic alone
  // cannot express it: two high-quality statistics that disagree still produce a
  // high average source score. A cap states the honest thing — the platform
  // cannot claim *high* confidence while independent sources directly oppose each
  // other, however good they otherwise are. §23 wants both records preserved and
  // compared; this is the visible consequence of comparing them.
  if (contradictedCount > 0 && independentSourceCount >= MIN_INDEPENDENT_FOR_HIGH) {
    if (level === 'high') level = 'moderate';
  }

  const reason = buildReason({
    level,
    independentSourceCount,
    contradictedCount,
    recordCount: eligible.length,
    policyLabel: policy.label,
  });

  return { level, score, independentSourceCount, factors, reason };
}

function buildReason(input: {
  level: ConfidenceResult['level'];
  independentSourceCount: number;
  contradictedCount: number;
  recordCount: number;
  policyLabel: string;
}): string {
  const parts: string[] = [];
  parts.push(
    `${input.level.charAt(0).toUpperCase()}${input.level.slice(1)} confidence from ` +
      `${input.independentSourceCount} independent source(s) across ` +
      `${input.recordCount} published record(s).`,
  );
  if (input.independentSourceCount === 1 && input.recordCount > 1) {
    parts.push(
      'Those records share a single origin, so they count as one source rather than ' +
        `${input.recordCount}.`,
    );
  }
  if (input.contradictedCount > 0) {
    parts.push(
      `${input.contradictedCount} record(s) are contradicted by another source, which ` +
        'reduces confidence independently of source quality.',
    );
  }
  parts.push(`Freshness is measured against the ${input.policyLabel} policy.`);
  return parts.join(' ');
}

/* ------------------------------------------------------------- helpers -- */

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function hoursSince(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, (now.getTime() - then) / 3_600_000);
}
