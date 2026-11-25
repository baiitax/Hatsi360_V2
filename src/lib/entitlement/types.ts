/**
 * Hatsi360 Markets — the entitlement domain model.
 *
 * Phase 10 §4 requires a centralized feature registry in which *"do not expose
 * an entitlement as available merely because its key exists in the registry."*
 * That sentence is why `FeatureStatus` exists as six separate values rather
 * than a boolean: a key can be registered, configured, enabled, implemented,
 * tested and purchasable, and those are genuinely different states.
 *
 * A feature that is registered but not implemented must be distinguishable from
 * one that works. Otherwise the catalogue advertises capabilities the product
 * does not have, and a customer buys an entitlement to nothing.
 */

/* ------------------------------------------------------------- the modules -- */

/** Every Hatsi360 module the registry can describe. §13's integration matrix. */
export const FEATURE_MODULES = [
  'markets',
  'commodities',
  'analytics',
  'trade',
  'alerts',
  'fundamentals',
  'research',
  'ai_analyst',
  'exports',
  'api',
  'enterprise',
] as const;

export type FeatureModule = (typeof FEATURE_MODULES)[number];

export const FEATURE_CATEGORIES = [
  'data_access',
  'analysis',
  'intelligence',
  'personalization',
  'export',
  'integration',
  'support',
] as const;

export type FeatureCategory = (typeof FEATURE_CATEGORIES)[number];

/**
 * How a feature is measured when it is metered.
 *
 * §10: *"Never treat unrelated usage units as interchangeable."* An AI request,
 * an exported row and an API call are three different things, and a plan that
 * says "100 units" is a plan nobody can audit.
 */
export const METERING_TYPES = [
  'unlimited',
  'fixed_allowance',
  'period_allowance',
  'per_action_allowance',
  'organization_shared_allowance',
  'concurrent_limit',
  'one_time_allowance',
] as const;

export type MeteringType = (typeof METERING_TYPES)[number];

/** The unit a metered feature is counted in. */
export const USAGE_UNITS = [
  'requests',
  'tokens',
  'rows',
  'downloads',
  'api_requests_per_minute',
  'api_requests_per_month',
  'active_alerts',
  'watchlists',
  'bulk_operations',
] as const;

export type UsageUnit = (typeof USAGE_UNITS)[number];

/* ---------------------------------------------------------------- status -- */

/**
 * The six states §4 requires the registry to distinguish.
 *
 * The order matters: it is the lifecycle, and `isPurchasable` is the only one
 * that may be shown to a customer as something they can buy.
 */
export const FEATURE_STATUSES = [
  'registered',
  'configured',
  'enabled',
  'implemented',
  'tested',
  'available',
] as const;

export type FeatureStatus = (typeof FEATURE_STATUSES)[number];

export const FEATURE_STATUS_LABELS: Record<FeatureStatus, string> = {
  registered: 'Registered',
  configured: 'Configured',
  enabled: 'Enabled',
  implemented: 'Implemented',
  tested: 'Tested',
  available: 'Available for purchase',
};

/**
 * Who may use a feature with no entitlement at all.
 *
 * `public` means an anonymous visitor; `authenticated` means any signed-in
 * account; `entitled` means a grant is required.
 */
export type DefaultAccess = 'public' | 'authenticated' | 'entitled';

export interface FeatureDefinition {
  /** Stable machine-readable key. Never renamed once issued. */
  key: string;
  name: string;
  description: string;
  module: FeatureModule;
  category: FeatureCategory;
  /** Null when the feature is not metered. */
  metering: MeteringType | null;
  /** The unit a metered feature counts in. */
  unit: UsageUnit | null;
  defaultAccess: DefaultAccess;
  status: FeatureStatus;
  /** Free-form configuration the policy layer may read. */
  metadata?: Record<string, unknown>;
}

/**
 * A feature may only be sold when it has reached `available`.
 *
 * §4: *"Do not expose an entitlement as available merely because its key exists
 * in the registry."* A registered key is a placeholder; selling one would take
 * money for a capability the product does not have.
 */
export function isPurchasable(feature: FeatureDefinition): boolean {
  return feature.status === 'available';
}

/** Whether a feature works at all, as opposed to being planned. */
export function isOperational(feature: FeatureDefinition): boolean {
  return feature.status === 'implemented' || feature.status === 'tested' ||
    feature.status === 'available';
}

/* --------------------------------------------------------- the decision -- */

/**
 * The twelve denial reasons §7 requires be distinguished.
 *
 * *"Do not use one generic error for every denied request."* Each of these is a
 * different situation for the customer: one means sign in, one means upgrade,
 * one means wait for a reset, one means call an administrator. Collapsing them
 * into "forbidden" makes the product unusable and the support load enormous.
 */
export const DENIAL_REASONS = [
  'unauthenticated',
  'unauthorized',
  'feature_unavailable',
  'not_in_plan',
  'subscription_inactive',
  'subscription_expired',
  'usage_exhausted',
  'organization_access_missing',
  'geographic_restriction',
  'resource_restriction',
  'administrative_suspension',
  'temporary_service_restriction',
] as const;

export type DenialReason = (typeof DENIAL_REASONS)[number];

export const DENIAL_REASON_LABELS: Record<DenialReason, string> = {
  unauthenticated: 'Sign in to continue',
  unauthorized: 'Your account is not permitted to perform this action',
  feature_unavailable: 'This capability is not currently offered',
  not_in_plan: 'Your plan does not include this capability',
  subscription_inactive: 'Your subscription is not active',
  subscription_expired: 'Your subscription has expired',
  usage_exhausted: 'You have used your allowance for this period',
  organization_access_missing: 'Your organization does not have access',
  geographic_restriction: 'This capability is not available in your region',
  resource_restriction: 'You do not have access to this record',
  administrative_suspension: 'Access has been suspended by an administrator',
  temporary_service_restriction: 'This capability is temporarily unavailable',
};

/** Whether a denial can be resolved by the customer, and how. */
export const DENIAL_REMEDY: Record<DenialReason, 'sign_in' | 'upgrade' | 'wait' | 'contact' | 'none'> = {
  unauthenticated: 'sign_in',
  unauthorized: 'contact',
  feature_unavailable: 'none',
  not_in_plan: 'upgrade',
  subscription_inactive: 'upgrade',
  subscription_expired: 'upgrade',
  usage_exhausted: 'wait',
  organization_access_missing: 'contact',
  geographic_restriction: 'contact',
  resource_restriction: 'contact',
  administrative_suspension: 'contact',
  temporary_service_restriction: 'wait',
};

/** The actions §9 distinguishes. */
export const ACTIONS = [
  'view',
  'read',
  'search',
  'compare',
  'download',
  'export',
  'analyze',
  'create',
  'update',
  'delete',
  'publish',
  'manage',
  'bulk_access',
] as const;

export type Action = (typeof ACTIONS)[number];

/**
 * The structured decision §6 specifies.
 *
 * Every field is present on an allow and on a deny, so a caller never has to
 * branch on `allowed` to find out why. `policyVersion` exists so a decision can
 * be reproduced after the policy changes.
 */
export interface EntitlementDecision {
  allowed: boolean;
  feature: string;
  action: Action;
  reasonCode: DenialReason | 'allowed';
  /** Which source granted access, when one did. */
  source?: string;
  limit?: number;
  used?: number;
  remaining?: number;
  resetAt?: string;
  upgradeRequired?: boolean;
  evaluatedAt: string;
  policyVersion?: string;
}
