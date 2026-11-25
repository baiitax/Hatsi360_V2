import { describe, it, expect } from 'vitest';

import {
  InMemoryUsageStore,
  UsageMeter,
  allowanceRemains,
  billingPeriodFor,
  isConcurrent,
  isPeriodic,
  remainingAllowance,
  periodResetFor,
  type MeteringRule,
  type ReserveRequest,
} from '@/lib/entitlement';

/**
 * Phase 10 §10 requires the reservation lifecycle be tested: reserved, released,
 * committed, concurrent, idempotent and reversed. These are those tests, and the
 * ones that matter most are the ones that would catch the forbidden
 * read → check → operate → increment pattern leaking back in.
 */

const PERIOD = '2026-11';

function request(overrides: Partial<ReserveRequest> = {}): ReserveRequest {
  return {
    principalId: 'user-1',
    organizationId: null,
    feature: 'exports.observations',
    action: 'export',
    quantity: 10,
    unit: 'rows',
    billingPeriod: PERIOD,
    idempotencyKey: 'req-1',
    ...overrides,
  };
}

const FIXED_RULE: MeteringRule = {
  type: 'fixed_allowance',
  unit: 'rows',
  limit: 100,
  overage: 'denied',
};

describe('the metering rules (§10)', () => {
  it('treats a null limit as unlimited, not as a large number', () => {
    const rule: MeteringRule = { type: 'unlimited', unit: 'rows', limit: null };
    expect(allowanceRemains(rule, 10_000_000, 10_000_000)).toBe(true);
    // A null limit must produce a null remaining, never a number the customer
    // could read as a quota they did not buy.
    expect(remainingAllowance(rule, 5)).toBeNull();
  });

  it('clamps a remaining allowance at zero rather than going negative', () => {
    expect(remainingAllowance(FIXED_RULE, 140)).toBe(0);
    expect(remainingAllowance(FIXED_RULE, 100)).toBe(0);
    expect(remainingAllowance(FIXED_RULE, 90)).toBe(10);
  });

  it('refuses a quantity that would exceed the limit', () => {
    expect(allowanceRemains(FIXED_RULE, 90, 10)).toBe(true);
    expect(allowanceRemains(FIXED_RULE, 95, 10)).toBe(false);
  });

  it('distinguishes a concurrent limit from a cumulative one', () => {
    const concurrent: MeteringRule = {
      type: 'concurrent_limit',
      unit: 'api_requests_per_minute',
      limit: 5,
    };
    const periodic: MeteringRule = {
      type: 'period_allowance',
      unit: 'requests',
      limit: 100,
      resetAt: '2026-12-01T00:00:00Z',
    };
    expect(isConcurrent(concurrent)).toBe(true);
    expect(isConcurrent(periodic)).toBe(false);
    expect(isPeriodic(periodic)).toBe(true);
    expect(isPeriodic(concurrent)).toBe(false);
  });

  it('derives a billing period and its reset from an explicit instant', () => {
    // Computed from the instant, not the local clock, so two servers agree.
    const now = new Date('2026-11-22T14:30:00Z');
    expect(billingPeriodFor(now)).toBe('2026-11');
    expect(periodResetFor(now).toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });

  it('rolls the period at a year boundary', () => {
    expect(billingPeriodFor(new Date('2026-12-31T23:59:59Z'))).toBe('2026-12');
    expect(periodResetFor(new Date('2026-12-31T23:59:59Z')).toISOString())
      .toBe('2027-01-01T00:00:00.000Z');
  });

  it('pads a single-digit month', () => {
    expect(billingPeriodFor(new Date('2026-03-04T00:00:00Z'))).toBe('2026-03');
  });
});

describe('the reservation lifecycle', () => {
  it('reserves, then commits', async () => {
    const store = new InMemoryUsageStore();
    const meter = new UsageMeter(store);

    const outcome = await meter.reserve(request());
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.reservation.status).toBe('reserved');
    expect(outcome.reservation.settledAt).toBeNull();

    const committed = await meter.commit(outcome.reservation.id);
    expect(committed.status).toBe('committed');
    expect(committed.settledAt).not.toBeNull();
  });

  it('releases a reservation and gives the allowance back', async () => {
    const store = new InMemoryUsageStore();
    const meter = new UsageMeter(store);

    const outcome = await meter.reserve(request());
    if (!outcome.ok) throw new Error('expected a reservation');

    const scope = `user-1|exports.observations|${PERIOD}`;
    expect(store.claimedIn(scope)).toBe(10);

    await meter.release(outcome.reservation.id);

    // The whole point of releasing: the allowance is restored, so a failed
    // operation must not consume the customer's quota.
    expect(store.claimedIn(scope)).toBe(0);
    expect(outcome.reservation.status).toBe('released');
  });

  it('leaves a committed reservation counted', async () => {
    const store = new InMemoryUsageStore();
    const meter = new UsageMeter(store);

    const outcome = await meter.reserve(request());
    if (!outcome.ok) throw new Error('expected a reservation');
    await meter.commit(outcome.reservation.id);

    const scope = `user-1|exports.observations|${PERIOD}`;
    expect(store.claimedIn(scope)).toBe(10);
  });

  it('does not double-release', async () => {
    const store = new InMemoryUsageStore();
    const meter = new UsageMeter(store);

    const outcome = await meter.reserve(request());
    if (!outcome.ok) throw new Error('expected a reservation');
    await meter.release(outcome.reservation.id);

    const scope = `user-1|exports.observations|${PERIOD}`;
    expect(store.claimedIn(scope)).toBe(0);

    // Releasing an already-released reservation must not subtract a second
    // time, which would hand the customer a credit.
    await meter.release(outcome.reservation.id);
    expect(store.claimedIn(scope)).toBe(0);
  });

  it('treats a retried request as a duplicate rather than a second charge', async () => {
    const store = new InMemoryUsageStore();
    const meter = new UsageMeter(store);

    const first = await meter.reserve(request());
    expect(first.ok).toBe(true);

    const second = await meter.reserve(request());
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason).toBe('duplicate_request');

    // Only one unit of consumption exists for one logical request.
    expect(store.claimedIn(`user-1|exports.observations|${PERIOD}`)).toBe(10);
    expect(store.allReservations()).toHaveLength(1);
  });

  it('separates reservations by billing period', async () => {
    const store = new InMemoryUsageStore();
    const meter = new UsageMeter(store);

    await meter.reserve(request({ idempotencyKey: 'a' }));
    await meter.reserve(request({ idempotencyKey: 'b', billingPeriod: '2026-12' }));

    expect(store.claimedIn(`user-1|exports.observations|${PERIOD}`)).toBe(10);
    expect(store.claimedIn('user-1|exports.observations|2026-12')).toBe(10);
  });

  it('separates reservations by principal', async () => {
    const store = new InMemoryUsageStore();
    const meter = new UsageMeter(store);

    await meter.reserve(request({ idempotencyKey: 'a', principalId: 'user-1' }));
    await meter.reserve(request({ idempotencyKey: 'a', principalId: 'user-2' }));

    // Two accounts, two allowances. One customer's usage is never another's.
    expect(store.claimedIn(`user-1|exports.observations|${PERIOD}`)).toBe(10);
    expect(store.claimedIn(`user-2|exports.observations|${PERIOD}`)).toBe(10);
  });

  it('scopes an organization allowance to the organization, not the member', async () => {
    const store = new InMemoryUsageStore();
    const meter = new UsageMeter(store);

    await meter.reserve(
      request({ idempotencyKey: 'a', principalId: 'user-1', organizationId: 'org-1' }),
    );
    await meter.reserve(
      request({ idempotencyKey: 'b', principalId: 'user-2', organizationId: 'org-1' }),
    );
    await meter.reserve(
      request({ idempotencyKey: 'c', principalId: 'user-3', organizationId: 'org-2' }),
    );

    // §8: an organization's shared allowance is consumed by its members
    // together, and another organization's consumption is not their own.
    expect(store.claimedIn(`org-1|exports.observations|${PERIOD}`)).toBe(20);
    expect(store.claimedIn(`org-2|exports.observations|${PERIOD}`)).toBe(10);
    expect(store.claimedIn(`user-1|exports.observations|${PERIOD}`)).toBe(0);
  });

  it('keeps separate features on separate allowances', async () => {
    const store = new InMemoryUsageStore();
    const meter = new UsageMeter(store);

    await meter.reserve(request({ idempotencyKey: 'a' }));
    await meter.reserve(
      request({ idempotencyKey: 'b', feature: 'research.download', unit: 'downloads' }),
    );

    // §10: "Never treat unrelated usage units as interchangeable." Rows and
    // downloads are different things and are counted apart.
    expect(store.claimedIn(`user-1|exports.observations|${PERIOD}`)).toBe(10);
    expect(store.claimedIn(`user-1|research.download|${PERIOD}`)).toBe(10);
  });
});

describe('concurrency', () => {
  it('accounts for concurrent reservations without losing any', async () => {
    // The forbidden pattern — read, check, operate, increment — lets N
    // concurrent requests each pass the same check. Here the claim itself is
    // the atomic step, so every request is counted exactly once.
    const store = new InMemoryUsageStore();
    const meter = new UsageMeter(store);

    const outcomes = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        meter.reserve(request({ idempotencyKey: `req-${i}`, quantity: 1 })),
      ),
    );

    expect(outcomes.every((o) => o.ok)).toBe(true);
    expect(store.claimedIn(`user-1|exports.observations|${PERIOD}`)).toBe(50);
    expect(store.allReservations()).toHaveLength(50);
  });

  it('leaves a partial burst consistent when some requests release', async () => {
    const store = new InMemoryUsageStore();
    const meter = new UsageMeter(store);

    const outcomes = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        meter.reserve(request({ idempotencyKey: `req-${i}`, quantity: 1 })),
      ),
    );

    const ids = outcomes.flatMap((o) => (o.ok ? [o.reservation.id] : []));
    // Half the work fails; each failure releases its own claim.
    await Promise.all(ids.slice(0, 10).map((id) => meter.release(id)));

    expect(store.claimedIn(`user-1|exports.observations|${PERIOD}`)).toBe(10);
    expect(store.allReservations().filter((r) => r.status === 'released')).toHaveLength(10);
  });
});
