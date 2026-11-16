# Stage 6: Nigerian & Regional Intelligence — Complete ✅

**Commit:** `15dcb3d`
**Date:** 2026-01-XX

---

## Overview

Stage 6 adds comprehensive Nigerian and regional market intelligence, showing how prices vary across Nigerian states and providing context on Nigeria's supply-demand balance and trade relationships.

---

## Components Created

### 1. RegionalIntelligence (`src/components/commodity/RegionalIntelligence.tsx`)

A unified section with three data-driven cards:

#### Nigerian Market Context Card
- **Domestic Production**: Latest production volume in metric tonnes with year
- **Total Supply**: Combined domestic production + imports + other supply sources
- **Total Demand**: Total consumption across food, industrial, feed, and other uses
- **Stock-to-Use Ratio**: Color-coded indicator (comfortable/adequate/tight)
  - ≥20%: Green "Comfortable" — supply buffer is comfortable
  - 10-20%: Yellow "Adequate" — supply buffer is adequate
  - <10%: Red "Tight" — supply buffer is tight

#### State Price Breakdown Card
- **Visual Bar Chart**: Horizontal bars showing average prices by state
- **Color Coding**:
  - Green bar = lowest price state
  - Red bar = highest price state
  - Gold bars = other states
- **Price Spread Summary**: Shows lowest, highest, and spread at the top
- **Market Count**: Number of reporting markets per state
- **Sorted**: By average price (highest to lowest)

#### Trade Partners Card
- **Top Import Sources**: Ranked list with percentage of total imports
- **Top Export Destinations**: Ranked list with percentage of total exports
- **Visual Progress Bars**: Shows each partner's share of total trade
- **Volume Labels**: Shows actual metric tonnes for each partner

---

## Data Flow

```
User request: /commodities/wheat
    ↓
CommodityProfilePage (server component)
    ↓
Fetch data in parallel:
  - intelligenceSummary (production, supply-demand, trade from commodity_* tables)
  - observations (all price observations with stateName)
    ↓
prepareStateBreakdown(observations):
  - Group by stateName
  - Calculate avg/min/max price per state
  - Count markets and observations per state
    ↓
Pass to RegionalIntelligence:
  - intelligence: CommodityIntelligenceSummary
  - stateBreakdown: StatePriceBreakdown[]
    ↓
Render three cards with data
```

---

## Technical Implementation

### Helper Function: `prepareStateBreakdown`

```typescript
function prepareStateBreakdown(observations: PriceObservation[]): StatePriceBreakdown[]
```

**Logic:**
1. Group observations by `stateName`
2. For each state:
   - Extract prices (normalized or reported amount)
   - Calculate average, min, max
   - Count unique markets
   - Count total observations
   - Find latest observation date
3. Return array of `StatePriceBreakdown` objects

**Type Safety:**
- Handles null/undefined prices gracefully
- Defaults to 'Unknown' for missing state names
- Uses `?? 0` fallbacks for calculations

### Component Props

```typescript
interface RegionalIntelligenceProps {
  intelligence: CommodityIntelligenceSummary | null;
  stateBreakdown: StatePriceBreakdown[];
  commodityName: string;
  commoditySlug: string;
}

interface StatePriceBreakdown {
  stateName: string;
  marketCount: number;
  observationCount: number;
  avgPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  latestDate: string;
  currencyCode: string;
}
```

---

## Page Integration

**Location in page structure:**
```
1. CommodityHero
2. MarketSnapshot
3. Overview Cards
4. Commodity Fundamentals (Stage 5)
5. Price Performance Metrics (Stage 3)
6. Price Chart (Stage 4)
7. Market Comparison Chart (Stage 4)
8. Market Comparison Table (Stage 4)
9. **Regional Intelligence (Stage 6)** ← NEW
10. Comparable Series
11. Reporting Markets Table
12. Reporting Market Cards (Stage 5)
13. Time Range Navigation
14. Synonyms
```

**Rationale:** Placed after Market Comparison to provide regional context after detailed market-level analysis.

---

## Data Sources

### Nigerian Market Context
- **Source**: `commodity_production`, `commodity_supply`, `commodity_demand` tables
- **Filter**: `country_code = 'NGA'` (Nigeria)
- **Via**: `getCommodityIntelligenceSummary(slug)` from intelligence service

### State Price Breakdown
- **Source**: `price_observations` table
- **Field**: `stateName` (from markets table join)
- **Calculated**: Average, min, max per state from all observations

### Trade Partners
- **Source**: `commodity_trade` table
- **Filter**: `reporter_country = 'NGA'`
- **Aggregated**: Top 5 import sources and export destinations by volume

---

## Design Decisions

### 1. Stock-to-Use Ratio Thresholds
- **≥20%**: Comfortable (green) — Standard food security threshold
- **10-20%**: Adequate (yellow) — Acceptable buffer
- **<10%**: Tight (red) — Warning level per FAO guidelines

### 2. State Breakdown Sorting
- **Sorted by**: Average price (highest to lowest)
- **Why**: Shows price dispersion immediately, highlights expensive vs cheap regions

### 3. Trade Partner Visualization
- **Shows**: Percentage of total trade + absolute volume
- **Why**: Percentage shows relative importance, volume shows scale

### 4. Empty States
- **When**: No data available for any card
- **Message**: "Regional price breakdown and Nigerian market context will appear here as observations are collected"
- **Why**: Honest about data availability, no fabrication

---

## Testing Checklist

- [x] Build passes with 0 TypeScript errors
- [x] Handles null/undefined intelligence data gracefully
- [x] Handles states with no price data
- [x] Color coding works for stock-to-use ratio
- [x] State bars scale correctly relative to highest price
- [x] Trade partner percentages sum correctly
- [x] Responsive layout (1/2/3 columns)
- [x] No horizontal overflow on mobile
- [x] Currency formatting correct (NGN)

---

## Reusability

This component is **fully commodity-agnostic** and can be used for:
- Maize
- Sorghum
- Millet
- Rice
- Soybeans
- Sesame
- Groundnuts
- Cowpea
- Hibiscus
- Gum Arabic
- Ginger
- Shea

**No changes needed** — all logic is data-driven.

---

## Files Modified

### New Files (1)
- `src/components/commodity/RegionalIntelligence.tsx` — 349 lines

### Modified Files (1)
- `src/app/(site)/commodities/[slug]/page.tsx`
  - Added import for `RegionalIntelligence` and `StatePriceBreakdown`
  - Added `prepareStateBreakdown` helper function
  - Added `stateBreakdown` data preparation
  - Added `<RegionalIntelligence>` section in render

---

## Next Steps

**Stage 7: Quality & Seasonal Intelligence**
- Grade specifications display
- Seasonal pattern analysis (requires 12+ months of data)
- Quality attributes (when available from field agents)

---

**Delivered by:** Arena AI Agent
**Build Status:** ✅ 0 errors, 0 warnings
**Commit:** `15dcb3d`
