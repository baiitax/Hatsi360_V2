/**
 * Hatsi360 Markets — unit conversion validation.
 *
 * Phase 04's discovery found that 56 of 58 price observations are recorded in
 * `bag` with no approved conversion to any weight unit. That matters because a
 * user comparing a maize price per bag against one per kilogram is comparing two
 * different things, and the difference is not visible in the numbers.
 *
 * `measurement_units` already models the answer: every unit belongs to a
 * `dimension` and may carry a `base_unit_id` plus a `base_factor` describing how
 * many base units it represents. So a conversion is possible when two units share
 * a dimension and both have a factor — and impossible otherwise.
 *
 * This module refuses rather than approximates. An unapproved conversion is the
 * one case where a plausible number is worse than no number, because the user
 * cannot tell it was invented.
 */

import type { ConversionOutcome, UnitRecord } from './types';

/** Units whose factor is missing cannot be converted, in either direction. */
function factorOf(unit: UnitRecord): number | null {
  if (unit.baseFactor === null || unit.baseFactor <= 0) return null;
  return Number(unit.baseFactor);
}

/**
 * Find a conversion from one unit to another.
 *
 * Same dimension and both factors present is the only path. Anything else
 * returns a reason, because the alternative — assuming 1 bag is 100 kg — is a
 * guess the platform has no basis for.
 */
export function findConversion(from: UnitRecord, to: UnitRecord): ConversionOutcome {
  if (from.id === to.id) {
    return { possible: true, factor: 1, explanation: 'Same unit.' };
  }

  if (from.dimension !== to.dimension) {
    return {
      possible: false,
      reason:
        `"${from.name}" measures ${from.dimension} and "${to.name}" measures ${to.dimension}. ` +
        'These are different kinds of quantity and cannot be converted into each other.',
    };
  }

  const fromFactor = factorOf(from);
  const toFactor = factorOf(to);

  if (fromFactor === null || toFactor === null) {
    const missing = fromFactor === null ? from : to;
    return {
      possible: false,
      reason:
        `No approved conversion factor is recorded for "${missing.name}", so a price in this ` +
        'unit cannot be converted. Recording a conversion is a deliberate, verified step, not ' +
        'something to assume.',
    };
  }

  // Both factors are expressed against the dimension's base unit, so the
  // conversion is a ratio of the two.
  const factor = fromFactor / toFactor;
  const explanation = describeConversion(from, to, fromFactor, toFactor);

  return { possible: true, factor: round(factor), explanation };
}

function describeConversion(
  from: UnitRecord,
  to: UnitRecord,
  fromFactor: number,
  toFactor: number,
): string {
  const base = `${from.name} and ${to.name} are both measured in ${from.dimension}. ` +
    `One ${from.name} is ${fromFactor} base unit(s) and one ${to.name} is ${toFactor} base ` +
    `unit(s), so the conversion factor is ${round(fromFactor / toFactor)}.`;
  return base;
}

/**
 * Whether two observations can be compared at all, unit-wise.
 *
 * Used by the comparison surfaces to decide whether to show a figure or an
 * explanation. It is the same question `areCompatible` answers in
 * `src/lib/trade/series.ts`; this one is asked at the unit level only.
 */
export function unitsAreComparable(a: UnitRecord, b: UnitRecord): boolean {
  return findConversion(a, b).possible;
}

/**
 * Find a unit by code, for resolving a user's chosen display unit.
 *
 * Codes are matched case-insensitively because they are typed by humans.
 */
export function findUnitByCode(code: string, units: UnitRecord[]): UnitRecord | null {
  const wanted = code.trim().toLowerCase();
  return units.find((unit) => unit.code.toLowerCase() === wanted) ?? null;
}

function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}
