/**
 * ReportingMarketCard — Enhanced per-market display card
 *
 * Stage 5 of commodity intelligence transformation.
 * Shows market name, location, latest price, grade, observation freshness,
 * and link to market detail page.
 */

import Link from 'next/link';
import { MapPin, Calendar, ArrowRight, Tag } from 'lucide-react';

export interface MarketPriceCard {
  marketId: number;
  marketName: string;
  marketSlug?: string | null;
  stateName: string | null;
  amount: number;
  currencyCode: string;
  unitCode: string | null;
  gradeName: string | null;
  priceType: string;
  collectedAt: string;
  observationCount?: number;
}

interface ReportingMarketCardProps {
  market: MarketPriceCard;
  commodityName: string;
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency === 'NGN' ? 'NGN' : 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ReportingMarketCard({ market, commodityName }: ReportingMarketCardProps) {
  const freshnessInfo = getFreshnessInfo(market.collectedAt);

  return (
    <div className="terminal-panel p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        {/* Market Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-terminal-text truncate">
              {market.marketName}
            </h3>
            <span
              className={`inline-flex size-2 shrink-0 rounded-full ${freshnessInfo.colorClass}`}
              title={freshnessInfo.label}
            />
          </div>

          {market.stateName && (
            <div className="mt-1 flex items-center gap-1 text-xs text-terminal-text-muted">
              <MapPin className="size-3" />
              <span>{market.stateName}</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="text-right shrink-0">
          <p className="text-lg font-bold tabular-nums text-terminal-text">
            {formatPrice(market.amount, market.currencyCode)}
          </p>
          <p className="text-xs text-terminal-text-muted">
            per {market.unitCode ?? 'unit'}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-terminal-text-secondary">
        {market.gradeName && (
          <div className="flex items-center gap-1">
            <Tag className="size-3 text-terminal-text-muted" />
            <span>{market.gradeName}</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          <span className="text-terminal-text-muted">
            {market.priceType.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Calendar className="size-3 text-terminal-text-muted" />
          <span>
            {new Date(market.collectedAt).toLocaleDateString('en-NG', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>

        {market.observationCount !== undefined && market.observationCount > 1 && (
          <div className="text-terminal-text-muted">
            {market.observationCount} observations
          </div>
        )}
      </div>

      {/* Freshness & Actions */}
      <div className="mt-3 flex items-center justify-between border-t border-terminal-border pt-3">
        <span className={`text-xs font-medium ${freshnessInfo.textColor}`}>
          {freshnessInfo.label}
        </span>

        {market.marketSlug && (
          <Link
            href={`/markets/${market.marketSlug}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-harvest-400 transition-colors hover:text-harvest-300"
          >
            View market
            <ArrowRight className="size-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

/* ── Market Cards Grid ──────────────────────────────────────────────────────── */

interface ReportingMarketCardsGridProps {
  markets: MarketPriceCard[];
  commodityName: string;
  commoditySlug: string;
}

export function ReportingMarketCardsGrid({
  markets,
  commodityName,
  commoditySlug,
}: ReportingMarketCardsGridProps) {
  if (markets.length === 0) {
    return (
      <div className="terminal-panel p-6 text-center">
        <MapPin className="mx-auto size-8 text-terminal-text-muted" />
        <p className="mt-3 text-sm text-terminal-text-secondary">
          No reporting markets available for {commodityName} in this time range.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {markets.map((market) => (
        <ReportingMarketCard
          key={market.marketId}
          market={market}
          commodityName={commodityName}
        />
      ))}
    </div>
  );
}

/* ── Freshness Helpers ──────────────────────────────────────────────────────── */

function getFreshnessInfo(collectedAt: string): {
  label: string;
  colorClass: string;
  textColor: string;
} {
  const daysAgo = Math.floor(
    (Date.now() - new Date(collectedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysAgo <= 7) {
    return {
      label: 'Recently observed',
      colorClass: 'bg-success-500',
      textColor: 'text-success-500',
    };
  }
  if (daysAgo <= 30) {
    return {
      label: 'Recent',
      colorClass: 'bg-blue-500',
      textColor: 'text-blue-500',
    };
  }
  if (daysAgo <= 90) {
    return {
      label: 'Older observation',
      colorClass: 'bg-warning-500',
      textColor: 'text-warning-500',
    };
  }
  return {
    label: 'Stale observation',
    colorClass: 'bg-error-500',
    textColor: 'text-error-500',
  };
}
