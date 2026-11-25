/**
 * Hatsi360 Markets — commodity intelligence.
 *
 * Phase 04 turns a commodity row into something a user can act on. The three
 * modules here are pure logic with no database or network access, so every rule
 * can be tested directly — including the rules about *refusing* to answer, which
 * are the ones that matter most.
 *
 *   readiness.ts — what the platform can honestly say about one commodity.
 *   resolve.ts   — matching a search term without guessing between crops.
 *   units.ts     — whether two units can be converted, and refusing when not.
 *
 * The database-backed queries live in `queries.ts` and are the only part that
 * touches Supabase, kept apart so the rules above stay testable without one.
 */

export {
  assessCommodityReadiness,
  describeReadiness,
  type ReadinessInput,
} from './readiness';

export {
  resolveCommodityTerm,
  normalise,
  isSearchable,
  type ResolveInput,
} from './resolve';

export { findConversion, unitsAreComparable, findUnitByCode } from './units';

export {
  MIN_MARKETS_FOR_COMPARISON,
  MIN_OBSERVATIONS_FOR_COMPARISON,
  MIN_OBSERVATIONS_FOR_GRADE_COMPARISON,
  MIN_OBSERVATIONS_FOR_HISTORY,
} from './types';

export type {
  CommodityReadiness,
  CommodityRecord,
  ConversionOutcome,
  GradeRecord,
  ResolutionKind,
  SynonymRecord,
  SynonymResolution,
  UnitRecord,
  VarietyRecord,
} from './types';
