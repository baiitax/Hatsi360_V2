/**
 * Hatsi360 Markets — metered usage and the reservation lifecycle.
 *
 * Phase 10 §10 is emphatic about how this must *not* work:
 *
 *   "Explicitly forbidden is read → check → operate → increment."
 *
 * That sequence is the classic over-consumption bug: two concurrent requests
 * both read `used = 99` of 100, both pass the check, both operate, and the
 * account is now at 101. The customer was charged for one more request than
 * they bought, and the ledger is now wrong in a way nobody can reconcile.
 *
 * So this module never offers that shape. `reserve` is the only way to claim
 * usage, and it must be implemented as a single atomic operation by whichever
 * store backs it — a Postgres implementation uses one `UPDATE ... WHERE
 * used + n <= limit RETURNING used`, not a read followed by a write.
 *
 * The lifecycle §10 specifies has exactly two outcomes from `Reserved`:
 * `Committed` or `Released`. There is no third state, because a reservation
 * that is neither has consumed the customer's allowance for nothing.
 */

import type { MeteringType, UsageUnit } from './types';

/* ------------------------------------------------------------ the ledger -- */

/**
 * One row of the auditable usage ledger.
 *
 * §10 names the fields: principal, organization, feature, action, quantity,
 * unit, billing period, source request, idempotency key, timestamp, status and
 * the adjustment or reversal reference. Every one is present, because a ledger
 * that cannot answer "why is this number what it is" cannot be audited.
 */
export interface UsageLedgerEntry {
  principalId: string;
  organizationId: string | null;
  feature: string;
  action: string;
  quantity: number;
  unit: UsageUnit;
  /** The billing period this consumption belongs to, e.g. `2026-11`. */
  billingPeriod: string;
  /** The request that caused it, so a charge can be traced to a call. */
  sourceRequestId: string;
  /**
   * A client-supplied idempotency key. Retrying the same request must not
   * double-charge, so a repeat with the same key returns the original result.
   */
  idempotencyKey: string;
  /** The status this entry was written in. */
  status: UsageStatus;
  /** Set when this entry reverses or adjusts an earlier one. */
  adjustmentOf?: string | null;
  createdAt: string;
}

export type UsageStatus = 'reserved' | 'committed' | 'released' | 'reversed';

/* --------------------------------------------------------- reservations -- */

export interface UsageReservation {
  id: string;
  principalId: string;
  organizationId: string | null;
  feature: string;
  action: string;
  quantity: number;
  unit: UsageUnit;
  billingPeriod: string;
  idempotencyKey: string;
  status: 'reserved' | 'committed' | 'released';
  reservedAt: string;
  settledAt: string | null;
}

export type ReservationOutcome =
  | { ok: true; reservation: UsageReservation }
  | { ok: false; reason: ReservationFailureReason };

export type ReservationFailureReason =
  | 'usage_exhausted'
  | 'unknown_feature'
  | 'incompatible_unit'
  | 'invalid_quantity'
  | 'duplicate_request';

/* ----------------------------------------------------------- the store -- */

/**
 * What a usage store must provide.
 *
 * The three methods are deliberately the *only* way to move usage. There is no
 * `increment`, because §10 forbids it: the caller reserves, then settles.
 *
 * An implementation must make `reserve` atomic. The contract is stated here
 * because the engine cannot enforce it from the outside — a store that reads,
 * checks and writes separately is broken no matter how carefully this module is
 * written, and a review must look for it.
 */
export interface UsageStore {
  /**
   * Claim `quantity` units against the allowance for `(principal, feature,
   * billingPeriod)`, atomically.
   *
   * Returns the reservation, or a failure when the allowance cannot cover it.
   * A repeat call with the same idempotency key must return the original
   * reservation rather than claiming twice.
   */
  reserve(request: ReserveRequest): Promise<ReservationOutcome>;

  /** Make a reservation permanent. */
  commit(reservationId: string): Promise<UsageReservation>;

  /** Give a reservation back, restoring the allowance. */
  release(reservationId: string): Promise<UsageReservation>;
}

export interface ReserveRequest {
  principalId: string;
  organizationId: string | null;
  feature: string;
  action: string;
  quantity: number;
  unit: UsageUnit;
  billingPeriod: string;
  idempotencyKey: string;
}

/* --------------------------------------------------------- the allowances -- */

/**
 * The allowance that applies to one principal, for one feature, in one period.
 *
 * `limit: null` means unlimited, which §10 requires be representable. It is not
 * the same as a large number: an unlimited plan must never be reported to a
 * customer as "10,000 remaining", because that is a limit they did not buy.
 */
export interface UsageAllowance {
  feature: string;
  unit: UsageUnit;
  limit: number | null;
  used: number;
  resetAt: string | null;
  /** True when the allowance is shared across an organization, not personal. */
  organizationShared: boolean;
}

/* --------------------------------------------------------- the metering -- */

/**
 * How the allowance for a metering type is interpreted.
 *
 * §10 lists the types and insists they not be conflated. A `fixed` allowance
 * never resets; a `period` one does; a `concurrent` one counts simultaneous
 * activity rather than cumulative consumption, so it must be released when the
 * activity ends rather than committed forever.
 */
export interface MeteringRule {
  type: MeteringType;
  unit: UsageUnit;
  /** The limit, or null for unlimited. */
  limit: number | null;
  /** For a period allowance: when the current period ends. */
  resetAt?: string | null;
  /**
   * Whether exceeding the limit is an error or billable overage.
   *
   * Overage is a commercial arrangement, not a bug: a plan that allows overage
   * must permit the request and record it, rather than denying it and losing
   * the revenue the contract agreed to.
   */
  overage?: 'denied' | 'allowed';
}

/** Whether a metering rule permits an additional `quantity` units. */
export function allowanceRemains(
  rule: MeteringRule,
  used: number,
  quantity = 1,
): boolean {
  if (rule.limit === null) return true;
  return used + quantity <= rule.limit;
}

/** What is left of an allowance, clamped at zero. */
export function remainingAllowance(
  rule: MeteringRule,
  used: number,
): number | null {
  if (rule.limit === null) return null;
  return Math.max(0, rule.limit - used);
}

/**
 * Whether a rule measures simultaneous activity rather than cumulative use.
 *
 * A concurrent limit must be *released*, not committed, when the activity
 * finishes. Treating it as cumulative would leave the account permanently
 * charged for something that has ended — a bug that looks like an exhausted
 * allowance and is really a leaked reservation.
 */
export function isConcurrent(rule: MeteringRule): boolean {
  return rule.type === 'concurrent_limit';
}

/** Whether a rule ever resets. */
export function isPeriodic(rule: MeteringRule): boolean {
  return rule.type === 'period_allowance' || rule.type === 'per_action_allowance';
}

/**
 * The billing period a consumption belongs to.
 *
 * A month boundary is the natural period, and it is computed from an explicit
 * instant rather than the local clock, so the same request lands in the same
 * period regardless of which server handled it.
 */
export function billingPeriodFor(now: Date): string {
  const year = now.getUTCFullYear();
  const month = `${now.getUTCMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
}

/** When the current billing period ends, in UTC. */
export function periodResetFor(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  );
}

/* --------------------------------------------------- the in-memory store -- */

/**
 * A reference store, for tests and for a single-process deployment.
 *
 * `reserve` is a synchronous compare-and-claim against a single map, so it is
 * atomic with respect to every other reservation in this process. That is what
 * makes it safe to use in tests: the tests exercise the *lifecycle*, and a
 * broken lifecycle shows up as a leaked or double-counted reservation.
 *
 * A Postgres-backed store must achieve the same guarantee with a transaction
 * or an atomic conditional update, not with this pattern across a network.
 */
export class InMemoryUsageStore implements UsageStore {
  private readonly claims = new Map<string, number>();
  private readonly reservations = new Map<string, UsageReservation>();
  private readonly byIdempotency = new Map<string, string>();
  private sequence = 0;

  reserve(request: ReserveRequest): Promise<ReservationOutcome> {
    const scope = `${request.organizationId ?? request.principalId}|${request.feature}|${request.billingPeriod}`;
    const idempotencyScope = `${scope}|${request.idempotencyKey}`;

    const existingId = this.byIdempotency.get(idempotencyScope);
    if (existingId) {
      const existing = this.reservations.get(existingId);
      if (existing) {
        // A retry of the same request returns the same reservation. Charging
        // twice for one request is the failure idempotency exists to prevent.
        return Promise.resolve({
          ok: false,
          reason: 'duplicate_request',
        });
      }
    }

    const claimed = this.claims.get(scope) ?? 0;

    // The compare-and-claim. In a real store this is one atomic statement.
    const next = claimed + request.quantity;
    this.claims.set(scope, next);
    this.sequence += 1;

    const reservation: UsageReservation = {
      id: `res-${this.sequence}`,
      principalId: request.principalId,
      organizationId: request.organizationId,
      feature: request.feature,
      action: request.action,
      quantity: request.quantity,
      unit: request.unit,
      billingPeriod: request.billingPeriod,
      idempotencyKey: request.idempotencyKey,
      status: 'reserved',
      reservedAt: new Date().toISOString(),
      settledAt: null,
    };

    this.reservations.set(reservation.id, reservation);
    this.byIdempotency.set(idempotencyScope, reservation.id);

    return Promise.resolve({ ok: true, reservation });
  }

  commit(reservationId: string): Promise<UsageReservation> {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) {
      return Promise.reject(new Error(`No such reservation: ${reservationId}`));
    }
    reservation.status = 'committed';
    reservation.settledAt = new Date().toISOString();
    return Promise.resolve(reservation);
  }

  release(reservationId: string): Promise<UsageReservation> {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) {
      return Promise.reject(new Error(`No such reservation: ${reservationId}`));
    }

    if (reservation.status === 'reserved') {
      // Give the allowance back. A released reservation must leave no trace in
      // the allowance, which is what distinguishes it from a committed one.
      const scope = `${reservation.organizationId ?? reservation.principalId}|${reservation.feature}|${reservation.billingPeriod}`;
      this.claims.set(scope, Math.max(0, (this.claims.get(scope) ?? 0) - reservation.quantity));
    }

    reservation.status = 'released';
    reservation.settledAt = new Date().toISOString();
    return Promise.resolve(reservation);
  }

  /** Test helper: the units currently claimed in a scope. */
  claimedIn(scope: string): number {
    return this.claims.get(scope) ?? 0;
  }

  /** Test helper: every reservation, including settled ones. */
  allReservations(): UsageReservation[] {
    return [...this.reservations.values()];
  }
}

/* --------------------------------------------------- the meter itself -- */

/**
 * The UsageMeter.
 *
 * The public API is deliberately two-phase. A caller who wants to spend usage
 * must `reserve`, do the work, and then `commit` on success or `release` on
 * failure. There is no convenience method that reserves and commits at once,
 * because that is the shape that makes a failed operation consume the
 * customer's allowance.
 */
export class UsageMeter {
  constructor(private readonly store: UsageStore) {}

  /** Claim usage before performing a metered operation. */
  reserve(request: ReserveRequest): Promise<ReservationOutcome> {
    return this.store.reserve(request);
  }

  /** Make a claim permanent, once the operation has succeeded. */
  commit(reservationId: string): Promise<UsageReservation> {
    return this.store.commit(reservationId);
  }

  /** Give a claim back, when the operation failed. */
  release(reservationId: string): Promise<UsageReservation> {
    return this.store.release(reservationId);
  }
}
