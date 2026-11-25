/**
 * Hatsi360 Markets — commodity intelligence domain model.
 *
 * Phase 04 turns a row in `commodities` into something a user can act on. The
 * hard part is not the happy path; it is that most of the fields a commodity
 * profile would like to show do not exist for most commodities, and the
 * platform's credibility depends on saying so rather than filling the gap.
 *
 * Every structure below therefore has an explicit way to be *absent*, and the
 * readiness assessment names each gap. A profile that shows "not recorded" is
 * trustworthy; one that shows a plausible-looking default is not.
 */

/** A commodity as the database holds it. */
export interface CommodityRecord {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  categoryId: number | null;
  categoryName: string | null;
  defaultGradeId: number | null;
  defaultVarietyId: number | null;
  isActive: boolean;
  freshnessWindowHours: number | null;
}

export interface GradeRecord {
  id: number;
  commodityId: number;
  varietyId: number | null;
  name: string;
  slug: string;
  description: string | null;
}

export interface VarietyRecord {
  id: number;
  commodityId: number;
  name: string;
  slug: string;
}

export interface SynonymRecord {
  commodityId: number;
  synonym: string;
}

/** A measurement unit, and how it relates to others in its dimension. */
export interface UnitRecord {
  id: number;
  code: string;
  name: string;
  pluralName: string | null;
  dimension: string;
  baseUnitId: number | null;
  baseFactor: number | null;
  isSpecific: boolean;
}

/* ------------------------------------------------------------- readiness -- */

/**
 * What the platform can honestly say about one commodity.
 *
 * `gaps` is the important field. It is a list of named, human-readable
 * deficiencies, and it is what the interface renders — so a user looking at a
 * thin commodity profile is told *which* things are missing rather than left to
 * assume the blanks are an oversight.
 */
export interface CommodityReadiness {
  commodityId: number;
  name: string;
  slug: string;

  /** Whether the commodity is the active record or an inactive duplicate. */
  isActive: boolean;

  /** Content completeness. */
  hasDescription: boolean;
  hasDefaultGrade: boolean;
  gradeCount: number;
  varietyCount: number;
  synonymCount: number;

  /** Observation coverage. */
  observationCount: number;
  publishedObservationCount: number;
  marketCount: number;
  unitCount: number;
  priceTypeCount: number;
  gradeUsedCount: number;

  /** Derived capabilities, each gated on the counts above. */
  canComparePrices: boolean;
  canShowGradeComparison: boolean;
  canShowHistory: boolean;
  canShowMarketComparison: boolean;

  /** Whether the counts behind this assessment are complete, or public-only. */
  countsAreComplete: boolean;

  /** A coarse label, for sorting and filtering. Never a score. */
  completeness: 'complete' | 'partial' | 'minimal';

  /** Named deficiencies, in the platform's own words. */
  gaps: string[];
}

/** How many observations a series needs before the brief's indicators exist. */
export const MIN_OBSERVATIONS_FOR_COMPARISON = 2;
export const MIN_OBSERVATIONS_FOR_GRADE_COMPARISON = 2;
export const MIN_MARKETS_FOR_COMPARISON = 2;
/** The Phase 05 brief's headline indicator is a 7-period moving average. */
export const MIN_OBSERVATIONS_FOR_HISTORY = 7;

/* -------------------------------------------------------------- synonyms -- */

export type ResolutionKind =
  | 'exact_slug'
  | 'exact_name'
  | 'unique_synonym'
  | 'ambiguous'
  | 'none';

export interface SynonymResolution {
  kind: ResolutionKind;
  commodityId: number | null;
  /** Populated when `kind` is `ambiguous`, so the interface can ask. */
  candidates: { commodityId: number; name: string; slug: string }[];
  /** What was matched, for showing the user how their term was read. */
  matchedTerm: string | null;
}

/* ----------------------------------------------------------- conversions -- */

export type ConversionOutcome =
  | { possible: true; factor: number; explanation: string }
  | { possible: false; reason: string };
