/**
 * FundamentalsSection — Comprehensive commodity fundamentals display
 *
 * Stage 5 of commodity intelligence transformation.
 * Displays production, supply-demand balance, trade flows, and field-reported signals.
 * All data from database — no fabrication.
 */

import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Database,
  Globe,
  BarChart3,
  AlertCircle,
  Package,
  Ship,
  Activity,
} from 'lucide-react';
import type { CommodityIntelligenceSummary } from '@/lib/intelligence/types';
import type { FundamentalSignal } from '@/lib/trade/queries';

interface FundamentalsSectionProps {
  intelligence: CommodityIntelligenceSummary | null;
  signals: FundamentalSignal[];
  commodityName: string;
  commoditySlug: string;
}

export function FundamentalsSection({
  intelligence,
  signals,
  commodityName,
  commoditySlug,
}: FundamentalsSectionProps) {
  const hasIntelligenceData =
    intelligence &&
    (intelligence.production || intelligence.supply_demand || intelligence.trade);

  if (!hasIntelligenceData && signals.length === 0) {
    return (
      <section aria-label="Commodity fundamentals" className="space-y-6">
        <div className="terminal-panel p-6">
          <div className="flex items-start gap-4">
            <Database className="mt-0.5 size-6 shrink-0 text-terminal-text-muted" />
            <div className="flex-1">
              <h3 className="text-base font-semibold text-terminal-text">
                Commodity Fundamentals
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-terminal-text-secondary">
                Production, supply-demand, and trade intelligence for {commodityName} is being
                integrated from FAOSTAT, USDA, and field agent reports. This section will display
                comprehensive fundamentals once data ingestion is complete.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={`/intelligence/${commoditySlug}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-terminal-border px-3 py-1.5 text-xs font-medium text-terminal-text transition-colors hover:border-harvest-500/40 hover:text-harvest-300"
                >
                  Check intelligence hub
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Commodity fundamentals" className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-terminal-text">
            Commodity Fundamentals
          </h2>
          <p className="mt-1 text-xs text-terminal-text-muted">
            Production, supply-demand balance, and trade intelligence
            {intelligence?.latest_year ? ` · ${intelligence.latest_year} data` : ''}
          </p>
        </div>
        <Link
          href={`/intelligence/${commoditySlug}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-terminal-border px-3 py-1.5 text-xs font-medium text-terminal-text transition-colors hover:border-harvest-500/40 hover:text-harvest-300"
        >
          Full intelligence
          <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* Production Card */}
      {intelligence?.production && (
        <ProductionCard
          production={intelligence.production}
          year={intelligence.latest_year}
          commodityName={commodityName}
        />
      )}

      {/* Supply & Demand Card */}
      {intelligence?.supply_demand && (
        <SupplyDemandCard
          supplyDemand={intelligence.supply_demand}
          year={intelligence.latest_year}
          commodityName={commodityName}
        />
      )}

      {/* Trade Flows Card */}
      {intelligence?.trade && (
        <TradeFlowsCard
          trade={intelligence.trade}
          year={intelligence.latest_year}
          commodityName={commodityName}
        />
      )}

      {/* Field-Reported Signals */}
      {signals.length > 0 && (
        <FieldSignalsPanel signals={signals} commodityName={commodityName} />
      )}

      {/* Data Provenance */}
      <div className="terminal-panel p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-terminal-text-muted" />
          <div className="flex-1">
            <p className="text-xs leading-relaxed text-terminal-text-secondary">
              <span className="font-medium text-terminal-text">Data sources: </span>
              {intelligence?.latest_source ?? 'FAOSTAT, USDA'}
              {intelligence?.evidence_count ? (
                <span>
                  {' '}
                  · {intelligence.evidence_count} evidence record
                  {intelligence.evidence_count === 1 ? '' : 's'}
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-[0.6875rem] leading-relaxed text-terminal-text-muted">
              Intelligence data is updated from external sources and may lag behind real-time
              market conditions. All figures carry provenance metadata and are never fabricated.
              Field signals are agent-reported during collection visits.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Production Card ─────────────────────────────────────────────────────────── */

function ProductionCard({
  production,
  year,
  commodityName,
}: {
  production: NonNullable<CommodityIntelligenceSummary['production']>;
  year: number;
  commodityName: string;
}) {
  const trendIcon =
    production.trend === 'increasing' ? (
      <TrendingUp className="size-4 text-success-500" />
    ) : production.trend === 'decreasing' ? (
      <TrendingDown className="size-4 text-error-500" />
    ) : (
      <Minus className="size-4 text-warning-500" />
    );

  const trendLabel =
    production.trend === 'increasing'
      ? 'Increasing'
      : production.trend === 'decreasing'
        ? 'Decreasing'
        : 'Stable';

  return (
    <div className="terminal-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="size-5 text-harvest-400" />
          <h3 className="text-sm font-semibold text-terminal-text">Production</h3>
        </div>
        {production.trend && (
          <div className="flex items-center gap-1.5 rounded-full bg-terminal-surface px-2.5 py-1 text-xs">
            {trendIcon}
            <span className="font-medium text-terminal-text">{trendLabel}</span>
          </div>
        )}
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        {production.quantity_mt !== null && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-terminal-text-muted">
              Quantity
            </dt>
            <dd className="mt-1">
              <span className="text-2xl font-bold tabular-nums text-terminal-text">
                {formatMt(production.quantity_mt)}
              </span>
            </dd>
          </div>
        )}

        {production.yield_mt_per_ha !== null && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-terminal-text-muted">
              Yield
            </dt>
            <dd className="mt-1">
              <span className="text-2xl font-bold tabular-nums text-terminal-text">
                {production.yield_mt_per_ha.toFixed(2)}
              </span>
              <span className="ml-1 text-xs text-terminal-text-muted">MT/ha</span>
            </dd>
          </div>
        )}

        {production.harvested_area_ha !== null && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-terminal-text-muted">
              Harvested Area
            </dt>
            <dd className="mt-1">
              <span className="text-2xl font-bold tabular-nums text-terminal-text">
                {formatHa(production.harvested_area_ha)}
              </span>
            </dd>
          </div>
        )}
      </dl>

      <p className="mt-4 text-xs text-terminal-text-muted">
        {commodityName} production data · {year}
      </p>
    </div>
  );
}

/* ── Supply & Demand Card ────────────────────────────────────────────────────── */

function SupplyDemandCard({
  supplyDemand,
  year,
  commodityName,
}: {
  supplyDemand: NonNullable<CommodityIntelligenceSummary['supply_demand']>;
  year: number;
  commodityName: string;
}) {
  const stockToUseTone =
    supplyDemand.stock_to_use_ratio !== null
      ? supplyDemand.stock_to_use_ratio >= 20
        ? 'text-success-500'
        : supplyDemand.stock_to_use_ratio >= 10
          ? 'text-warning-500'
          : 'text-error-500'
      : 'text-terminal-text-muted';

  return (
    <div className="terminal-panel p-5">
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 className="size-5 text-harvest-400" />
        <h3 className="text-sm font-semibold text-terminal-text">Supply & Demand Balance</h3>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {supplyDemand.total_supply_mt !== null && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-terminal-text-muted">
              Total Supply
            </dt>
            <dd className="mt-1">
              <span className="text-xl font-bold tabular-nums text-terminal-text">
                {formatMt(supplyDemand.total_supply_mt)}
              </span>
            </dd>
          </div>
        )}

        {supplyDemand.total_demand_mt !== null && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-terminal-text-muted">
              Total Demand
            </dt>
            <dd className="mt-1">
              <span className="text-xl font-bold tabular-nums text-terminal-text">
                {formatMt(supplyDemand.total_demand_mt)}
              </span>
            </dd>
          </div>
        )}

        {supplyDemand.ending_stocks_mt !== null && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-terminal-text-muted">
              Ending Stocks
            </dt>
            <dd className="mt-1">
              <span className="text-xl font-bold tabular-nums text-terminal-text">
                {formatMt(supplyDemand.ending_stocks_mt)}
              </span>
            </dd>
          </div>
        )}

        {supplyDemand.stock_to_use_ratio !== null && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-terminal-text-muted">
              Stock-to-Use
            </dt>
            <dd className="mt-1">
              <span className={`text-xl font-bold tabular-nums ${stockToUseTone}`}>
                {supplyDemand.stock_to_use_ratio.toFixed(1)}%
              </span>
            </dd>
          </div>
        )}
      </dl>

      <p className="mt-4 text-xs text-terminal-text-muted">
        {commodityName} supply-demand balance · {year}
      </p>
    </div>
  );
}

/* ── Trade Flows Card ────────────────────────────────────────────────────────── */

function TradeFlowsCard({
  trade,
  year,
  commodityName,
}: {
  trade: NonNullable<CommodityIntelligenceSummary['trade']>;
  year: number;
  commodityName: string;
}) {
  return (
    <div className="terminal-panel p-5">
      <div className="mb-4 flex items-center gap-2">
        <Globe className="size-5 text-harvest-400" />
        <h3 className="text-sm font-semibold text-terminal-text">Trade Flows</h3>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Summary Stats */}
        <div className="space-y-3">
          <dl className="grid gap-3">
            {trade.imports_mt !== null && trade.imports_mt > 0 && (
              <div className="flex items-baseline justify-between">
                <dt className="text-xs font-medium text-terminal-text-muted">Imports</dt>
                <dd className="text-lg font-bold tabular-nums text-terminal-text">
                  {formatMt(trade.imports_mt)}
                </dd>
              </div>
            )}
            {trade.exports_mt !== null && trade.exports_mt > 0 && (
              <div className="flex items-baseline justify-between">
                <dt className="text-xs font-medium text-terminal-text-muted">Exports</dt>
                <dd className="text-lg font-bold tabular-nums text-terminal-text">
                  {formatMt(trade.exports_mt)}
                </dd>
              </div>
            )}
            {trade.net_trade_mt !== null && (
              <div className="flex items-baseline justify-between border-t border-terminal-border pt-2">
                <dt className="text-xs font-medium text-terminal-text-muted">Net Trade</dt>
                <dd
                  className={`text-lg font-bold tabular-nums ${
                    trade.net_trade_mt >= 0 ? 'text-success-500' : 'text-error-500'
                  }`}
                >
                  {trade.net_trade_mt >= 0 ? '+' : ''}
                  {formatMt(trade.net_trade_mt)}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Top Import Partners */}
        {trade.top_import_partners.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <Ship className="size-3.5 text-terminal-text-muted" />
              <h4 className="text-xs font-semibold uppercase tracking-wide text-terminal-text-muted">
                Top Import Partners
              </h4>
            </div>
            <ul className="space-y-1.5">
              {trade.top_import_partners.slice(0, 5).map((partner) => (
                <li
                  key={partner.country}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-terminal-text-secondary">{partner.country}</span>
                  <span className="font-medium tabular-nums text-terminal-text">
                    {formatMt(partner.quantity_mt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Top Export Partners */}
        {trade.top_export_partners.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <Activity className="size-3.5 text-terminal-text-muted" />
              <h4 className="text-xs font-semibold uppercase tracking-wide text-terminal-text-muted">
                Top Export Partners
              </h4>
            </div>
            <ul className="space-y-1.5">
              {trade.top_export_partners.slice(0, 5).map((partner) => (
                <li
                  key={partner.country}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-terminal-text-secondary">{partner.country}</span>
                  <span className="font-medium tabular-nums text-terminal-text">
                    {formatMt(partner.quantity_mt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-terminal-text-muted">
        {commodityName} trade flows · {year}
      </p>
    </div>
  );
}

/* ── Field Signals Panel ─────────────────────────────────────────────────────── */

function FieldSignalsPanel({
  signals,
  commodityName,
}: {
  signals: FundamentalSignal[];
  commodityName: string;
}) {
  return (
    <div className="terminal-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="size-5 text-leaf-400" />
          <h3 className="text-sm font-semibold text-terminal-text">Field-Reported Signals</h3>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-leaf-500/10 px-2.5 py-0.5 text-xs font-medium text-leaf-400">
          <Database className="size-3" />
          {signals.length} signal{signals.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="space-y-3">
        {signals.slice(0, 5).map((signal, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-terminal-border bg-terminal-surface p-3"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-medium text-terminal-text">{signal.marketName}</span>
              <span className="text-terminal-text-muted">·</span>
              <span className="text-terminal-text-muted">
                {new Date(signal.collectedAt).toLocaleDateString('en-NG', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {signal.supplyLevel && (
                <SignalPill label="Supply" value={signal.supplyLevel} />
              )}
              {signal.demandLevel && (
                <SignalPill label="Demand" value={signal.demandLevel} />
              )}
              {signal.priceDirection && (
                <SignalPill label="Price" value={signal.priceDirection} />
              )}
              {signal.sentiment && (
                <SignalPill label="Sentiment" value={signal.sentiment} />
              )}
            </div>

            {signal.developments && (
              <p className="mt-2 text-xs text-terminal-text-secondary">{signal.developments}</p>
            )}
          </div>
        ))}

        {signals.length > 5 && (
          <p className="text-xs text-terminal-text-muted">
            +{signals.length - 5} more signal{signals.length - 5 === 1 ? '' : 's'}
          </p>
        )}
      </div>

      <p className="mt-4 text-xs text-terminal-text-muted">
        Field signals are agent-reported during collection visits. They reflect conditions observed
        at specific markets on specific dates, not aggregated forecasts.
      </p>
    </div>
  );
}

/* ── Signal Pill ─────────────────────────────────────────────────────────────── */

function SignalPill({ label, value }: { label: string; value: string }) {
  let toneClass = 'bg-terminal-surface text-terminal-text-secondary border-terminal-border';

  const lowerValue = value.toLowerCase();
  if (
    lowerValue.includes('high') ||
    lowerValue.includes('up') ||
    lowerValue.includes('strong') ||
    lowerValue.includes('bullish')
  ) {
    toneClass = 'bg-success-500/10 text-success-500 border-success-500/20';
  } else if (
    lowerValue.includes('low') ||
    lowerValue.includes('down') ||
    lowerValue.includes('weak') ||
    lowerValue.includes('bearish')
  ) {
    toneClass = 'bg-error-500/10 text-error-500 border-error-500/20';
  } else if (lowerValue.includes('stable') || lowerValue.includes('neutral')) {
    toneClass = 'bg-warning-500/10 text-warning-500 border-warning-500/20';
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${toneClass}`}
    >
      {label}:
      <span className="text-terminal-text">{value}</span>
    </span>
  );
}

/* ── Formatters ──────────────────────────────────────────────────────────────── */

function formatMt(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M MT`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K MT`;
  }
  return `${value.toFixed(0)} MT`;
}

function formatHa(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M ha`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K ha`;
  }
  return `${value.toFixed(0)} ha`;
}
