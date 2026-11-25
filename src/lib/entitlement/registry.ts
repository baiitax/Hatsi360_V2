/**
 * Hatsi360 Markets — the central FeatureRegistry.
 *
 * Phase 10 §4: one registry of stable machine keys, each carrying a display
 * name, description, module, category, metering type, default access behaviour,
 * availability status, commercial availability and configuration metadata.
 *
 * The critical rule is §4's closing line: *"A key existing does not mean the
 * entitlement is available."* Every entry below therefore declares an honest
 * status, and `available` is reserved for a capability that is implemented,
 * tested and genuinely purchasable. Anything else is registered or configured,
 * and the catalogue will say so rather than imply a customer can buy it.
 */

import {
  FEATURE_MODULES,
  type FeatureDefinition,
  type FeatureModule,
  isOperational,
  isPurchasable,
} from './types';

/**
 * The registry.
 *
 * Ordered by module so the catalogue reads as a product surface rather than an
 * alphabet soup. Keys are permanent: renaming a key would silently revoke every
 * grant already recorded against it.
 */
export const FEATURE_REGISTRY: readonly FeatureDefinition[] = [
  /* ----------------------------------------------------------- markets -- */
  {
    key: 'markets.latest_prices',
    name: 'Latest market prices',
    description: 'The most recent published price observation for each market.',
    module: 'markets',
    category: 'data_access',
    metering: null,
    unit: null,
    defaultAccess: 'public',
    status: 'available',
  },
  {
    key: 'markets.dashboard',
    name: 'Market dashboard',
    description: 'The market overview page with movements and freshness.',
    module: 'markets',
    category: 'data_access',
    metering: null,
    unit: null,
    defaultAccess: 'public',
    status: 'available',
  },

  /* ------------------------------------------------------ commodities -- */
  {
    key: 'commodities.directory',
    name: 'Commodity directory',
    description: 'The commodity catalogue with grades, varieties and readiness.',
    module: 'commodities',
    category: 'data_access',
    metering: null,
    unit: null,
    defaultAccess: 'public',
    status: 'available',
  },
  {
    key: 'commodities.history',
    name: 'Commodity price history',
    description: 'The historical observation series for a commodity.',
    module: 'commodities',
    category: 'data_access',
    metering: null,
    unit: null,
    defaultAccess: 'public',
    status: 'available',
  },
  {
    key: 'commodities.extended_history',
    name: 'Extended price history',
    description: 'Price history beyond the public window, including long series.',
    module: 'commodities',
    category: 'data_access',
    metering: null,
    unit: null,
    defaultAccess: 'entitled',
    status: 'registered',
  },

  /* -------------------------------------------------------- analytics -- */
  {
    key: 'analytics.technical_indicators',
    name: 'Technical indicators',
    description: 'Moving averages, momentum and derived series analytics.',
    module: 'analytics',
    category: 'analysis',
    metering: null,
    unit: null,
    defaultAccess: 'entitled',
    status: 'registered',
  },
  {
    key: 'analytics.advanced_comparison',
    name: 'Advanced comparison',
    description: 'Multi-commodity and multi-market comparison tools.',
    module: 'analytics',
    category: 'analysis',
    metering: null,
    unit: null,
    defaultAccess: 'entitled',
    status: 'registered',
  },

  /* ------------------------------------------------------------ trade -- */
  {
    key: 'trade.opportunities',
    name: 'Trade opportunities',
    description: 'Cross-market spread and opportunity discovery.',
    module: 'trade',
    category: 'analysis',
    metering: null,
    unit: null,
    defaultAccess: 'public',
    status: 'available',
  },
  {
    key: 'trade.export_intelligence',
    name: 'Export intelligence',
    description: 'Export policy, demand and margin intelligence.',
    module: 'trade',
    category: 'intelligence',
    metering: null,
    unit: null,
    defaultAccess: 'entitled',
    status: 'registered',
  },

  /* ----------------------------------------------------------- alerts -- */
  {
    key: 'alerts.create',
    name: 'Create price alerts',
    description: 'Set crossing-based thresholds and be notified when they fire.',
    module: 'alerts',
    category: 'personalization',
    metering: 'period_allowance',
    unit: 'active_alerts',
    defaultAccess: 'authenticated',
    status: 'available',
    metadata: { thresholdPolicy: 'crossing-based' },
  },
  {
    key: 'watchlists.create',
    name: 'Create watchlists',
    description: 'Save commodities and markets and follow them from the workspace.',
    module: 'alerts',
    category: 'personalization',
    metering: 'period_allowance',
    unit: 'watchlists',
    defaultAccess: 'authenticated',
    status: 'available',
  },
  {
    key: 'notifications.email',
    name: 'Email notifications',
    description: 'Receive alert notifications by email as well as in app.',
    module: 'alerts',
    category: 'personalization',
    metering: null,
    unit: null,
    defaultAccess: 'entitled',
    status: 'registered',
  },

  /* ------------------------------------------------------ fundamentals -- */
  {
    key: 'fundamentals.signals',
    name: 'Fundamental signals',
    description: 'Confidence-scored fundamental indicators per commodity.',
    module: 'fundamentals',
    category: 'intelligence',
    metering: null,
    unit: null,
    defaultAccess: 'entitled',
    status: 'registered',
  },

  /* ---------------------------------------------------------- research -- */
  {
    key: 'research.archive',
    name: 'Research archive',
    description: 'Published reports, briefs and outlooks.',
    module: 'research',
    category: 'intelligence',
    metering: null,
    unit: null,
    defaultAccess: 'public',
    status: 'registered',
  },
  {
    key: 'research.premium_reports',
    name: 'Premium market intelligence',
    description: 'Full premium reports and extended historical series.',
    module: 'research',
    category: 'intelligence',
    metering: null,
    unit: null,
    defaultAccess: 'entitled',
    status: 'registered',
  },
  {
    key: 'research.download',
    name: 'Report downloads',
    description: 'Download published reports as documents.',
    module: 'research',
    category: 'export',
    metering: 'period_allowance',
    unit: 'downloads',
    defaultAccess: 'entitled',
    status: 'registered',
  },

  /* -------------------------------------------------------- ai_analyst -- */
  {
    key: 'ai_analyst.query',
    name: 'AI Market Analyst',
    description: 'Ask a question and receive a grounded, cited answer.',
    module: 'ai_analyst',
    category: 'analysis',
    metering: 'period_allowance',
    unit: 'requests',
    defaultAccess: 'entitled',
    status: 'registered',
    metadata: { grounding: 'retrieval-only', untrustedInput: true },
  },
  {
    key: 'ai_analyst.tokens',
    name: 'AI analyst token budget',
    description: 'The token budget available to the AI Market Analyst.',
    module: 'ai_analyst',
    category: 'analysis',
    metering: 'period_allowance',
    unit: 'tokens',
    defaultAccess: 'entitled',
    status: 'registered',
  },

  /* ----------------------------------------------------------- exports -- */
  {
    key: 'exports.observations',
    name: 'Observation exports',
    description: 'Download the underlying observations rather than only summaries.',
    module: 'exports',
    category: 'export',
    metering: 'per_action_allowance',
    unit: 'rows',
    defaultAccess: 'entitled',
    status: 'available',
  },
  {
    key: 'exports.bulk',
    name: 'Bulk data exports',
    description: 'Large historical exports and bulk retrieval.',
    module: 'exports',
    category: 'export',
    metering: 'period_allowance',
    unit: 'bulk_operations',
    defaultAccess: 'entitled',
    status: 'registered',
  },

  /* --------------------------------------------------------------- api -- */
  {
    key: 'api.access',
    name: 'API access',
    description: 'Programmatic access with a scoped key beyond the public read scope.',
    module: 'api',
    category: 'integration',
    metering: 'period_allowance',
    unit: 'api_requests_per_month',
    defaultAccess: 'entitled',
    status: 'available',
  },
  {
    key: 'api.history',
    name: 'API historical data',
    description: 'Extended history through the public API.',
    module: 'api',
    category: 'integration',
    metering: null,
    unit: null,
    defaultAccess: 'entitled',
    status: 'registered',
  },

  /* -------------------------------------------------------- enterprise -- */
  {
    key: 'enterprise.organization',
    name: 'Organization entitlements',
    description: 'Entitlements shared across an active organization membership.',
    module: 'enterprise',
    category: 'integration',
    metering: 'organization_shared_allowance',
    unit: 'requests',
    defaultAccess: 'entitled',
    status: 'registered',
  },
  {
    key: 'enterprise.bespoke_coverage',
    name: 'Bespoke market coverage',
    description: 'Coverage of markets or commodities agreed by contract.',
    module: 'enterprise',
    category: 'support',
    metering: null,
    unit: null,
    defaultAccess: 'entitled',
    status: 'registered',
  },
] as const;

const BY_KEY = new Map<string, FeatureDefinition>(
  FEATURE_REGISTRY.map((f) => [f.key, f]),
);

export function getFeature(key: string): FeatureDefinition | undefined {
  return BY_KEY.get(key);
}

export function isRegisteredFeature(key: string): boolean {
  return BY_KEY.has(key);
}

/** Every feature in a module, in registry order. */
export function listFeaturesByModule(module: FeatureModule): FeatureDefinition[] {
  return FEATURE_REGISTRY.filter((f) => f.module === module);
}

/** The features §4 says must be purchasable to be sold. */
export function listPurchasableFeatures(): FeatureDefinition[] {
  return FEATURE_REGISTRY.filter(isPurchasable);
}

/** The features the product actually implements today. */
export function listOperationalFeatures(): FeatureDefinition[] {
  return FEATURE_REGISTRY.filter(isOperational);
}

/**
 * A summary used by the admin catalogue.
 *
 * §4 asks that registered / configured / enabled / implemented / tested /
 * available be distinguishable, and the count of non-available entries is the
 * number that keeps the catalogue honest — a customer shown "27 features" who
 * buys one that does not work has been misled.
 */
export interface RegistrySummary {
  total: number;
  byStatus: Record<string, number>;
  byModule: Record<string, number>;
  operational: number;
  purchasable: number;
  modules: number;
}

export function summariseRegistry(): RegistrySummary {
  const byStatus: Record<string, number> = {};
  const byModule: Record<string, number> = {};

  for (const feature of FEATURE_REGISTRY) {
    byStatus[feature.status] = (byStatus[feature.status] ?? 0) + 1;
    byModule[feature.module] = (byModule[feature.module] ?? 0) + 1;
  }

  return {
    total: FEATURE_REGISTRY.length,
    byStatus,
    byModule,
    operational: listOperationalFeatures().length,
    purchasable: listPurchasableFeatures().length,
    modules: FEATURE_MODULES.length,
  };
}
