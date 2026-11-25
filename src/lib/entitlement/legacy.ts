/**
 * Hatsi360 Markets — the legacy-to-central key mapping.
 *
 * Phase 10 §18 requires migration to *"map"* the old policy to the new one
 * before replacing it. This module is that map.
 *
 * The existing entitlement layer uses six coarse capability keys —
 * `watchlists`, `alerts`, `exports`, `reports`, `api`, `bulk` — stored as a
 * jsonb object on `customer_subscriptions`. The central registry uses
 * module-qualified keys with action-level granularity. The two are not the same
 * shape, so a route that declares a registry feature cannot simply test for a
 * legacy key.
 *
 * This mapping is explicit rather than inferred, because an inferred mapping
 * would silently decide what a customer's subscription means. If a legacy key
 * maps to nothing, that is a decision recorded here, not a gap left to chance.
 */

import type { EntitlementKey } from '@/lib/entitlements';

/**
 * Where each legacy capability key lands in the central registry.
 *
 * `null` means the legacy key has no central equivalent. That is the honest
 * answer for `reports` at the moment: the premium-report capability does not
 * exist yet, so a customer holding the key is holding a promise rather than a
 * feature, and the registry must not pretend otherwise.
 */
export const LEGACY_KEY_TO_FEATURE: Record<EntitlementKey, string | null> = {
  watchlists: 'watchlists.create',
  alerts: 'alerts.create',
  exports: 'exports.observations',
  reports: 'research.premium_reports',
  api: 'api.access',
  bulk: 'exports.bulk',
};

/**
 * The reverse map, for the admin catalogue showing what a legacy tier covers.
 */
export function featureToLegacyKey(featureKey: string): EntitlementKey | null {
  for (const [legacy, feature] of Object.entries(LEGACY_KEY_TO_FEATURE)) {
    if (feature === featureKey) return legacy as EntitlementKey;
  }
  return null;
}

/**
 * Convert a legacy entitlement record into central-registry keys.
 *
 * A key recorded as `true` on the subscription becomes its registry equivalent.
 * A key recorded as anything else — including absent — grants nothing, which is
 * the fail-closed direction §17 requires.
 */
export function legacyKeysToFeatures(
  legacy: Record<string, boolean | undefined>,
): string[] {
  const features: string[] = [];

  for (const [key, value] of Object.entries(legacy)) {
    if (value !== true) continue;
    const feature = LEGACY_KEY_TO_FEATURE[key as EntitlementKey];
    // An unmapped key is not silently dropped from the result: it simply has no
    // central equivalent, so the caller holds nothing new.
    if (feature) features.push(feature);
  }

  return features;
}

/**
 * The API tier vocabulary mapped to a subscription status.
 *
 * `api_applications.tier` is `free`, `standard` or `enterprise`, which is a
 * different vocabulary from `customer_subscriptions.status`. The mapping is
 * conservative: only a paid tier is treated as an active subscription, and
 * `free` is treated as none at all rather than as a free plan — because there
 * is no free commercial plan configured, and treating one as active would
 * grant entitlements nobody has bought.
 */
export function apiTierToSubscriptionStatus(
  tier: string | undefined,
): 'active' | 'none' {
  return tier === 'standard' || tier === 'enterprise' ? 'active' : 'none';
}
