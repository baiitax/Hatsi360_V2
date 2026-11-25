/**
 * Hatsi360 Markets — commodity readiness assessment.
 *
 * Phase 04's job is to turn a commodity row into a profile. Most of the fields a
 * profile wants are missing for most commodities, so the first thing the platform
 * needs is an honest answer to "what can we actually say about this one?".
 *
 * This is pure logic. It takes counts and returns capabilities plus a list of
 * named gaps, so it can be tested without a database and so no interface has to
 * re-derive the thresholds and get them subtly wrong.
 *
 * The thresholds are not arbitrary. `MIN_OBSERVATIONS_FOR_HISTORY` is 7 because
 * Phase 05's headline indicator is a 7-period moving average, and a series with
 * fewer observations cannot produce one at all.
 */

import {
  MIN_MARKETS_FOR_COMPARISON,
  MIN_OBSERVATIONS_FOR_COMPARISON,
  MIN_OBSERVATIONS_FOR_GRADE_COMPARISON,
  MIN_OBSERVATIONS_FOR_HISTORY,
  type CommodityReadiness,
} from './types';

export interface ReadinessInput {
  commodityId: number;
  name: string;
  slug: string;
  isActive: boolean;
  /**
   * Whether `observationCount` reflects every observation recorded, or only the
   * ones this reader is permitted to see.
   *
   * This distinction is not cosmetic. `price_observations` is protected by RLS
   * that shows the public only rows passing `is_public_observation`, so a public
   * read cannot tell "nothing was ever recorded" from "recorded but not yet
   * published". Claiming the former from a public vantage point would state
   * something the platform cannot see.
   */
  countsAreComplete: boolean;
  hasDescription: boolean;
  hasDefaultGrade: boolean;
  gradeCount: number;
  varietyCount: number;
  synonymCount: number;
  observationCount: number;
  publishedObservationCount: number;
  marketCount: number;
  unitCount: number;
  priceTypeCount: number;
  gradeUsedCount: number;
}

/**
 * Assess what the platform can honestly claim about one commodity.
 *
 * Every capability is derived from a count that is actually measured, never
 * assumed. Every gap is named, so the interface can show the user which specific
 * things are missing.
 */
export function assessCommodityReadiness(input: ReadinessInput): CommodityReadiness {
  const gaps: string[] = [];

  if (!input.isActive) {
    gaps.push(
      'This commodity record is inactive. It is retained for historical references but is not ' +
        'part of the active catalogue.',
    );
  }
  if (!input.hasDescription) {
    gaps.push('No description has been recorded for this commodity.');
  }
  if (!input.hasDefaultGrade) {
    gaps.push(
      'No default grade is set, so a price shown without an explicit grade cannot be tied to a ' +
        'known quality level.',
    );
  }
  if (input.gradeCount === 0) {
    gaps.push('No grades are defined for this commodity.');
  }
  if (input.varietyCount === 0) {
    gaps.push('No varieties are recorded for this commodity.');
  }
  if (input.synonymCount === 0) {
    gaps.push(
      'No alternative names are recorded, so a search using a local trade name may not find it.',
    );
  }
  if (input.observationCount === 0 && input.countsAreComplete) {
    gaps.push('No price observations have been recorded for this commodity.');
  } else if (input.observationCount === 0) {
    gaps.push(
      'No published price observation is available for this commodity. A public read cannot ' +
        'see unpublished records, so this is a statement about what is available to you, not ' +
        'about whether anything has been collected.',
    );
  } else if (input.publishedObservationCount === 0) {
    gaps.push(
      `${input.observationCount} observation(s) are recorded but none are published, so no ` +
        'price can be shown publicly.',
    );
  }
  if (input.publishedObservationCount > 0 && input.publishedObservationCount < MIN_OBSERVATIONS_FOR_COMPARISON) {
    gaps.push(
      `Only ${input.publishedObservationCount} published observation(s) exist. Comparing a price ` +
        `against a previous one needs at least ${MIN_OBSERVATIONS_FOR_COMPARISON}.`,
    );
  }
  if (input.publishedObservationCount > 0 && input.marketCount < MIN_MARKETS_FOR_COMPARISON) {
    gaps.push(
      `Prices are recorded for ${input.marketCount} market(s). Comparing across markets needs at ` +
        `least ${MIN_MARKETS_FOR_COMPARISON}.`,
    );
  }
  if (input.gradeUsedCount < MIN_OBSERVATIONS_FOR_GRADE_COMPARISON && input.gradeCount >= MIN_OBSERVATIONS_FOR_GRADE_COMPARISON) {
    gaps.push(
      `${input.gradeCount} grades are defined but only ${input.gradeUsedCount} appear in recorded ` +
        'observations, so grades cannot be compared against each other.',
    );
  }
  if (input.publishedObservationCount > 0 && input.publishedObservationCount < MIN_OBSERVATIONS_FOR_HISTORY) {
    gaps.push(
      `Only ${input.publishedObservationCount} published observation(s) exist. The 7-period ` +
        'moving average and other historical indicators need at least ' +
        `${MIN_OBSERVATIONS_FOR_HISTORY}.`,
    );
  }

  const canComparePrices =
    input.publishedObservationCount >= MIN_OBSERVATIONS_FOR_COMPARISON && input.unitCount > 0;
  const canShowGradeComparison = input.gradeUsedCount >= MIN_OBSERVATIONS_FOR_GRADE_COMPARISON;
  const canShowHistory = input.publishedObservationCount >= MIN_OBSERVATIONS_FOR_HISTORY;
  const canShowMarketComparison =
    input.publishedObservationCount >= MIN_OBSERVATIONS_FOR_COMPARISON &&
    input.marketCount >= MIN_MARKETS_FOR_COMPARISON;

  return {
    commodityId: input.commodityId,
    name: input.name,
    slug: input.slug,
    isActive: input.isActive,
    hasDescription: input.hasDescription,
    hasDefaultGrade: input.hasDefaultGrade,
    gradeCount: input.gradeCount,
    varietyCount: input.varietyCount,
    synonymCount: input.synonymCount,
    observationCount: input.observationCount,
    publishedObservationCount: input.publishedObservationCount,
    marketCount: input.marketCount,
    unitCount: input.unitCount,
    priceTypeCount: input.priceTypeCount,
    gradeUsedCount: input.gradeUsedCount,
    canComparePrices,
    canShowGradeComparison,
    canShowHistory,
    canShowMarketComparison,
    countsAreComplete: input.countsAreComplete,
    completeness: completenessOf(input, gaps.length),
    gaps,
  };
}

/**
 * A coarse label for sorting and filtering.
 *
 * This is deliberately not a percentage. A "62% complete" commodity profile
 * implies a scale the platform has not defined, and invites the reader to treat
 * a thin profile as nearly finished rather than as missing most of what matters.
 */
function completenessOf(
  input: ReadinessInput,
  gapCount: number,
): CommodityReadiness['completeness'] {
  // Content that exists regardless of observations: description, a default
  // grade, and at least one alternative name.
  const contentPoints = [
    input.hasDescription,
    input.hasDefaultGrade,
    input.gradeCount > 0,
    input.synonymCount > 0,
  ].filter(Boolean).length;

  if (contentPoints === 4 && gapCount <= 1) return 'complete';
  if (contentPoints >= 2) return 'partial';
  return 'minimal';
}

/**
 * A one-line summary of a readiness result, for headers and list rows.
 *
 * It leads with what is available, because a commodity with no observations at
 * all should read as "no prices recorded yet" rather than as a broken page.
 */
export function describeReadiness(readiness: CommodityReadiness): string {
  if (readiness.publishedObservationCount === 0) {
    if (readiness.observationCount === 0) {
      return readiness.countsAreComplete
        ? 'No price observations have been recorded for this commodity yet.'
        : 'No published price observation is available for this commodity.';
    }
    return `${readiness.observationCount} observation(s) recorded, none published, so no price can be shown.`;
  }
  if (readiness.canShowHistory) {
    return `${readiness.publishedObservationCount} published observation(s) across ${readiness.marketCount} market(s).`;
  }
  if (readiness.canComparePrices) {
    return `${readiness.publishedObservationCount} published observation(s); not yet enough for historical indicators.`;
  }
  return `${readiness.publishedObservationCount} published observation(s); too few to compare.`;
}
