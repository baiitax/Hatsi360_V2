import { describe, it, expect } from 'vitest';

import {
  apiDenialBody,
  authorize,
  authorizeAlways,
  authorizeJob,
  httpStatusForDecision,
  retryAfterForDecision,
  type PolicyContext,
} from '@/lib/entitlement';

/**
 * The authorization helpers are where a `EntitlementDecision` becomes an HTTP
 * status, a JSON body, or a rendered prompt. §7's twelve distinguished reasons
 * only reach a customer if this mapping is right, so these tests pin it.
 */

const PUBLIC_FEATURE = 'markets.latest_prices';
const ENTITLED = 'exports.observations';

function context(overrides: Partial<PolicyContext> = {}): PolicyContext {
  return {
    principalId: 'user-1',
    accountStatus: 'active',
    organization: null,
    grantKeys: [],
    subscription: null,
    ...overrides,
  };
}

describe('the HTTP mapping', () => {
  it('returns 401 for an unauthenticated caller, not 403', () => {
    const decision = authorizeAlways(PUBLIC_FEATURE, 'read', context({ principalId: null }));
    expect(httpStatusForDecision(decision)).toBe(401);
  });

  it('returns 429 for an exhausted allowance so a client backs off', () => {
    const decision = authorizeAlways(
      ENTITLED,
      'export',
      context({
        grantKeys: [ENTITLED],
        subscription: { status: 'active' },
        usage: { used: 100, limit: 100, resetAt: '2099-01-01T00:00:00Z' },
      }),
    );
    expect(decision.reasonCode).toBe('usage_exhausted');
    expect(httpStatusForDecision(decision)).toBe(429);
  });

  it('returns 503 for a temporary service restriction', () => {
    const decision = authorizeAlways(
      PUBLIC_FEATURE,
      'read',
      context({ serviceRestriction: { until: '2099-01-01T00:00:00Z' } }),
    );
    expect(httpStatusForDecision(decision)).toBe(503);
  });

  it('returns 200 for an allow', () => {
    const decision = authorizeAlways(PUBLIC_FEATURE, 'read', context());
    expect(httpStatusForDecision(decision)).toBe(200);
  });

  it('computes a Retry-After only for a time-based denial', () => {
    const resetAt = new Date(Date.now() + 3_600_000).toISOString();
    const exhausted = authorizeAlways(
      ENTITLED,
      'export',
      context({
        grantKeys: [ENTITLED],
        subscription: { status: 'active' },
        usage: { used: 10, limit: 10, resetAt },
      }),
    );
    expect(retryAfterForDecision(exhausted)).toBeGreaterThan(0);
    expect(retryAfterForDecision(exhausted)).toBeLessThanOrEqual(3600);

    const notInPlan = authorizeAlways(ENTITLED, 'export', context());
    expect(retryAfterForDecision(notInPlan)).toBeNull();
  });
});

describe('the denial body (§16)', () => {
  it('carries the feature, action, reason and upgrade path', () => {
    const decision = authorizeAlways(ENTITLED, 'export', context());
    const body = apiDenialBody(decision);

    expect(body.error.code).toBe('not_in_plan');
    expect(body.error.feature).toBe(ENTITLED);
    expect(body.error.action).toBe('export');
    expect(body.error.message.length).toBeGreaterThan(10);
    expect(body.error.upgradeRequired).toBe(true);
  });

  it('carries the allowance on an exhausted period', () => {
    const decision = authorizeAlways(
      ENTITLED,
      'export',
      context({
        grantKeys: [ENTITLED],
        subscription: { status: 'active' },
        usage: { used: 500, limit: 500, resetAt: '2099-01-01T00:00:00Z' },
      }),
    );
    const body = apiDenialBody(decision);

    expect(body.error.code).toBe('usage_exhausted');
    expect(body.error.allowance).toEqual({
      limit: 500,
      used: 500,
      remaining: 0,
      resetAt: '2099-01-01T00:00:00Z',
    });
  });

  it('does not leak internal detail into the message', () => {
    // §16: "do not expose internal security details."
    for (const overrides of [
      { principalId: null },
      { accountStatus: 'suspended' as const },
      { resourceAuthorized: false },
      { rolePermitsAction: false },
    ]) {
      const body = apiDenialBody(authorizeAlways(ENTITLED, 'export', context(overrides)));
      expect(body.error.message).not.toMatch(/principalId|grantKeys|policyVersion|context/i);
      expect(body.error.code).not.toBe('allowed');
    }
  });

  it('omits the allowance when the feature is not metered', () => {
    const decision = authorizeAlways(ENTITLED, 'export', context());
    expect(apiDenialBody(decision).error.allowance).toBeUndefined();
  });
});

describe('the server-side helper', () => {
  it('returns null when access is granted', () => {
    expect(authorize(PUBLIC_FEATURE, 'read', context())).toBeNull();
  });

  it('returns the decision when access is refused', () => {
    const decision = authorize(ENTITLED, 'export', context());
    expect(decision).not.toBeNull();
    expect(decision?.allowed).toBe(false);
  });

  it('returns a decision on the allow path too, for auditing', () => {
    // §7 step 12: sensitive decisions are audited, including the allows.
    const decision = authorizeAlways(PUBLIC_FEATURE, 'read', context());
    expect(decision.allowed).toBe(true);
    expect(decision.policyVersion).toBeDefined();
    expect(decision.evaluatedAt).toBeDefined();
  });
});

describe('background-job authorization', () => {
  it('applies the same policy to a job as to a person', () => {
    const jobContext = context({
      principalId: 'system:price-refresh',
      grantKeys: [ENTITLED],
      subscription: { status: 'active' },
    });
    expect(authorizeJob(ENTITLED, 'export', jobContext).allowed).toBe(true);
  });

  it('refuses a job whose identity has no grant', () => {
    // A job must not inherit a user's entitlements by running as the system.
    const decision = authorizeJob(
      ENTITLED,
      'export',
      context({ principalId: 'system:price-refresh' }),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('not_in_plan');
  });

  it('refuses a job whose identity is suspended', () => {
    const decision = authorizeJob(
      ENTITLED,
      'export',
      context({
        principalId: 'system:price-refresh',
        accountStatus: 'suspended',
        grantKeys: [ENTITLED],
        subscription: { status: 'active' },
      }),
    );
    expect(decision.reasonCode).toBe('administrative_suspension');
  });
});
