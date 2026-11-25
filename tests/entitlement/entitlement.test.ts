import { describe, it, expect } from 'vitest';

import {
  ACTIONS,
  DENIAL_REASONS,
  DENIAL_REMEDY,
  FEATURE_REGISTRY,
  FEATURE_STATUSES,
  getFeature,
  isOperational,
  isRegisteredFeature,
  listFeaturesByModule,
  listOperationalFeatures,
  listPurchasableFeatures,
  summariseRegistry,
  describeDenial,
  evaluatePolicy,
  POLICY_VERSION,
  type PolicyContext,
} from '@/lib/entitlement';

/**
 * Phase 10 §19 requires tests across identity, entitlements, security and
 * module behaviour. These are the engine's own tests: the registry's honesty,
 * the evaluator's order, and the twelve distinguished denials §7 demands.
 */

const PUBLIC_FEATURE = 'markets.latest_prices';
const AUTHENTICATED_FEATURE = 'alerts.create';
const ENTITLED_FEATURE = 'research.premium_reports';

/**
 * An entitled feature that has reached `available`.
 *
 * The allow-path tests need this because `research.premium_reports` is
 * deliberately `registered`: step 8 of §7's order blocks it with
 * `feature_unavailable` before usage is ever considered, which is the engine
 * behaving correctly and the reason an unimplemented feature cannot be used to
 * test the metering rules.
 */
const OPERATIONAL_ENTITLED_FEATURE = 'exports.observations';

/**
 * The key namespaces §4 names. `watchlists`, `alerts` and `notifications` are
 * separate namespaces that all belong to the `alerts` module, which is why the
 * prefix cannot simply be asserted equal to the module.
 */
const FEATURE_NAMESPACES = [
  'markets', 'commodities', 'analytics', 'trade', 'alerts', 'watchlists',
  'notifications', 'research', 'ai_analyst', 'exports', 'api', 'enterprise',
  'fundamentals',
];

/** A valid, entitled, unrestricted principal. The baseline for allow cases. */
function baseContext(overrides: Partial<PolicyContext> = {}): PolicyContext {
  return {
    principalId: 'user-1',
    accountStatus: 'active',
    organization: null,
    grantKeys: [],
    subscription: null,
    ...overrides,
  };
}

describe('the feature registry', () => {
  it('uses stable, module-qualified machine keys', () => {
    for (const feature of FEATURE_REGISTRY) {
      expect(feature.key).toMatch(/^[a-z_]+\.[a-z_]+$/);
      // §4: the key is the permanent identity. A dot-qualified key cannot be
      // confused with a display name or a tier label. The prefix is one of the
      // namespaces the brief names — note `watchlists.*` and `notifications.*`
      // sit inside the `alerts` module, so the prefix is a namespace, not a
      // module name.
      expect(FEATURE_NAMESPACES).toContain(feature.key.split('.')[0]);
    }
  });

  it('never issues the same key twice', () => {
    const keys = FEATURE_REGISTRY.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('resolves a feature by key and rejects an unknown one', () => {
    expect(getFeature(PUBLIC_FEATURE)?.module).toBe('markets');
    expect(getFeature('nope.nothing')).toBeUndefined();
    expect(isRegisteredFeature(PUBLIC_FEATURE)).toBe(true);
    expect(isRegisteredFeature('nope.nothing')).toBe(false);
  });

  it('distinguishes registered from available, as §4 requires', () => {
    // §4: "A key existing does not mean the entitlement is available."
    const summary = summariseRegistry();
    expect(summary.total).toBeGreaterThan(0);
    expect(summary.purchasable).toBeLessThan(summary.total);
    expect(summary.operational).toBeGreaterThanOrEqual(summary.purchasable);
  });

  it('only marks a feature purchasable when it is implemented and tested', () => {
    for (const feature of listPurchasableFeatures()) {
      expect(feature.status).toBe('available');
      expect(isOperational(feature)).toBe(true);
    }
  });

  it('records the six §4 statuses as a closed set', () => {
    expect([...FEATURE_STATUSES].sort()).toEqual(
      ['available', 'configured', 'enabled', 'implemented', 'registered', 'tested'].sort(),
    );
    for (const feature of FEATURE_REGISTRY) {
      expect(FEATURE_STATUSES).toContain(feature.status);
    }
  });

  it('gives every metered feature a unit, and every unmetered one none', () => {
    for (const feature of FEATURE_REGISTRY) {
      if (feature.metering === null) {
        expect(feature.unit).toBeNull();
      } else {
        expect(feature.unit).not.toBeNull();
      }
    }
  });

  it('covers every module the brief names', () => {
    const modules = new Set(FEATURE_REGISTRY.map((f) => f.module));
    for (const expected of [
      'markets',
      'commodities',
      'analytics',
      'trade',
      'alerts',
      'research',
      'ai_analyst',
      'exports',
      'api',
      'enterprise',
    ]) {
      expect(modules.has(expected as never)).toBe(true);
    }
  });

  it('lists features by module in registry order', () => {
    const markets = listFeaturesByModule('markets');
    expect(markets.length).toBeGreaterThan(0);
    expect(markets.every((f) => f.module === 'markets')).toBe(true);
  });

  it('counts operational features without counting placeholders', () => {
    expect(listOperationalFeatures().every(isOperational)).toBe(true);
    expect(listOperationalFeatures().some((f) => f.status === 'registered')).toBe(false);
  });
});

describe('the twelve denial reasons', () => {
  it('names all twelve §7 reasons exactly once', () => {
    expect(new Set(DENIAL_REASONS).size).toBe(DENIAL_REASONS.length);
    expect(DENIAL_REASONS).toContain('unauthenticated');
    expect(DENIAL_REASONS).toContain('unauthorized');
    expect(DENIAL_REASONS).toContain('feature_unavailable');
    expect(DENIAL_REASONS).toContain('not_in_plan');
    expect(DENIAL_REASONS).toContain('subscription_inactive');
    expect(DENIAL_REASONS).toContain('subscription_expired');
    expect(DENIAL_REASONS).toContain('usage_exhausted');
    expect(DENIAL_REASONS).toContain('organization_access_missing');
    expect(DENIAL_REASONS).toContain('geographic_restriction');
    expect(DENIAL_REASONS).toContain('resource_restriction');
    expect(DENIAL_REASONS).toContain('administrative_suspension');
    expect(DENIAL_REASONS).toContain('temporary_service_restriction');
  });

  it('gives every reason a customer-facing remedy', () => {
    for (const reason of DENIAL_REASONS) {
      expect(['sign_in', 'upgrade', 'wait', 'contact', 'none']).toContain(
        DENIAL_REMEDY[reason],
      );
    }
  });

  it('explains every denial in product language, not a variable name', () => {
    for (const reason of DENIAL_REASONS) {
      const text = describeDenial({
        allowed: false,
        feature: 'x.y',
        action: 'read',
        reasonCode: reason,
        evaluatedAt: 'now',
      });
      expect(text.length).toBeGreaterThan(10);
      expect(text).not.toMatch(/reasonCode|featureKey|undefined|null/);
    }
  });
});

describe('the evaluation order (§7)', () => {
  it('reports an unauthenticated caller before anything else', () => {
    const decision = evaluatePolicy(ENTITLED_FEATURE, 'read', baseContext({ principalId: null }));
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('unauthenticated');
    // §7: no generic denial. The reason must be the actionable one.
    expect(decision.reasonCode).not.toBe('not_in_plan');
  });

  it('reports a suspension even when the subscription is live', () => {
    // §8: a security restriction cannot be overridden by a plan entitlement.
    const decision = evaluatePolicy(
      ENTITLED_FEATURE,
      'read',
      baseContext({
        accountStatus: 'suspended',
        grantKeys: [ENTITLED_FEATURE],
        subscription: { status: 'active' },
      }),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('administrative_suspension');
  });

  it('reports a suspended account even when the feature is unavailable', () => {
    const decision = evaluatePolicy(
      'nope.nothing',
      'read',
      baseContext({ accountStatus: 'suspended' }),
    );
    expect(decision.reasonCode).toBe('administrative_suspension');
  });

  it('blocks a pending organization membership before checking the plan', () => {
    const decision = evaluatePolicy(
      ENTITLED_FEATURE,
      'read',
      baseContext({
        organization: { id: 'org-1', membershipStatus: 'pending', keys: [] },
        grantKeys: [ENTITLED_FEATURE],
      }),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('organization_access_missing');
  });

  it('checks an explicit resource permission after organization status', () => {
    const decision = evaluatePolicy(
      ENTITLED_FEATURE,
      'read',
      baseContext({ resourceAuthorized: false, grantKeys: [ENTITLED_FEATURE] }),
    );
    expect(decision.reasonCode).toBe('resource_restriction');
  });

  it('never lets a subscription grant an administrative permission', () => {
    // §10: a paid subscription must never grant administrative permissions.
    const decision = evaluatePolicy(
      ENTITLED_FEATURE,
      'publish',
      baseContext({
        grantKeys: [ENTITLED_FEATURE],
        subscription: { status: 'active' },
        rolePermitsAction: false,
      }),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('unauthorized');
  });

  it('allows a public feature without a grant or a subscription', () => {
    const decision = evaluatePolicy(PUBLIC_FEATURE, 'read', baseContext());
    expect(decision.allowed).toBe(true);
    expect(decision.reasonCode).toBe('allowed');
  });

  it('allows an authenticated feature to any valid principal', () => {
    const decision = evaluatePolicy(AUTHENTICATED_FEATURE, 'create', baseContext());
    expect(decision.allowed).toBe(true);
  });

  it('denies an entitled feature with no subscription, offering an upgrade', () => {
    const decision = evaluatePolicy(ENTITLED_FEATURE, 'read', baseContext());
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('not_in_plan');
    expect(decision.upgradeRequired).toBe(true);
  });

  it('distinguishes an expired subscription from an inactive one', () => {
    const expired = evaluatePolicy(
      ENTITLED_FEATURE,
      'read',
      baseContext({ subscription: { status: 'expired' } }),
    );
    const canceled = evaluatePolicy(
      ENTITLED_FEATURE,
      'read',
      baseContext({ subscription: { status: 'canceled' } }),
    );
    const pastDue = evaluatePolicy(
      ENTITLED_FEATURE,
      'read',
      baseContext({ subscription: { status: 'past_due' } }),
    );
    expect(expired.reasonCode).toBe('subscription_expired');
    expect(canceled.reasonCode).toBe('subscription_inactive');
    expect(pastDue.reasonCode).toBe('subscription_inactive');
    expect(expired.reasonCode).not.toBe(canceled.reasonCode);
  });

  it('allows an entitled feature once the grant and subscription are present', () => {
    const decision = evaluatePolicy(
      OPERATIONAL_ENTITLED_FEATURE,
      'read',
      baseContext({
        grantKeys: [OPERATIONAL_ENTITLED_FEATURE],
        subscription: { status: 'active' },
      }),
    );
    expect(decision.allowed).toBe(true);
    expect(decision.source).toBe('entitlement_grant');
  });

  it('names which source granted access', () => {
    // §8: "Explain which source granted access."
    const decision = evaluatePolicy(
      OPERATIONAL_ENTITLED_FEATURE,
      'read',
      baseContext({
        grantKeys: [OPERATIONAL_ENTITLED_FEATURE],
        grantSources: { [OPERATIONAL_ENTITLED_FEATURE]: 'promotional_grant' },
        subscription: { status: 'active' },
      }),
    );
    expect(decision.source).toBe('promotional_grant');
  });

  it('reports an unimplemented feature as unavailable rather than unaffordable', () => {
    // §4: telling a customer to upgrade for a capability that does not exist is
    // the failure this prevents.
    const decision = evaluatePolicy(
      'commodities.extended_history',
      'read',
      baseContext({
        grantKeys: ['commodities.extended_history'],
        subscription: { status: 'active' },
      }),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('feature_unavailable');
    expect(decision.upgradeRequired).toBeUndefined();
  });

  it('applies a geographic restriction to an otherwise entitled caller', () => {
    const decision = evaluatePolicy(
      OPERATIONAL_ENTITLED_FEATURE,
      'read',
      baseContext({
        grantKeys: [OPERATIONAL_ENTITLED_FEATURE],
        subscription: { status: 'active' },
        region: 'NG',
        featureRegions: ['GH'],
      }),
    );
    expect(decision.reasonCode).toBe('geographic_restriction');
  });

  it('reports a service-wide temporary restriction', () => {
    const decision = evaluatePolicy(
      OPERATIONAL_ENTITLED_FEATURE,
      'read',
      baseContext({
        grantKeys: [OPERATIONAL_ENTITLED_FEATURE],
        subscription: { status: 'active' },
        serviceRestriction: { until: '2026-12-01T00:00:00Z' },
      }),
    );
    expect(decision.reasonCode).toBe('temporary_service_restriction');
  });
});

describe('usage allowances (§10)', () => {
  const entitled = baseContext({
    grantKeys: [OPERATIONAL_ENTITLED_FEATURE],
    subscription: { status: 'active' },
  });

  it('reports remaining, used and limit on an allow', () => {
    const decision = evaluatePolicy(OPERATIONAL_ENTITLED_FEATURE, 'read', {
      ...entitled,
      usage: { used: 30, limit: 100, resetAt: '2026-12-01T00:00:00Z' },
    });
    expect(decision.allowed).toBe(true);
    expect(decision.limit).toBe(100);
    expect(decision.used).toBe(30);
    expect(decision.remaining).toBe(70);
    expect(decision.resetAt).toBe('2026-12-01T00:00:00Z');
  });

  it('denies with usage_exhausted once the allowance is spent', () => {
    const decision = evaluatePolicy(OPERATIONAL_ENTITLED_FEATURE, 'read', {
      ...entitled,
      usage: { used: 100, limit: 100, resetAt: '2026-12-01T00:00:00Z' },
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('usage_exhausted');
    expect(decision.remaining).toBe(0);
    expect(decision.upgradeRequired).toBe(true);
  });

  it('treats a null limit as unlimited, as §10 requires', () => {
    const decision = evaluatePolicy(OPERATIONAL_ENTITLED_FEATURE, 'read', {
      ...entitled,
      usage: { used: 10_000, limit: null },
    });
    expect(decision.allowed).toBe(true);
    expect(decision.limit).toBeUndefined();
  });

  it('does not report a negative remaining when usage overshoots', () => {
    // A concurrent burst can overshoot a limit; the reported remaining must not
    // be a negative number a customer would read as a credit.
    const decision = evaluatePolicy(OPERATIONAL_ENTITLED_FEATURE, 'read', {
      ...entitled,
      usage: { used: 140, limit: 100 },
    });
    expect(decision.allowed).toBe(false);
    expect(decision.remaining).toBe(0);
  });
});

describe('the decision envelope', () => {
  it('stamps every decision with a policy version and a timestamp', () => {
    const allowed = evaluatePolicy(PUBLIC_FEATURE, 'read', baseContext());
    const denied = evaluatePolicy(ENTITLED_FEATURE, 'read', baseContext());
    expect(allowed.policyVersion).toBe(POLICY_VERSION);
    expect(denied.policyVersion).toBe(POLICY_VERSION);
    expect(allowed.evaluatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(denied.evaluatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('echoes the feature and action it was asked about', () => {
    const decision = evaluatePolicy(ENTITLED_FEATURE, 'download', baseContext());
    expect(decision.feature).toBe(ENTITLED_FEATURE);
    expect(decision.action).toBe('download');
  });

  it('recognises every action §9 distinguishes', () => {
    for (const action of ACTIONS) {
      const decision = evaluatePolicy(PUBLIC_FEATURE, action, baseContext());
      expect(decision.action).toBe(action);
    }
    expect(ACTIONS).toContain('view');
    expect(ACTIONS).toContain('bulk_access');
    expect(ACTIONS).toContain('publish');
    expect(ACTIONS.length).toBeGreaterThan(10);
  });
});

describe('organization entitlements (§8)', () => {
  it('grants an org key to a member with an active membership', () => {
    const decision = evaluatePolicy(
      OPERATIONAL_ENTITLED_FEATURE,
      'read',
      baseContext({
        organization: {
          id: 'org-1',
          membershipStatus: 'active',
          keys: [OPERATIONAL_ENTITLED_FEATURE],
        },
        subscription: { status: 'active' },
      }),
    );
    expect(decision.allowed).toBe(true);
  });

  it('does not grant one organization key to a non-member', () => {
    // §8: enterprise entitlements must not leak between organizations.
    const decision = evaluatePolicy(
      OPERATIONAL_ENTITLED_FEATURE,
      'read',
      baseContext({
        organization: null,
        grantKeys: [],
        subscription: { status: 'active' },
      }),
    );
    expect(decision.allowed).toBe(false);
  });

  it('requires the membership itself to be active', () => {
    const decision = evaluatePolicy(
      OPERATIONAL_ENTITLED_FEATURE,
      'read',
      baseContext({
        organization: {
          id: 'org-1',
          membershipStatus: 'revoked',
          keys: [OPERATIONAL_ENTITLED_FEATURE],
        },
      }),
    );
    expect(decision.reasonCode).toBe('organization_access_missing');
  });
});

describe('revoked and expired grants (§8)', () => {
  it('gives no access when the grant is absent', () => {
    // §8: a revoked or expired grant gives no access. An absent key is exactly
    // that — the engine has no notion of a "remembered" entitlement.
    const decision = evaluatePolicy(
      ENTITLED_FEATURE,
      'read',
      baseContext({ grantKeys: [], subscription: { status: 'active' } }),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('not_in_plan');
  });

  it('still fails closed when the subscription is active but the grant is gone', () => {
    // A live subscription to a different plan is not an entitlement.
    const decision = evaluatePolicy(
      ENTITLED_FEATURE,
      'read',
      baseContext({ grantKeys: ['exports.observations'], subscription: { status: 'active' } }),
    );
    expect(decision.allowed).toBe(false);
  });
});
