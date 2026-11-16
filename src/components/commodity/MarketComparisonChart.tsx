'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { BarChart3 } from 'lucide-react';

interface MarketPrice {
  marketId: number;
  marketName: string;
  stateName?: string | null;
  amount: number;
  currencyCode: string;
  unitCode?: string | null;
  gradeName?: string | null;
  priceType: string;
  collectedAt: string;
}

interface MarketComparisonChartProps {
  marketPrices: MarketPrice[];
  commodityName: string;
  seriesLabel?: string;
}

export function MarketComparisonChart({
  marketPrices,
  commodityName,
  seriesLabel,
}: MarketComparisonChartProps) {
  if (marketPrices.length === 0) {
    return (
      <div aria-label="Market price comparison chart" className="bg-white rounded-lg border border-[#E3EAE5] p-8">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-[#E3EAE5] mx-auto mb-3" aria-hidden="true" />
          <h3 className="text-lg font-medium text-[#17241F] mb-2">No market data available</h3>
          <p className="text-sm text-[#64736B]">
            {commodityName} has no published prices across different markets for comparison.
          </p>
        </div>
      </div>
    );
  }

  // Sort by price (highest to lowest)
  const sortedMarkets = [...marketPrices].sort((a, b) => b.amount - a.amount);

  // Find price range for context
  const prices = sortedMarkets.map((m) => m.amount);
  const highestPrice = Math.max(...prices);
  const lowestPrice = Math.min(...prices);
  const priceRange = highestPrice - lowestPrice;
  const priceSpread = lowestPrice > 0 ? ((priceRange / lowestPrice) * 100).toFixed(1) : '0';

  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency === 'NGN' ? 'NGN' : 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Color scale: green for low prices, red for high prices
  const getBarColor = (price: number) => {
    if (priceRange === 0) return '#103C2D';
    const position = (price - lowestPrice) / priceRange;
    // Interpolate between green (#103C2D) and gold (#C7A45A)
    if (position < 0.5) {
      return '#103C2D'; // Forest green for lower prices
    } else {
      return '#C7A45A'; // Gold for higher prices
    }
  };

  return (
    <div aria-label="Market price comparison chart" className="bg-white rounded-lg border border-[#E3EAE5] p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-[#17241F] mb-1">Market Price Comparison</h3>
        {seriesLabel && <p className="text-sm text-[#64736B]">{seriesLabel}</p>}
        <p className="text-sm text-[#64736B] mt-2">
          Latest published prices across {marketPrices.length} reporting market
          {marketPrices.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Price Range Info */}
      <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-[#F7F9F7] rounded-lg">
        <div>
          <p className="text-xs text-[#64736B] mb-1">Highest Price</p>
          <p className="text-lg font-bold text-[#17241F]">
            {formatMoney(highestPrice, marketPrices[0]?.currencyCode || 'NGN')}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#64736B] mb-1">Lowest Price</p>
          <p className="text-lg font-bold text-[#17241F]">
            {formatMoney(lowestPrice, marketPrices[0]?.currencyCode || 'NGN')}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#64736B] mb-1">Price Spread</p>
          <p className="text-lg font-bold text-[#103C2D]">{priceSpread}%</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedMarkets}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E3EAE5" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: '#64736B' }}
              tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey="marketName"
              tick={{ fontSize: 11, fill: '#17241F' }}
              width={80}
              tickFormatter={(value) => value.split(' ')[0]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E3EAE5',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value, name, props: any) => {
                const market = props.payload as MarketPrice;
                return [
                  formatMoney(Number(value), market.currencyCode),
                  'Latest Price',
                ];
              }}
              labelFormatter={(label) => {
                const market = sortedMarkets.find((m) => m.marketName === label);
                if (!market) return label;
                return `${market.marketName}${market.stateName ? `, ${market.stateName}` : ''}`;
              }}
            />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
              {sortedMarkets.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.amount)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Market Details */}
      <div className="mt-6 pt-6 border-t border-[#E3EAE5]">
        <h4 className="text-sm font-semibold text-[#17241F] mb-3">Market Details</h4>
        <div className="space-y-2">
          {sortedMarkets.map((market) => (
            <div
              key={market.marketId}
              className="flex items-center justify-between p-3 bg-[#F7F9F7] rounded-lg"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-[#17241F]">{market.marketName}</p>
                {market.stateName && (
                  <p className="text-xs text-[#64736B]">{market.stateName}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-[#17241F]">
                  {formatMoney(market.amount, market.currencyCode)}
                </p>
                <p className="text-xs text-[#64736B]">
                  {market.gradeName} · {market.priceType}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-[#E3EAE5] flex items-center justify-center gap-6 text-xs text-[#64736B]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#103C2D]" />
          <span>Lower price</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#C7A45A]" />
          <span>Higher price</span>
        </div>
      </div>
    </div>
  );
}
