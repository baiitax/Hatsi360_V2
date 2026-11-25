/**
 * Hatsi360 Markets — the centralized entitlement engine.
 *
 * Phase 10 §1: one engine, many products, one access policy. No module may
 * implement its own subscription logic; every protected capability resolves
 * through the registry and the policy evaluator defined here.
 *
 * The engine is pure. It has no database dependency, so every rule it enforces
 * can be tested without a session, and no authorization decision can be
 * influenced by where it runs.
 */

export {
  FEATURE_MODULES,
  FEATURE_CATEGORIES,
  METERING_TYPES,
  USAGE_UNITS,
  FEATURE_STATUSES,
  FEATURE_STATUS_LABELS,
  DENIAL_REASONS,
  DENIAL_REASON_LABELS,
  DENIAL_REMEDY,
  ACTIONS,
  isPurchasable,
  isOperational,
} from './types';

export type {
  FeatureModule,
  FeatureCategory,
  MeteringType,
  UsageUnit,
  FeatureStatus,
  FeatureDefinition,
  DefaultAccess,
  DenialReason,
  Action,
  EntitlementDecision,
} from './types';

export {
  FEATURE_REGISTRY,
  getFeature,
  isRegisteredFeature,
  listFeaturesByModule,
  listPurchasableFeatures,
  listOperationalFeatures,
  summariseRegistry,
} from './registry';

export type { RegistrySummary } from './registry';

export {
  POLICY_VERSION,
  evaluatePolicy,
  describeDenial,
} from './policy';

export type { PolicyContext } from './policy';

export {
  authorize,
  authorizeAlways,
  authorizeJob,
  httpStatusForDecision,
  retryAfterForDecision,
  apiDenialBody,
} from './authorize';

export type { ApiDenialBody } from './authorize';

export { useCapability, denialLabel } from './ui';
export type { UiCapability } from './ui';

export {
  buildPolicyContext,
  anonymousPolicyContext,
  systemPolicyContext,
} from './resolver';
export type { PrincipalFacts } from './resolver';

export {
  LEGACY_KEY_TO_FEATURE,
  legacyKeysToFeatures,
  featureToLegacyKey,
  apiTierToSubscriptionStatus,
} from './legacy';

export {
  UsageMeter,
  InMemoryUsageStore,
  allowanceRemains,
  remainingAllowance,
  isConcurrent,
  isPeriodic,
  billingPeriodFor,
  periodResetFor,
} from './usage';

export type {
  UsageStore,
  UsageLedgerEntry,
  UsageReservation,
  UsageStatus,
  UsageAllowance,
  MeteringRule,
  ReserveRequest,
  ReservationOutcome,
  ReservationFailureReason,
} from './usage';
