import { describe, it, expect } from 'vitest';

import {
  LEGACY_KEY_TO_FEATURE,
  apiTierToSubscriptionStatus,
  featureToLegacyKey,
  legacyKeysToFeatures,
} from '@/lib/entitlement';

/**
 * §18 requires migration to map the old policy to the new one before replacing
 * it. These tests pin that map, because an inferred mapping would silently
 * decide what a customer's subscription means.
 */

describe('the legacy key map', () => {
  it('maps every legacy capability key to a decision, not to a guess', () => {
    // Each of the six existing keys must be accounted for. A key left
    // unaccounted for would be a silent change of meaning during migration.
    const legacyKeys = [
      'watchlists',
      'alerts',
      'exports',
      'reports',
      'api',
      'bulk',
    ] as const;

    for (const key of legacyKeys) {
      expect(LEGACY_KEY_TO_FEATURE).toHaveProperty(key);
      // Either a real registry key, or an explicit null. Never undefined.
      expect(LEGACY_KEY_TO_FEATURE[key] === null ||
        typeof LEGACY_KEY_TO_FEATURE[key] === 'string').toBe(true);
    }
  });

  it('preserves what a `reports` subscriber bought, rather than dropping it', () => {
    // The key maps to a registry feature that is registered but not yet
    // implemented. Mapping it to null would silently discard a paid
    // entitlement; mapping it to a live feature would grant something that
    // does not exist. The registry's `registered` status is what makes the
    // engine answer honestly.
    expect(LEGACY_KEY_TO_FEATURE.reports).toBe('research.premium_reports');
  });

  it('maps the capabilities that do exist to real registry keys', () => {
    expect(LEGACY_KEY_TO_FEATURE.watchlists).toBe('watchlists.create');
    expect(LEGACY_KEY_TO_FEATURE.alerts).toBe('alerts.create');
    expect(LEGACY_KEY_TO_FEATURE.exports).toBe('exports.observations');
    expect(LEGACY_KEY_TO_FEATURE.reports).toBe('research.premium_reports');
    expect(LEGACY_KEY_TO_FEATURE.api).toBe('api.access');
    expect(LEGACY_KEY_TO_FEATURE.bulk).toBe('exports.bulk');
  });

  it('round-trips a key back to its legacy name', () => {
    expect(featureToLegacyKey('watchlists.create')).toBe('watchlists');
    expect(featureToLegacyKey('exports.observations')).toBe('exports');
    expect(featureToLegacyKey('nope.nothing')).toBeNull();
  });

  it('never invents a key that was not recorded as true', () => {
    // Fail closed. A key recorded false, absent, or as a truthy non-boolean
    // grants nothing.
    expect(legacyKeysToFeatures({ alerts: false })).toEqual([]);
    expect(legacyKeysToFeatures({})).toEqual([]);
    expect(legacyKeysToFeatures({ alerts: 'yes' as never })).toEqual([]);
  });

  it('converts only the keys that are on', () => {
    expect(
      legacyKeysToFeatures({ watchlists: true, alerts: true, reports: true, bulk: false }),
    ).toEqual(['watchlists.create', 'alerts.create', 'research.premium_reports']);
  });

  it('drops an unmapped key rather than granting something unintended', () => {
    // A key with no central equivalent grants nothing through the map. The
    // registry's own status then decides what the customer is told.
    expect(legacyKeysToFeatures({ reports: true })).toEqual(['research.premium_reports']);
    expect(legacyKeysToFeatures({ not_a_key: true as never })).toEqual([]);
  });

  it('ignores an unknown legacy key rather than passing it through', () => {
    // A stale or fabricated key must not become a registry key by accident.
    expect(legacyKeysToFeatures({ super_admin: true as never })).toEqual([]);
  });
});

describe('the API tier mapping', () => {
  it('treats a paid tier as an active subscription', () => {
    expect(apiTierToSubscriptionStatus('standard')).toBe('active');
    expect(apiTierToSubscriptionStatus('enterprise')).toBe('active');
  });

  it('treats the free tier as no subscription at all', () => {
    // There is no free commercial plan configured, so treating `free` as an
    // active free plan would grant entitlements nobody has bought.
    expect(apiTierToSubscriptionStatus('free')).toBe('none');
    expect(apiTierToSubscriptionStatus(undefined)).toBe('none');
  });
});
