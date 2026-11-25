'use client';

import { TrendingUp, TrendingDown, Minus, Calendar, MapPin, Activity } from 'lucide-react';

interface MarketSnapshotProps {
  latestPrice: {
    amount: number;
    currency: string;
    unit: string;
    grade?: string | null;
    priceType?: string;
    market?: string | null;
    date: string;
  } | null;
  previousPrice: {
    amount: number;
    date: string;
  } | null;
  marketCount: number;
  observationCount: number;
  latestObservationDate?: string | null;
  seriesLabel?: string;
}

export function MarketSnapshot({
  latestPrice,
  previousPrice,
  marketCount,
  observationCount,
  latestObservationDate,
  seriesLabel,
}: MarketSnapshotProps) {
  // Calculate change
  let change: number | null = null;
  let changePercent: number | null = null;

  if (latestPrice && previousPrice) {
    change = latestPrice.amount - previousPrice.amount;
    changePercent = (change / previousPrice.amount) * 100;
  }

  // Determine freshness
  const getFreshness = () => {
    if (!latestObservationDate) return { label: 'No data', color: 'gray' };

    const days = Math.floor(
      (Date.now() - new Date(latestObservationDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (days <= 7) return { label: 'Recently observed', color: 'green' };
    if (days <= 30) return { label: 'Recent', color: 'blue' };
    if (days <= 90) return { label: 'Older observation', color: 'amber' };
    return { label: 'Stale observation', color: 'red' };
  };

  const freshness = getFreshness();

  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency === 'NGN' ? 'NGN' : 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <section aria-label="Market snapshot" className="bg-white border-b border-[#E3EAE5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Latest Price */}
          <div className="lg:col-span-2">
            <p className="text-sm text-[#64736B] mb-2">Latest Published Price</p>
            {latestPrice ? (
              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl lg:text-4xl font-bold text-[#17241F]">
                    {formatMoney(latestPrice.amount, latestPrice.currency)}
                  </span>
                  <span className="text-sm text-[#64736B]">/ {latestPrice.unit}</span>
                </div>
                <div className="space-y-1 text-sm">
                  {latestPrice.grade && (
                    <p className="text-[#64736B]">
                      <span className="font-medium text-[#17241F]">{latestPrice.grade}</span>
                      {latestPrice.priceType && ` · ${latestPrice.priceType}`}
                    </p>
                  )}
                  {latestPrice.market && (
                    <p className="text-[#64736B] flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {latestPrice.market}
                    </p>
                  )}
                  <p className="text-[#64736B] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Observed{' '}
                    {new Date(latestPrice.date).toLocaleDateString('en-NG', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                {/* Price change */}
                {change !== null && changePercent !== null && (
                  <div className="mt-4 pt-4 border-t border-[#E3EAE5]">
                    <div className="flex items-center gap-2">
                      {change > 0 ? (
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                      ) : change < 0 ? (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      ) : (
                        <Minus className="w-5 h-5 text-[#64736B]" />
                      )}
                      <span
                        className={`text-lg font-semibold ${
                          change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-600' : 'text-[#64736B]'
                        }`}
                      >
                        {change > 0 ? '+' : ''}
                        {formatMoney(change, latestPrice.currency)} ({change > 0 ? '+' : ''}
                        {changePercent.toFixed(1)}%)
                      </span>
                    </div>
                    {previousPrice && (
                      <p className="text-xs text-[#64736B] mt-1">
                        vs {formatMoney(previousPrice.amount, latestPrice.currency)} on{' '}
                        {new Date(previousPrice.date).toLocaleDateString('en-NG', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                    {seriesLabel && (
                      <p className="text-xs text-[#64736B] mt-1">Series: {seriesLabel}</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[#64736B]">
                <p className="text-lg">No published prices yet</p>
                <p className="text-sm mt-1">This commodity has no observations in the selected range.</p>
              </div>
            )}
          </div>

          {/* Coverage Stats */}
          <div className="space-y-4">
            <div>
              <p className="text-sm text-[#64736B] mb-1">Reporting Markets</p>
              <p className="text-2xl font-bold text-[#17241F]">{marketCount}</p>
              <p className="text-xs text-[#64736B]">markets with published prices</p>
            </div>
            <div>
              <p className="text-sm text-[#64736B] mb-1">Published Observations</p>
              <p className="text-2xl font-bold text-[#17241F]">{observationCount}</p>
              <p className="text-xs text-[#64736B]">verified price records</p>
            </div>
          </div>

          {/* Freshness */}
          <div>
            <p className="text-sm text-[#64736B] mb-2">Data Freshness</p>
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  freshness.color === 'green'
                    ? 'bg-emerald-500'
                    : freshness.color === 'blue'
                    ? 'bg-blue-500'
                    : freshness.color === 'amber'
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
              />
              <span className="font-medium text-[#17241F]">{freshness.label}</span>
            </div>
            {latestObservationDate && (
              <p className="text-xs text-[#64736B]">
                Latest:{' '}
                {new Date(latestObservationDate).toLocaleDateString('en-NG', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            )}
            <div className="mt-4 pt-4 border-t border-[#E3EAE5]">
              <div className="flex items-center gap-2 text-xs text-[#64736B]">
                <Activity className="w-3.5 h-3.5" />
                <span>Verified field observations</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
