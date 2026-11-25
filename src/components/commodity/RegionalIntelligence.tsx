/**
 * RegionalIntelligence — Nigerian and regional market intelligence
 *
 * Stage 6 of commodity intelligence transformation.
 * Shows Nigerian supply-demand context, regional price breakdown by state,
 * and trade partner information.
 */

import { MapPin, TrendingUp, TrendingDown, Minus, Globe, Package, Ship, AlertCircle } from 'lucide-react';
import type { CommodityIntelligenceSummary } from '@/lib/intelligence/types';

interface RegionalIntelligenceProps {
  intelligence: CommodityIntelligenceSummary | null;
  stateBreakdown: StatePriceBreakdown[];
  commodityName: string;
  commoditySlug: string;
}

export interface StatePriceBreakdown {
  stateName: string;
  marketCount: number;
  observationCount: number;
  avgPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  latestDate: string;
  currencyCode: string;
}

export function RegionalIntelligence({
  intelligence,
  stateBreakdown,
  commodityName,
  commoditySlug,
}: RegionalIntelligenceProps) {
  const hasNigerianData = intelligence && intelligence.country_code === 'NGA';
  const hasStateData = stateBreakdown.length > 0;

  if (!hasNigerianData && !hasStateData) {
    return (
      <section aria-label="Regional intelligence" className="space-y-6">
        <div className="terminal-panel p-6">
          <div className="flex items-start gap-4">
            <MapPin className="mt-0.5 size-6 shrink-0 text-terminal-text-muted" />
            <div className="flex-1">
              <h3 className="text-base font-semibold text-terminal-text">
                Nigerian & Regional Intelligence
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-terminal-text-secondary">
                Regional price breakdown and Nigerian market context for {commodityName} will appear here as
                observations are collected across different states and markets.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Regional intelligence" className="space-y-6">
      {/* Section Header */}
      <div>
        <h2 className="text-lg font-semibold text-terminal-text">
          Nigerian & Regional Intelligence
        </h2>
        <p className="mt-1 text-xs text-terminal-text-muted">
          State-level price breakdown and Nigerian market context
        </p>
      </div>

      {/* Nigerian Supply-Demand Context */}
      {hasNigerianData && (
        <NigerianContextCard intelligence={intelligence} commodityName={commodityName} />
      )}

      {/* State Price Breakdown */}
      {hasStateData && (
        <StatePriceBreakdownCard
          breakdown={stateBreakdown}
          commodityName={commodityName}
        />
      )}

      {/* Trade Partners */}
      {hasNigerianData && intelligence.trade && (
        <TradePartnersCard
          trade={intelligence.trade}
          year={intelligence.latest_year}
          commodityName={commodityName}
        />
      )}
    </section>
  );
}

/* ── Nigerian Context Card ───────────────────────────────────────────────────── */

function NigerianContextCard({
  intelligence,
  commodityName,
}: {
  intelligence: CommodityIntelligenceSummary;
  commodityName: string;
}) {
  const selfSufficiency = intelligence.supply_demand?.stock_to_use_ratio;

  return (
    <div className="terminal-panel p-5">
      <div className="mb-4 flex items-center gap-2">
        <MapPin className="size-5 text-harvest-400" />
        <h3 className="text-sm font-semibold text-terminal-text">Nigerian Market Context</h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {intelligence.production && intelligence.production.quantity_mt !== null && (
          <div className="rounded-lg border border-terminal-border bg-terminal-surface p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-terminal-text-muted">
              Domestic Production
            </dt>
            <dd className="mt-1">
              <span className="text-xl font-bold tabular-nums text-terminal-text">
                {formatMt(intelligence.production.quantity_mt)}
              </span>
              {intelligence.latest_year && (
                <span className="ml-1 text-xs text-terminal-text-muted">
                  {intelligence.latest_year}
                </span>
              )}
            </dd>
          </div>
        )}

        {intelligence.supply_demand?.total_supply_mt != null && (
          <div className="rounded-lg border border-terminal-border bg-terminal-surface p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-terminal-text-muted">
              Total Supply
            </dt>
            <dd className="mt-1">
              <span className="text-xl font-bold tabular-nums text-terminal-text">
                {formatMt(intelligence.supply_demand?.total_supply_mt ?? 0)}
              </span>
            </dd>
          </div>
        )}

        {intelligence.supply_demand?.total_demand_mt != null && (
          <div className="rounded-lg border border-terminal-border bg-terminal-surface p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-terminal-text-muted">
              Total Demand
            </dt>
            <dd className="mt-1">
              <span className="text-xl font-bold tabular-nums text-terminal-text">
                {formatMt(intelligence.supply_demand?.total_demand_mt ?? 0)}
              </span>
            </dd>
          </div>
        )}
      </div>

      {/* Self-Sufficiency Indicator */}
      {intelligence.supply_demand?.stock_to_use_ratio != null && (
        <div className="mt-4 rounded-lg border border-terminal-border bg-terminal-surface p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-terminal-text-muted">
                Stock-to-Use Ratio
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-terminal-text">
                {(intelligence.supply_demand?.stock_to_use_ratio ?? 0).toFixed(1)}%
              </p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-medium ${getStockToUseColor(intelligence.supply_demand?.stock_to_use_ratio ?? 0)}`}>
                {getStockToUseLabel(intelligence.supply_demand?.stock_to_use_ratio ?? 0)}
              </p>
              <p className="mt-0.5 text-xs text-terminal-text-muted">
                {getStockToUseDescription(intelligence.supply_demand?.stock_to_use_ratio ?? 0)}
              </p>
            </div>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-terminal-text-muted">
        Nigerian {commodityName} market data · {intelligence.latest_year}
      </p>
    </div>
  );
}

/* ── State Price Breakdown Card ──────────────────────────────────────────────── */

function StatePriceBreakdownCard({
  breakdown,
  commodityName,
}: {
  breakdown: StatePriceBreakdown[];
  commodityName: string;
}) {
  // Sort by average price (highest first)
  const sorted = [...breakdown]
    .filter((s) => s.avgPrice !== null)
    .sort((a, b) => (b.avgPrice ?? 0) - (a.avgPrice ?? 0));

  const highestPrice = sorted[0]?.avgPrice ?? 0;
  const lowestPrice = sorted[sorted.length - 1]?.avgPrice ?? 0;

  return (
    <div className="terminal-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="size-5 text-harvest-400" />
          <h3 className="text-sm font-semibold text-terminal-text">State Price Breakdown</h3>
        </div>
        <span className="text-xs text-terminal-text-muted">
          {sorted.length} state{sorted.length === 1 ? '' : 's'} reporting
        </span>
      </div>

      {/* Price Range Summary */}
      {sorted.length > 1 && (
        <div className="mb-4 rounded-lg border border-terminal-border bg-terminal-surface p-3">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-terminal-text-muted">Lowest: </span>
              <span className="font-medium text-success-500">
                {formatNaira(lowestPrice)}
              </span>
            </div>
            <div>
              <span className="text-terminal-text-muted">Spread: </span>
              <span className="font-medium text-terminal-text">
                {formatNaira(highestPrice - lowestPrice)}
              </span>
            </div>
            <div>
              <span className="text-terminal-text-muted">Highest: </span>
              <span className="font-medium text-error-500">
                {formatNaira(highestPrice)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* State Bars */}
      <div className="space-y-2">
        {sorted.map((state) => {
          const percentage = highestPrice > 0 ? ((state.avgPrice ?? 0) / highestPrice) * 100 : 0;
          const isHighest = state.avgPrice === highestPrice;
          const isLowest = state.avgPrice === lowestPrice;

          return (
            <div key={state.stateName} className="group">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-terminal-text">{state.stateName}</span>
                  <span className="text-terminal-text-muted">
                    {state.marketCount} market{state.marketCount === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-bold tabular-nums ${
                      isHighest ? 'text-error-500' : isLowest ? 'text-success-500' : 'text-terminal-text'
                    }`}
                  >
                    {formatNaira(state.avgPrice ?? 0)}
                  </span>
                </div>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-terminal-surface">
                <div
                  className={`h-full rounded-full transition-all ${
                    isHighest
                      ? 'bg-error-500'
                      : isLowest
                        ? 'bg-success-500'
                        : 'bg-harvest-400'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-terminal-text-muted">
        Average prices by state · Sorted by price (highest to lowest)
      </p>
    </div>
  );
}

/* ── Trade Partners Card ─────────────────────────────────────────────────────── */

function TradePartnersCard({
  trade,
  year,
  commodityName,
}: {
  trade: NonNullable<CommodityIntelligenceSummary['trade']>;
  year: number;
  commodityName: string;
}) {
  const hasImports = trade.top_import_partners.length > 0;
  const hasExports = trade.top_export_partners.length > 0;

  if (!hasImports && !hasExports) return null;

  return (
    <div className="terminal-panel p-5">
      <div className="mb-4 flex items-center gap-2">
        <Globe className="size-5 text-harvest-400" />
        <h3 className="text-sm font-semibold text-terminal-text">Nigerian Trade Partners</h3>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Import Partners */}
        {hasImports && (
          <div>
            <div className="mb-3 flex items-center gap-1.5">
              <Ship className="size-3.5 text-terminal-text-muted" />
              <h4 className="text-xs font-semibold uppercase tracking-wide text-terminal-text-muted">
                Top Import Sources
              </h4>
            </div>
            <div className="space-y-2">
              {trade.top_import_partners.slice(0, 5).map((partner, idx) => {
                const percentage = trade.imports_mt
                  ? (partner.quantity_mt / trade.imports_mt) * 100
                  : 0;

                return (
                  <div key={partner.country} className="group">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="flex size-5 items-center justify-center rounded-full bg-terminal-surface text-[0.625rem] font-medium text-terminal-text-muted">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-terminal-text">{partner.country}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-terminal-text-muted">
                          {percentage.toFixed(1)}%
                        </span>
                        <span className="font-bold tabular-nums text-terminal-text">
                          {formatMt(partner.quantity_mt)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-terminal-surface">
                      <div
                        className="h-full rounded-full bg-harvest-400 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Export Partners */}
        {hasExports && (
          <div>
            <div className="mb-3 flex items-center gap-1.5">
              <Ship className="size-3.5 rotate-180 text-terminal-text-muted" />
              <h4 className="text-xs font-semibold uppercase tracking-wide text-terminal-text-muted">
                Top Export Destinations
              </h4>
            </div>
            <div className="space-y-2">
              {trade.top_export_partners.slice(0, 5).map((partner, idx) => {
                const percentage = trade.exports_mt
                  ? (partner.quantity_mt / trade.exports_mt) * 100
                  : 0;

                return (
                  <div key={partner.country} className="group">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="flex size-5 items-center justify-center rounded-full bg-terminal-surface text-[0.625rem] font-medium text-terminal-text-muted">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-terminal-text">{partner.country}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-terminal-text-muted">
                          {percentage.toFixed(1)}%
                        </span>
                        <span className="font-bold tabular-nums text-terminal-text">
                          {formatMt(partner.quantity_mt)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-terminal-surface">
                      <div
                        className="h-full rounded-full bg-harvest-400 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-terminal-text-muted">
        Nigerian {commodityName} trade flows · {year}
      </p>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */

function formatMt(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M MT`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K MT`;
  }
  return `${value.toFixed(0)} MT`;
}

function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStockToUseColor(ratio: number): string {
  if (ratio >= 20) return 'text-success-500';
  if (ratio >= 10) return 'text-warning-500';
  return 'text-error-500';
}

function getStockToUseLabel(ratio: number): string {
  if (ratio >= 20) return 'Comfortable';
  if (ratio >= 10) return 'Adequate';
  return 'Tight';
}

function getStockToUseDescription(ratio: number): string {
  if (ratio >= 20) return 'Supply buffer is comfortable';
  if (ratio >= 10) return 'Supply buffer is adequate';
  return 'Supply buffer is tight';
}
