/**
 * Hatsi360 Markets — fundamental-to-price relationship classification.
 *
 * Phase 07 §15 contains the sharpest rule in the entire brief:
 *
 *   *"Never automatically classify a factor as a direct cause simply because its
 *    date overlaps a price movement."*
 *
 * This file is that rule, made executable. Date overlap alone can only ever
 * produce `temporal_association`. Reaching `directly_documented_impact` requires
 * a separate, non-null `documentedImpact` — a source that states the impact, not
 * a source that merely sits inside the same window.
 *
 * The default is the weakest category. A caller who wants a stronger claim has
 * to supply the evidence for it, which is the correct direction of effort.
 */

import type { RelationshipType } from './types';

export interface RelationshipInput {
  /** When the fundamental event happened or was published. */
  eventAt: string | null;
  publishedAt: string | null;
  /** The price movement window. */
  periodStart: string;
  periodEnd: string;
  /**
   * A source statement that this factor *affected* the price, quoting or citing
   * the mechanism. Null when the only link is that the dates coincide.
   */
  documentedImpact: string | null;
  /**
   * Whether a documented transmission mechanism exists — e.g. an export
   * restriction removing supply from the market the price was observed in.
   * Distinct from `documentedImpact`, which asserts the effect happened.
   */
  hasTransmissionMechanism: boolean;
  /** Whether the evidence covers the same market or region as the price series. */
  sameMarket: boolean;
  sameRegion: boolean;
}

export interface RelationshipClassification {
  type: RelationshipType;
  /** Why this category and not a stronger one. */
  explanation: string;
  /** True when the only link is that the dates overlap. */
  isCausalClaim: boolean;
}

/**
 * Classify how a fundamental factor relates to a price movement.
 *
 * The ordering is deliberate and the guards are cumulative: each stronger
 * category requires everything the weaker one required, plus one more thing.
 */
export function classifyRelationship(input: RelationshipInput): RelationshipClassification {
  const overlaps = windowOverlaps(
    input.eventAt ?? input.publishedAt,
    input.periodStart,
    input.periodEnd,
  );

  // A factor dated outside the movement window is not even associated with it.
  if (!overlaps) {
    return {
      type: 'unconfirmed',
      explanation:
        'The factor falls outside the selected price movement window, so no relationship ' +
        'is asserted.',
      isCausalClaim: false,
    };
  }

  // The strongest category, and the only one that may assert cause. It requires
  // a source that documents the impact — never a date coincidence.
  if (input.documentedImpact) {
    return {
      type: 'directly_documented_impact',
      explanation:
        'A source documents the impact of this factor on the observed price. The documented ' +
        'mechanism, not the date overlap, is what supports this classification.',
      isCausalClaim: true,
    };
  }

  // Same market or region, plus a plausible mechanism, is strong context — still
  // not cause.
  if ((input.sameMarket || input.sameRegion) && input.hasTransmissionMechanism) {
    return {
      type: 'potential_transmission_mechanism',
      explanation:
        'The factor covers the same market or region as the price series and a documented ' +
        'transmission mechanism exists, but no source documents the effect on this price.',
      isCausalClaim: false,
    };
  }

  if (input.sameMarket || input.sameRegion) {
    return {
      type: 'strong_contextual_relevance',
      explanation:
        'The factor covers the same market or region as the price series and falls inside ' +
        'the movement window. This is context, not an established cause.',
      isCausalClaim: false,
    };
  }

  // The floor. This is what date overlap alone buys.
  return {
    type: 'temporal_association',
    explanation:
      'The factor is dated inside the price movement window. Temporal overlap is ' +
      'contextual, not proof of causality.',
    isCausalClaim: false,
  };
}

/**
 * Whether a timestamp falls inside a window, inclusive of both ends.
 *
 * A factor on the exact boundary day is treated as overlapping: an export
 * restriction announced on the morning a price was collected is plausibly
 * related to it, and excluding it would be arbitrary.
 */
export function windowOverlaps(
  at: string | null,
  periodStart: string,
  periodEnd: string,
): boolean {
  if (!at) return false;
  const t = new Date(at).getTime();
  const start = new Date(periodStart).getTime();
  const end = new Date(periodEnd).getTime();
  if (Number.isNaN(t) || Number.isNaN(start) || Number.isNaN(end)) return false;
  return t >= start && t <= end;
}

/**
 * The note that must accompany every rendered relationship.
 *
 * §15 requires it wherever event overlays are shown, because a marker on a chart
 * visually implies causation whether or not the label does.
 */
export const RELATIONSHIP_OVERLAY_NOTE =
  'Event markers show when a documented factor occurred. They do not show that the factor ' +
  'caused the price movement. Temporal overlap is contextual, not proof of causality.';
