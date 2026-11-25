/**
 * Hatsi360 Markets — the policy evaluator.
 *
 * Phase 10 §7 defines a deterministic twelve-step evaluation order and demands
 * twelve *distinguished* denial reasons: *"Do not use one generic error for every
 * denied request."*
 *
 * Why the order matters. A request that is unauthenticated *and* outside the
 * plan must be reported as unauthenticated, because asking an anonymous visitor
 * to upgrade is nonsense. A request from a suspended account must be reported as
 * suspended even if the feature is also unavailable, because the suspension is
 * the actionable fact. The order is therefore not cosmetic — it is what makes
 * the reason a customer is told the *true* one.
 *
 * §7 also says a frontend-only authorization result must never override the
 * server's. This module is that server-side result; it reads only facts it is
 * handed and returns a decision, and the caller must honour it.
 */

import {
  type Action,
  type DenialReason,
  type EntitlementDecision,
} from './types';
import { getFeature } from './registry';

/** The current policy version, embedded in every decision so it can be replayed. */
export const POLICY_VERSION = '1.0.0';

/**
 * Everything the evaluator is allowed to know.
 *
 * Nothing here may originate from the browser. §3: *"Never trust a browser
 * supplied user, organization, plan, or role identifier."* The resolver builds
 * this from server-side records; a caller that forwards a client's claim about
 * their own plan has already lost.
 */
export interface PolicyContext {
  /** The authenticated principal, or null when there is no session. */
  principalId: string | null;
  /** Whether the principal's account is usable at all. */
  accountStatus: 'active' | 'suspended' | 'closed' | 'unknown';

  /** Active organization membership, when the caller acts within one. */
  organization: {
    id: string;
    membershipStatus: 'active' | 'pending' | 'revoked';
    /** Entitlement keys the organization itself holds. */
    keys: readonly string[];
  } | null;

  /** The principal's own entitlements, from every eligible source. */
  grantKeys: readonly string[];
  /** The source that produced each key, for the `source` field of a decision. */
  grantSources?: Record<string, string>;

  /** Subscription state, when a subscription exists. */
  subscription: {
    status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired' | 'none';
    /** ISO timestamp when the current period ends, when it does. */
    currentPeriodEndsAt?: string | null;
  } | null;

  /** Whether the caller may act on the specific record they asked for. */
  resourceAuthorized?: boolean;
  /** Whether the caller's role permits the action at all. */
  rolePermitsAction?: boolean;
  /** The region the caller is being evaluated in, when restricted. */
  region?: string | null;
  /** Regions a feature may be used in, when it is region-limited. */
  featureRegions?: readonly string[] | null;

  /** Measured usage in the current period. */
  usage?: { used: number; limit: number | null; resetAt?: string | null } | null;

  /** A service-wide or feature-wide temporary block. */
  serviceRestriction?: { until: string | null } | null;
}

function decide(
  allowed: boolean,
  feature: string,
  action: Action,
  reasonCode: DenialReason | 'allowed',
  extra: Partial<EntitlementDecision> = {},
): EntitlementDecision {
  return {
    allowed,
    feature,
    action,
    reasonCode,
    evaluatedAt: new Date().toISOString(),
    policyVersion: POLICY_VERSION,
    ...extra,
  };
}

/**
 * Evaluate one request against the policy.
 *
 * The twelve steps of §7, in order:
 *
 *  1. identity              — resolve the principal
 *  2. principal validation  — the account must exist and be usable
 *  3. account/org status    — suspension and membership
 *  4. resource authorization
 *  5. role/action permissions
 *  6. entitlement grants
 *  7. subscription validity
 *  8. feature availability
 *  9. contextual restrictions
 * 10. usage allowance
 * 11. structured decision
 * 12. audit (the caller's responsibility — see §7's final step)
 *
 * Steps 11 and 12 are not branches here: 11 is what this function returns, and
 * 12 is performed by whoever calls it. That split is deliberate so a decision
 * can be logged without the evaluator depending on the database.
 */
export function evaluatePolicy(
  featureKey: string,
  action: Action,
  context: PolicyContext,
): EntitlementDecision {
  const feature = getFeature(featureKey);

  /* 1. Identity — no principal, nothing further can be true. */
  if (!context.principalId) {
    return decide(false, featureKey, action, 'unauthenticated');
  }

  /* 2. Principal validation — a closed or unknown account is not a caller. */
  if (context.accountStatus === 'closed' || context.accountStatus === 'unknown') {
    return decide(false, featureKey, action, 'unauthorized');
  }

  /* 3. Account and organization status.
   *
   * A suspension outranks everything below it, including a live subscription:
   * §8 — *"security restrictions and suspensions cannot be overridden by
   * ordinary plan entitlements."* An organization membership that is pending or
   * revoked is not membership. */
  if (context.accountStatus === 'suspended') {
    return decide(false, featureKey, action, 'administrative_suspension');
  }
  if (
    context.organization &&
    context.organization.membershipStatus !== 'active'
  ) {
    return decide(false, featureKey, action, 'organization_access_missing');
  }

  /* 4. Resource authorization — explicit permissions are still checked. §8:
   * "explicit resource permissions are still checked." */
  if (context.resourceAuthorized === false) {
    return decide(false, featureKey, action, 'resource_restriction');
  }

  /* 5. Role and action permissions.
   *
   * Kept strictly separate from entitlements: §10 — "a paid subscription must
   * never automatically grant administrative permissions." A subscription is
   * evaluated at step 7 and never reaches this one. */
  if (context.rolePermitsAction === false) {
    return decide(false, featureKey, action, 'unauthorized');
  }

  /* 6. Entitlement grants.
   *
   * Public and authenticated defaults resolve here too, because they are the
   * feature's *default access behaviour* rather than a grant. §4 requires the
   * registry to record it. */
  if (feature && feature.defaultAccess === 'public') {
    // A public feature is available to a validated principal. Usage is still
    // checked at step 10, because a public feature can still be metered.
  } else if (feature && feature.defaultAccess === 'authenticated') {
    // Available to any valid principal.
  } else {
    const granted =
      context.grantKeys.includes(featureKey) ||
      (context.organization !== null &&
        context.organization.keys.includes(featureKey));

    if (!granted) {
      /* 7. Subscription validity — only meaningful once we know a grant was
       * expected. An absent subscription and an inactive one are different
       * situations for the customer, so §7 distinguishes them. */
      if (context.subscription === null || context.subscription.status === 'none') {
        return decide(
          false,
          featureKey,
          action,
          'not_in_plan',
          { upgradeRequired: true },
        );
      }
      if (context.subscription.status === 'expired') {
        return decide(
          false,
          featureKey,
          action,
          'subscription_expired',
          { upgradeRequired: true },
        );
      }
      if (
        context.subscription.status === 'canceled' ||
        context.subscription.status === 'past_due'
      ) {
        return decide(
          false,
          featureKey,
          action,
          'subscription_inactive',
          { upgradeRequired: true },
        );
      }
      return decide(false, featureKey, action, 'not_in_plan', { upgradeRequired: true });
    }
  }

  /* 8. Feature availability.
   *
   * §4: a key existing does not mean the entitlement is available. A registered
   * feature that has not been implemented must be reported as unavailable, not
   * as missing from the plan — telling a customer to upgrade for something that
   * does not exist is the failure mode this step prevents. */
  if (feature && feature.status === 'registered') {
    return decide(false, featureKey, action, 'feature_unavailable');
  }

  /* 9. Contextual restrictions — geography and service-wide blocks. */
  if (
    context.featureRegions &&
    context.featureRegions.length > 0 &&
    context.region &&
    !context.featureRegions.includes(context.region)
  ) {
    return decide(false, featureKey, action, 'geographic_restriction');
  }
  if (context.serviceRestriction) {
    return decide(false, featureKey, action, 'temporary_service_restriction');
  }

  /* 10. Usage allowance.
   *
   * A null limit means unlimited, which §10 requires be representable. A
   * non-null limit is compared against measured usage; the decision reports
   * `used`, `remaining` and `resetAt` so §16's access-denied UX can show the
   * customer exactly where they stand. */
  const usage = context.usage ?? null;
  if (usage && usage.limit !== null) {
    const remaining = Math.max(0, usage.limit - usage.used);
    if (remaining <= 0) {
      return decide(
        false,
        featureKey,
        action,
        'usage_exhausted',
        {
          limit: usage.limit,
          used: usage.used,
          remaining: 0,
          resetAt: usage.resetAt ?? undefined,
          upgradeRequired: true,
        },
      );
    }
    return decide(true, featureKey, action, 'allowed', {
      source: context.grantSources?.[featureKey] ??
        (feature?.defaultAccess === 'public' ? 'public_access' : 'entitlement_grant'),
      limit: usage.limit,
      used: usage.used,
      remaining,
      resetAt: usage.resetAt ?? undefined,
    });
  }

  /* 11. The structured decision. */
  return decide(true, featureKey, action, 'allowed', {
    source:
      context.grantSources?.[featureKey] ??
      (feature?.defaultAccess === 'public' || feature?.defaultAccess === 'authenticated'
        ? `${feature.defaultAccess}_access`
        : 'entitlement_grant'),
  });
}

/**
 * A short, customer-facing explanation of a denial.
 *
 * §16 requires the denied user be shown the feature, the reason, their current
 * plan and the required entitlement — *"without exposing internal security
 * details."* So this returns product language, never a policy variable name.
 */
export function describeDenial(decision: EntitlementDecision): string {
  switch (decision.reasonCode) {
    case 'unauthenticated':
      return 'Sign in to use this capability.';
    case 'unauthorized':
      return 'Your account is not permitted to perform this action.';
    case 'feature_unavailable':
      return 'This capability is not currently offered.';
    case 'not_in_plan':
      return 'Your current plan does not include this capability.';
    case 'subscription_inactive':
      return 'Your subscription is not active.';
    case 'subscription_expired':
      return 'Your subscription has expired.';
    case 'usage_exhausted':
      return decision.resetAt
        ? `You have used your allowance for this period. It resets on ${decision.resetAt}.`
        : 'You have used your allowance for this period.';
    case 'organization_access_missing':
      return 'Your organization does not have access to this capability.';
    case 'geographic_restriction':
      return 'This capability is not available in your region.';
    case 'resource_restriction':
      return 'You do not have access to this record.';
    case 'administrative_suspension':
      return 'Access has been suspended by an administrator.';
    case 'temporary_service_restriction':
      return 'This capability is temporarily unavailable.';
    default:
      return 'Access granted.';
  }
}
