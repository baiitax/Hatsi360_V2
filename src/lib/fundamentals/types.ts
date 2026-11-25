/**
 * Hatsi360 Markets — the fundamental evidence domain model.
 *
 * Phase 07 §13 calls this *"the most important component of Phase 07."* Every
 * fundamental insight the platform shows must be an instance of one of these
 * records, carrying its source, its timestamps, its classification and its
 * assessment of reliability.
 *
 * The design rule that shapes this whole file: **the source's authority and the
 * platform's assessment of reliability are two different things.** An official
 * government publication is classified `official_statistical`; whether the
 * platform *trusts* it for a given commodity and region is a separate judgement
 * made by the confidence framework in `confidence.ts`. A source category alone
 * does not guarantee accuracy.
 */

/* --------------------------------------------------------- classification -- */

/**
 * Where a piece of evidence came from.
 *
 * §13 lists ten values and requires that the interface distinguish *"the
 * source's authority from the platform's assessment of reliability."* This enum
 * is the authority half only.
 */
export const EVIDENCE_CLASSIFICATIONS = [
  'official_government',
  'official_statistical',
  'international_institution',
  'research_institution',
  'verified_industry',
  'verified_field_intelligence',
  'market_participant',
  'news_report',
  'unverified',
  'ai_interpretation',
] as const;

export type EvidenceClassification = (typeof EVIDENCE_CLASSIFICATIONS)[number];

export const EVIDENCE_CLASSIFICATION_LABELS: Record<EvidenceClassification, string> = {
  official_government: 'Official government source',
  official_statistical: 'Official statistical publication',
  international_institution: 'International institution',
  research_institution: 'Recognised research institution',
  verified_industry: 'Verified industry source',
  verified_field_intelligence: 'Verified field intelligence',
  market_participant: 'Market participant report',
  news_report: 'News report',
  unverified: 'Unverified information',
  ai_interpretation: 'AI-generated interpretation',
};

/**
 * How much authority a classification carries, before any other factor.
 *
 * This is deliberately coarse. It is one input among eight in the confidence
 * framework, and it is *not* the confidence score — an official statistic about
 * the wrong region is still weak evidence for this commodity.
 */
export const CLASSIFICATION_AUTHORITY: Record<EvidenceClassification, number> = {
  official_statistical: 1.0,
  official_government: 0.95,
  international_institution: 0.9,
  research_institution: 0.85,
  verified_field_intelligence: 0.75,
  verified_industry: 0.7,
  market_participant: 0.5,
  news_report: 0.4,
  unverified: 0.15,
  ai_interpretation: 0.1,
};

/* ----------------------------------------------------------------- status -- */

/**
 * The publication lifecycle.
 *
 * §13: *"Only eligible published evidence should appear in public
 * intelligence."* `isPubliclyVisible` is the single predicate that decides it,
 * so no surface has to re-derive the rule and get it wrong.
 */
export const EVIDENCE_STATUSES = [
  'draft',
  'under_review',
  'verified',
  'published',
  'correction_required',
  'rejected',
  'expired',
  'archived',
] as const;

export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

export const EVIDENCE_STATUS_LABELS: Record<EvidenceStatus, string> = {
  draft: 'Draft',
  under_review: 'Under review',
  verified: 'Verified',
  published: 'Published',
  correction_required: 'Correction required',
  rejected: 'Rejected',
  expired: 'Expired',
  archived: 'Archived',
};

/** The only statuses a public surface may read. */
export function isPubliclyVisible(status: EvidenceStatus): boolean {
  return status === 'published';
}

/* ----------------------------------------------------------- assessments -- */

/**
 * The directional assessment vocabulary.
 *
 * §14 is explicit that a platform must not *"force every commodity into one of
 * the three traditional classifications."* `insufficient_evidence` is therefore
 * a first-class result, not a failure state, and `mixed` exists so opposing
 * factors need not be averaged away.
 */
export const ASSESSMENT_BIASES = [
  'bullish',
  'bearish',
  'neutral',
  'mixed',
  'insufficient_evidence',
] as const;

export type AssessmentBias = (typeof ASSESSMENT_BIASES)[number];

export const ASSESSMENT_BIAS_LABELS: Record<AssessmentBias, string> = {
  bullish: 'Bullish',
  bearish: 'Bearish',
  neutral: 'Neutral',
  mixed: 'Mixed',
  insufficient_evidence: 'Insufficient evidence',
};

/**
 * The wording §14 requires accompany every assessment.
 *
 * A bias is a statement about documented fundamentals, not a price forecast.
 * This sentence is rendered with the assessment rather than buried in a
 * methodology page, because §14 forbids presenting a bias as a guaranteed
 * prediction.
 */
export const ASSESSMENT_DISCLAIMER =
  'Current documented fundamentals suggest directional price pressure, but the assessment ' +
  'remains subject to regional supply, demand and market conditions. It is not a price ' +
  'forecast and not a recommendation.';

/* -------------------------------------------------------- relationships -- */

/**
 * How a fundamental factor relates to a price movement.
 *
 * §15 is the sharpest rule in the brief: *"Never automatically classify a factor
 * as a direct cause simply because its date overlaps a price movement."* Date
 * overlap produces at most `temporal_association`. Anything stronger requires
 * documented impact evidence, which is a separate field on the relationship.
 */
export const RELATIONSHIP_TYPES = [
  'directly_documented_impact',
  'strong_contextual_relevance',
  'potential_transmission_mechanism',
  'temporal_association',
  'unconfirmed',
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  directly_documented_impact: 'Directly documented impact',
  strong_contextual_relevance: 'Strong contextual relevance',
  potential_transmission_mechanism: 'Potential transmission mechanism',
  temporal_association: 'Temporal association',
  unconfirmed: 'Unconfirmed relationship',
};

/** Shown wherever a relationship is rendered, per §15's event-overlay note. */
export const RELATIONSHIP_CAUSALITY_NOTE =
  'Temporal overlap is contextual, not proof of causality. A factor dated inside a price ' +
  'movement is associated with it, not established as its cause.';

/* ------------------------------------------------------------ freshness -- */

/**
 * Per-category freshness policy.
 *
 * §23: *"Weather forecasts, exchange rates, policy developments, production
 * statistics and seasonal calendars do not share the same update frequency. Do
 * not apply one global stale-data threshold."*
 *
 * A policy announcement is current for months; an FX rate is current for hours.
 * One threshold would call a valid policy stale and a day-old rate fresh.
 */
export type FundamentalCategory =
  | 'production'
  | 'supply'
  | 'demand'
  | 'weather'
  | 'trade_policy'
  | 'currency'
  | 'logistics'
  | 'government_intervention'
  | 'seasonality';

export interface FreshnessPolicy {
  /** How long a record of this category stays current, in hours. */
  maxAgeHours: number;
  /** Whether the record is a forecast, which expires rather than ages. */
  isForecast?: boolean;
  label: string;
}

export const FUNDAMENTAL_FRESHNESS_POLICY: Record<FundamentalCategory, FreshnessPolicy> = {
  // A daily FX rate is stale within a day.
  currency: { maxAgeHours: 24, label: 'Exchange rate' },
  // Weather forecasts expire; a 48-hour forecast is not stale, it is over.
  weather: { maxAgeHours: 48, isForecast: true, label: 'Weather' },
  // Freight rates move with fuel, on a weekly scale.
  logistics: { maxAgeHours: 168, label: 'Freight and logistics' },
  // Policy developments persist; a restriction is current until it is lifted.
  trade_policy: { maxAgeHours: 2160, label: 'Trade policy' },
  government_intervention: { maxAgeHours: 2160, label: 'Government intervention' },
  // Production statistics are periodic, not continuous.
  production: { maxAgeHours: 2160, label: 'Production' },
  // Supply and demand indicators are reported, on a roughly monthly cadence.
  supply: { maxAgeHours: 720, label: 'Supply' },
  demand: { maxAgeHours: 720, label: 'Demand' },
  // A seasonal calendar is valid for the season it describes.
  seasonality: { maxAgeHours: 8760, label: 'Seasonality' },
};

/* ----------------------------------------------------------- the record -- */

/**
 * One fundamental evidence record.
 *
 * The four timestamps are not interchangeable and all four are required by §13:
 *
 *  - `publishedAt` — when the source published it
 *  - `eventAt` — when the thing it describes happened, where known
 *  - `retrievedAt` — when the platform fetched it
 *  - `lastVerifiedAt` — when a human last checked it
 *
 * `originId` is the field that makes the confidence framework honest. §14:
 * *"Multiple articles repeating the same original announcement are not
 * independent evidence."* Ten news stories about one ministry announcement have
 * ten records and **one** origin, and the confidence framework counts one.
 */
export interface FundamentalEvidence {
  id: string;
  headline: string;
  description: string;
  category: FundamentalCategory;
  subcategory: string | null;

  /** Commodities this evidence bears on. Many-to-many per §20. */
  commodityIds: number[];
  /** Countries, then regions, then markets — the geographic hierarchy §6 wants. */
  countryIds: number[];
  regionIds: number[];
  marketIds: number[];

  /** Where it came from. */
  sourceName: string;
  sourceType: EvidenceClassification;
  sourceUrl: string | null;
  documentReference: string | null;

  /** The four timestamps. All four, not one. */
  publishedAt: string | null;
  eventAt: string | null;
  retrievedAt: string;
  lastVerifiedAt: string | null;

  /** Groups records that describe the same underlying announcement. */
  originId: string;

  status: EvidenceStatus;

  /** How the underlying figure was obtained. */
  measurementQuality: MeasurementQuality;

  /** The platform's own assessment, separate from `sourceType`. */
  reliability: ReliabilityAssessment;

  /** Records this one contradicts. Preserved, never silently dropped (§23). */
  contradicts: string[];

  /** A quantitative value, where the evidence carries one. */
  value: number | null;
  unit: string | null;

  author: string | null;
  reviewer: string | null;
  version: number;
}

export type MeasurementQuality = 'measured' | 'reported' | 'estimated' | 'unknown';

export const MEASUREMENT_QUALITY_WEIGHT: Record<MeasurementQuality, number> = {
  measured: 1.0,
  reported: 0.8,
  estimated: 0.45,
  unknown: 0.2,
};

/**
 * The platform's own judgement of a source's reliability for a given scope.
 *
 * This is deliberately separate from `sourceType`. A ministry press release is
 * `official_government`; whether it is reliable *for this commodity in this
 * state* is a judgement recorded here, by a human, with a reason.
 */
export interface ReliabilityAssessment {
  level: 'high' | 'moderate' | 'low' | 'unassessed';
  reason: string | null;
  assessedBy: string | null;
  assessedAt: string | null;
}

/** How well a record's scope matches the question being asked. */
export type ScopeRelevance = 'direct' | 'adjacent' | 'none';

export interface ScopeMatch {
  commodity: ScopeRelevance;
  geography: ScopeRelevance;
}

/* --------------------------------------------------------- assessments -- */

/** A directional assessment over a set of evidence. */
export interface FundamentalAssessment {
  id: string;
  commodityId: number;
  commodityName: string;

  /** Geographic scope, named rather than implied. */
  geographicScope: string;
  regionIds: number[];

  /** The horizon the assessment covers. */
  timeHorizon: string;

  bias: AssessmentBias;
  supportingEvidenceIds: string[];
  contradictoryEvidenceIds: string[];

  explanation: string;
  confidence: ConfidenceResult;

  assessedAt: string;
  assessor: string | null;
  reviewer: string | null;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  /** When the assessment should be revisited. */
  reviewBy: string | null;
}

/** The output of the confidence framework. */
export interface ConfidenceResult {
  level: 'high' | 'moderate' | 'low' | 'insufficient';
  /** 0–1, or null when the framework declines to score. */
  score: number | null;
  /** How many *distinct origins* support the assessment. Not a record count. */
  independentSourceCount: number;
  /** One line per factor, so the score can be argued with. */
  factors: ConfidenceFactor[];
  /** Why the level is what it is, in words. */
  reason: string;
}

export interface ConfidenceFactor {
  name: string;
  /** 0–1 contribution before weighting. */
  value: number;
  weight: number;
  note: string;
}

/* ---------------------------------------------------- price linkage -- */

/**
 * A link between a fundamental factor and a price movement.
 *
 * §15: the platform must never *"automatically classify a factor as a direct
 * cause simply because its date overlaps a price movement."* `relationshipType`
 * is therefore derived, and `directly_documented_impact` is reachable only when
 * `documentedImpact` is non-null.
 */
export interface PriceFundamentalLink {
  id: string;
  evidenceId: string;
  commodityId: number;
  regionIds: number[];
  marketIds: number[];

  /** The observation window the price movement covers. */
  periodStart: string;
  periodEnd: string;

  /** Set only when a source documents the impact, not merely the coincidence. */
  documentedImpact: string | null;

  relationshipType: RelationshipType;
  explanation: string;
  confidence: ConfidenceResult;
  reviewer: string | null;
  status: 'draft' | 'published';
}
