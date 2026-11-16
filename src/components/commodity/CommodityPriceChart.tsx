'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';

interface PriceObservation {
  id: string;
  amount: number;
  collectedAt: string;
  marketName?: string | null;
  gradeName?: string | null;
  unitCode?: string | null;
  currencyCode: string;
  priceType: string;
}

interface CommodityPriceChartProps {
  observations: PriceObservation[];
  commodityName: string;
  seriesLabel?: string;
}

type DateRange = '7d' | '30d' | '90d' | '6m' | '1y' | 'all';

export function CommodityPriceChart({
  observations,
  commodityName,
  seriesLabel,
}: CommodityPriceChartProps) {
  const [dateRange, setDateRange] = useState<DateRange>('90d');

  // Filter observations by date range
  const filteredObservations = useMemo(() => {
    if (dateRange === 'all') return observations;

    const now = new Date();
    const daysMap: Record<DateRange, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '6m': 180,
      '1y': 365,
      'all': 999999,
    };
    const days = daysMap[dateRange];
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return observations.filter((obs) => new Date(obs.collectedAt) >= cutoff);
  }, [observations, dateRange]);

  // Prepare chart data - aggregate by date if multiple observations per day
  const chartData = useMemo(() => {
    const byDate = new Map<string, { total: number; count: number; date: string }>();

    filteredObservations.forEach((obs) => {
      const date = obs.collectedAt.split('T')[0];
      const existing = byDate.get(date);
      if (existing) {
        existing.total += obs.amount;
        existing.count += 1;
      } else {
        byDate.set(date, { total: obs.amount, count: 1, date });
      }
    });

    return Array.from(byDate.values())
      .map((entry) => ({
        date: entry.date,
        price: entry.total / entry.count,
        observations: entry.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredObservations]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;

    const prices = chartData.map((d) => d.price);
    const latest = prices[prices.length - 1];
    const first = prices[0];
    const change = latest - first;
    const changePercent = (change / first) * 100;
    const highest = Math.max(...prices);
    const lowest = Math.min(...prices);

    return { latest, first, change, changePercent, highest, lowest, count: chartData.length };
  }, [chartData]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency === 'NGN' ? 'NGN' : 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (observations.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-[#E3EAE5] p-8">
        <div className="text-center">
          <TrendingUp className="w-12 h-12 text-[#E3EAE5] mx-auto mb-3" />
          <h3 className="text-lg font-medium text-[#17241F] mb-2">No price data available</h3>
          <p className="text-sm text-[#64736B]">
            {commodityName} has no published price observations for the selected filters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-[#E3EAE5] p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[#17241F] mb-1">Price History</h3>
          {seriesLabel && <p className="text-sm text-[#64736B]">{seriesLabel}</p>}
        </div>

        {/* Date Range Selector */}
        <div className="flex gap-1 flex-wrap">
          {(['7d', '30d', '90d', '6m', '1y', 'all'] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                dateRange === range
                  ? 'bg-[#103C2D] text-white'
                  : 'bg-[#F7F9F7] text-[#64736B] hover:bg-[#EAF4EE]'
              }`}
            >
              {range === 'all' ? 'All' : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3EAE5" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 11, fill: '#64736B' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64736B' }}
                  tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E3EAE5',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [
                    formatMoney(Number(value), observations[0]?.currencyCode || 'NGN'),
                    'Price',
                  ]}
                  labelFormatter={(label) =>
                    new Date(String(label)).toLocaleDateString('en-NG', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  }
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#103C2D"
                  strokeWidth={2}
                  dot={{ fill: '#103C2D', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#C7A45A' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Statistics */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#E3EAE5]">
              <div>
                <p className="text-sm text-[#64736B] mb-1">Latest Price</p>
                <p className="text-lg font-bold text-[#17241F]">
                  {formatMoney(stats.latest, observations[0]?.currencyCode || 'NGN')}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#64736B] mb-1">Period Change</p>
                <div className="flex items-center gap-2">
                  {stats.change > 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  ) : stats.change < 0 ? (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  ) : null}
                  <p
                    className={`text-lg font-bold ${
                      stats.change > 0
                        ? 'text-emerald-600'
                        : stats.change < 0
                        ? 'text-red-600'
                        : 'text-[#64736B]'
                    }`}
                  >
                    {stats.change > 0 ? '+' : ''}
                    {stats.changePercent.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-[#64736B] mb-1">Period High</p>
                <p className="text-lg font-bold text-[#17241F]">
                  {formatMoney(stats.highest, observations[0]?.currencyCode || 'NGN')}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#64736B] mb-1">Period Low</p>
                <p className="text-lg font-bold text-[#17241F]">
                  {formatMoney(stats.lowest, observations[0]?.currencyCode || 'NGN')}
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-[#E3EAE5] flex items-center justify-between text-xs text-[#64736B]">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {chartData.length} data point{chartData.length !== 1 ? 's' : ''}
              </span>
            </div>
            <span>
              {chartData.length > 0 && (
                <>
                  {formatDate(chartData[0].date)} - {formatDate(chartData[chartData.length - 1].date)}
                </>
              )}
            </span>
          </div>
        </>
      ) : (
        <div className="h-[400px] flex items-center justify-center">
          <div className="text-center">
            <Calendar className="w-12 h-12 text-[#E3EAE5] mx-auto mb-3" />
            <p className="text-[#64736B]">No observations in the selected date range</p>
            <button
              onClick={() => setDateRange('all')}
              className="mt-3 text-sm text-[#103C2D] hover:underline font-medium"
            >
              View all available data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
