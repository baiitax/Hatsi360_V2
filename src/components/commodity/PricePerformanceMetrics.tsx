'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PricePerformanceMetricsProps {
  observations: Array<{
    id: string;
    amount: number;
    collectedAt: string;
    marketName?: string | null;
    gradeName?: string | null;
    unitCode?: string | null;
    currencyCode: string;
    priceType: string;
  }>;
  seriesLabel?: string;
}

export function PricePerformanceMetrics({ observations, seriesLabel }: PricePerformanceMetricsProps) {
  if (observations.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-[#E3EAE5] p-6">
        <p className="text-[#64736B]">No observations available for the selected filters.</p>
      </div>
    );
  }

  // Sort by date
  const sorted = [...observations].sort(
    (a, b) => new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime()
  );

  const latest = sorted[sorted.length - 1];
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;

  const prices = sorted.map((o) => o.amount);
  const highest = Math.max(...prices);
  const lowest = Math.min(...prices);
  const average = prices.reduce((a, b) => a + b, 0) / prices.length;

  let change: number | null = null;
  let changePercent: number | null = null;

  if (previous) {
    change = latest.amount - previous.amount;
    changePercent = (change / previous.amount) * 100;
  }

  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency === 'NGN' ? 'NGN' : 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Latest vs Previous */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Latest */}
        <div className="bg-white rounded-lg border border-[#E3EAE5] p-6">
          <p className="text-sm text-[#64736B] mb-2">Latest Observation</p>
          <p className="text-3xl font-bold text-[#17241F] mb-2">
            {formatMoney(latest.amount, latest.currencyCode)}
          </p>
          <div className="space-y-1 text-sm text-[#64736B]">
            <p>{formatDate(latest.collectedAt)}</p>
            {latest.marketName && <p>{latest.marketName}</p>}
            {latest.gradeName && (
              <p>
                {latest.gradeName} · {latest.priceType}
              </p>
            )}
          </div>
        </div>

        {/* Previous */}
        <div className="bg-white rounded-lg border border-[#E3EAE5] p-6">
          <p className="text-sm text-[#64736B] mb-2">Previous Observation</p>
          {previous ? (
            <>
              <p className="text-3xl font-bold text-[#17241F] mb-2">
                {formatMoney(previous.amount, previous.currencyCode)}
              </p>
              <div className="space-y-1 text-sm text-[#64736B]">
                <p>{formatDate(previous.collectedAt)}</p>
                {previous.marketName && <p>{previous.marketName}</p>}
                {previous.gradeName && (
                  <p>
                    {previous.gradeName} · {previous.priceType}
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="text-[#64736B]">No previous observation</p>
          )}
        </div>
      </div>

      {/* Change */}
      {change !== null && changePercent !== null && (
        <div className="bg-white rounded-lg border border-[#E3EAE5] p-6">
          <p className="text-sm text-[#64736B] mb-3">Price Movement</p>
          <div className="flex items-center gap-3">
            {change > 0 ? (
              <TrendingUp className="w-8 h-8 text-emerald-600" />
            ) : change < 0 ? (
              <TrendingDown className="w-8 h-8 text-red-600" />
            ) : (
              <Minus className="w-8 h-8 text-[#64736B]" />
            )}
            <div>
              <p
                className={`text-2xl font-bold ${
                  change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-600' : 'text-[#64736B]'
                }`}
              >
                {change > 0 ? '+' : ''}
                {formatMoney(change, latest.currencyCode)} ({change > 0 ? '+' : ''}
                {changePercent.toFixed(2)}%)
              </p>
              {seriesLabel && <p className="text-xs text-[#64736B] mt-1">Series: {seriesLabel}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-[#E3EAE5] p-6">
          <p className="text-sm text-[#64736B] mb-2">Highest Observed</p>
          <p className="text-2xl font-bold text-[#17241F]">
            {formatMoney(highest, latest.currencyCode)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-[#E3EAE5] p-6">
          <p className="text-sm text-[#64736B] mb-2">Lowest Observed</p>
          <p className="text-2xl font-bold text-[#17241F]">
            {formatMoney(lowest, latest.currencyCode)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-[#E3EAE5] p-6">
          <p className="text-sm text-[#64736B] mb-2">Average Price</p>
          <p className="text-2xl font-bold text-[#17241F]">
            {formatMoney(average, latest.currencyCode)}
          </p>
        </div>
      </div>

      {/* Observation count */}
      <div className="bg-white rounded-lg border border-[#E3EAE5] p-6">
        <p className="text-sm text-[#64736B]">
          <span className="font-bold text-[#17241F]">{observations.length}</span> observations
          in this series
          {observations.length > 1 && (
            <>
              {' '}
              from{' '}
              <span className="font-medium text-[#17241F]">{formatDate(sorted[0].collectedAt)}</span>
              {' '}to{' '}
              <span className="font-medium text-[#17241F]">
                {formatDate(sorted[sorted.length - 1].collectedAt)}
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
