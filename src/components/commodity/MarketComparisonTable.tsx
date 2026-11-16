'use client';

import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Filter, Search } from 'lucide-react';

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

interface MarketComparisonTableProps {
  marketPrices: MarketPrice[];
  commodityName: string;
  seriesLabel?: string;
}

type SortField = 'marketName' | 'amount' | 'collectedAt' | 'gradeName' | 'priceType';
type SortDirection = 'asc' | 'desc';

export function MarketComparisonTable({
  marketPrices,
  commodityName,
  seriesLabel,
}: MarketComparisonTableProps) {
  const [sortField, setSortField] = useState<SortField>('amount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [priceTypeFilter, setPriceTypeFilter] = useState<string>('all');

  // Get unique grades and price types for filters
  const uniqueGrades = useMemo(() => {
    const grades = new Set(marketPrices.map((m) => m.gradeName).filter((g): g is string => Boolean(g)));
    return ['all', ...Array.from(grades)];
  }, [marketPrices]);

  const uniquePriceTypes = useMemo(() => {
    const types = new Set(marketPrices.map((m) => m.priceType));
    return ['all', ...Array.from(types)];
  }, [marketPrices]);

  // Filter and sort
  const filteredAndSorted = useMemo(() => {
    let filtered = marketPrices;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.marketName.toLowerCase().includes(query) ||
          m.stateName?.toLowerCase().includes(query)
      );
    }

    // Apply grade filter
    if (gradeFilter !== 'all') {
      filtered = filtered.filter((m) => m.gradeName === gradeFilter);
    }

    // Apply price type filter
    if (priceTypeFilter !== 'all') {
      filtered = filtered.filter((m) => m.priceType === priceTypeFilter);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'marketName':
          comparison = a.marketName.localeCompare(b.marketName);
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'collectedAt':
          comparison = new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime();
          break;
        case 'gradeName':
          comparison = (a.gradeName || '').localeCompare(b.gradeName || '');
          break;
        case 'priceType':
          comparison = a.priceType.localeCompare(b.priceType);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [marketPrices, searchQuery, gradeFilter, priceTypeFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency === 'NGN' ? 'NGN' : 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 ml-1" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 ml-1" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 ml-1" />
    );
  };

  return (
    <div className="bg-white rounded-lg border border-[#E3EAE5] p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-[#17241F] mb-1">Market Comparison Table</h3>
        {seriesLabel && <p className="text-sm text-[#64736B]">{seriesLabel}</p>}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64736B]" />
          <input
            type="text"
            placeholder="Search markets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#E3EAE5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#103C2D]/20 focus:border-[#103C2D]"
          />
        </div>

        {/* Grade Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64736B]" />
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#E3EAE5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#103C2D]/20 focus:border-[#103C2D] appearance-none bg-white"
          >
            {uniqueGrades.map((grade) => (
              <option key={grade} value={grade}>
                {grade === 'all' ? 'All Grades' : grade}
              </option>
            ))}
          </select>
        </div>

        {/* Price Type Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64736B]" />
          <select
            value={priceTypeFilter}
            onChange={(e) => setPriceTypeFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#E3EAE5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#103C2D]/20 focus:border-[#103C2D] appearance-none bg-white"
          >
            {uniquePriceTypes.map((type) => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Price Types' : type.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Results Count */}
        <div className="flex items-center px-3 py-2 bg-[#F7F9F7] rounded-lg text-sm text-[#64736B]">
          {filteredAndSorted.length} of {marketPrices.length} markets
        </div>
      </div>

      {/* Table */}
      {filteredAndSorted.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E3EAE5]">
                <th
                  className="text-left py-3 px-4 text-xs font-semibold text-[#64736B] uppercase tracking-wider cursor-pointer hover:text-[#103C2D] transition-colors"
                  onClick={() => handleSort('marketName')}
                >
                  <div className="flex items-center">
                    Market
                    <SortIcon field="marketName" />
                  </div>
                </th>
                <th
                  className="text-right py-3 px-4 text-xs font-semibold text-[#64736B] uppercase tracking-wider cursor-pointer hover:text-[#103C2D] transition-colors"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center justify-end">
                    Price
                    <SortIcon field="amount" />
                  </div>
                </th>
                <th
                  className="text-left py-3 px-4 text-xs font-semibold text-[#64736B] uppercase tracking-wider cursor-pointer hover:text-[#103C2D] transition-colors"
                  onClick={() => handleSort('gradeName')}
                >
                  <div className="flex items-center">
                    Grade
                    <SortIcon field="gradeName" />
                  </div>
                </th>
                <th
                  className="text-left py-3 px-4 text-xs font-semibold text-[#64736B] uppercase tracking-wider cursor-pointer hover:text-[#103C2D] transition-colors"
                  onClick={() => handleSort('priceType')}
                >
                  <div className="flex items-center">
                    Price Type
                    <SortIcon field="priceType" />
                  </div>
                </th>
                <th
                  className="text-right py-3 px-4 text-xs font-semibold text-[#64736B] uppercase tracking-wider cursor-pointer hover:text-[#103C2D] transition-colors"
                  onClick={() => handleSort('collectedAt')}
                >
                  <div className="flex items-center justify-end">
                    Observed
                    <SortIcon field="collectedAt" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.map((market) => (
                <tr
                  key={market.marketId}
                  className="border-b border-[#E3EAE5]/50 hover:bg-[#F7F9F7] transition-colors"
                >
                  <td className="py-4 px-4">
                    <div>
                      <p className="text-sm font-medium text-[#17241F]">{market.marketName}</p>
                      {market.stateName && (
                        <p className="text-xs text-[#64736B]">{market.stateName}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <p className="text-sm font-bold text-[#17241F]">
                      {formatMoney(market.amount, market.currencyCode)}
                    </p>
                    <p className="text-xs text-[#64736B]">
                      per {market.unitCode || 'unit'}
                    </p>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-[#17241F]">
                      {market.gradeName || '—'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[#EAF4EE] text-[#103C2D]">
                      {market.priceType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-sm text-[#64736B]">
                      {formatDate(market.collectedAt)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-[#64736B]">No markets match the selected filters</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setGradeFilter('all');
              setPriceTypeFilter('all');
            }}
            className="mt-3 text-sm text-[#103C2D] hover:underline font-medium"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-[#E3EAE5] text-xs text-[#64736B] flex items-center justify-between">
        <span>
          Showing {filteredAndSorted.length} of {marketPrices.length} reporting markets
        </span>
        <span>Click column headers to sort</span>
      </div>
    </div>
  );
}
