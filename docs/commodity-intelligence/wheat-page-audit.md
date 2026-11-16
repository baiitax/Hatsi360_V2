# Wheat Commodity Page — Baseline Audit

**Audit Date:** 2026-01-XX
**Auditor:** Arena AI
**Status:** Complete

---

## 1. Existing Implementation

### Route
`src/app/(site)/commodities/[slug]/page.tsx`

### Current Data Displayed (Wheat)
- 21 published observations
- 8 reporting markets
- 1 quoted unit: bag
- 1 recorded grade: Milling grade
- Comparable movement: +0.6% (+₦300)
- 8 comparable series
- Market-level reporting table

### Current Page Structure
1. **PageHeader** — Commodity name, description, 2 actions (Price history, Chart it)
2. **Market Overview Cards** — 4 cards: Observations, Reporting markets, Units quoted, Grades recorded
3. **IntelligenceOverviewPanel** — FAOSTAT/USDA intelligence (production, yield, self-sufficiency, stock-to-use, exports, imports)
4. **FundamentalSignalsPanel** — Field-reported fundamental signals
5. **Movement Section** — Price movement indicator with explanation
6. **Comparable Series Table** — 8 series with technical labels
7. **Reporting Markets Table** — Latest price per market
8. **Time Range Nav** — 30d, 90d, 6m, 1y, all
9. **Synonyms** — Alternative names
10. **Latest observation footer**

---

## 2. Issues Identified

### A. Comparable Series Presentation ⚠️ HIGH PRIORITY

**Current:**
```
wholesale transaction · grade 13 · unit 4 · NGN
retail transaction · grade 13 · unit 4 · NGN
```

**Problem:** Uses internal IDs (grade 13, unit 4) instead of human-readable labels.

**Should be:**
```
Wholesale · Milling grade · Bag · NGN
Retail · Milling grade · Bag · NGN
```

**Root cause:** `getCommoditySeriesOptions()` in `src/lib/trade/queries.ts` uses `key.gradeId` and `key.unitId` which are database IDs, not names.

**Fix required:** Join with grades and units tables to get names, or use the observation's `gradeName` and `unitCode` fields.

---

### B. Price Movement Presentation ⚠️ MEDIUM PRIORITY

**Current:** Shows +0.6% (+₦300) with explanation text.

**Problem:** 
- Does not show the actual latest and previous observation values
- Does not show the dates of the two observations
- Does not show which market/series the movement is from

**Should show:**
- Latest: ₦52,300 (10 Nov 2026, Dawanau)
- Previous: ₦52,000 (3 Nov 2026, Dawanau)
- Change: +₦300 (+0.6%)
- Series: Wholesale · Milling grade · Bag · NGN

---

### C. Fundamental Intelligence ⚠️ MEDIUM PRIORITY

**Current:** Shows "Commodity fundamentals are not yet available" if no data.

**Problem:** No professional empty state explaining what's coming.

**Should show:** Professional intelligence architecture with clear labels for what's available vs. what's being integrated.

---

### D. Reporting Markets ⚠️ LOW PRIORITY

**Current:** Table with Market, Price, Unit, Grade, Status, Observed columns.

**Issues:**
- No sorting capability
- No filtering by region/grade/price type
- No market detail links
- Date format could be more readable

---

### E. Loading Behaviour ⚠️ LOW PRIORITY

**Current:** Uses `PanelSkeleton` for loading state.

**Problem:** Server component should not show loading placeholders if data is fetched server-side.

**Investigation needed:** Check if there's client-side hydration causing loading states.

---

## 3. Missing Features (Per Brief)

| Feature | Status | Priority |
|---------|--------|----------|
| Commodity Hero with image | ❌ Missing | High |
| Breadcrumb navigation | ❌ Missing | High |
| Latest price card (detailed) | ❌ Missing | High |
| Freshness indicator | ❌ Missing | High |
| Advanced price chart (Recharts) | ❌ Missing | High |
| Market comparison chart | ❌ Missing | Medium |
| Grade & quality intelligence | ❌ Missing | Medium |
| Seasonal intelligence | ❌ Missing | Low |
| Research integration | ❌ Missing | Medium |
| Watchlist/alert actions | ❌ Missing | Medium |
| Premium analytics area | ❌ Missing | Low |

---

## 4. Data Source Map

| Data | Source | Current Use |
|------|--------|-------------|
| Commodity record | `commodities` table | ✅ Used |
| Price observations | `price_observations` table | ✅ Used |
| Markets | `markets` table | ✅ Used |
| Grades | `grades` table | ❌ Only IDs shown |
| Units | `units` table | ❌ Only IDs shown |
| Price types | Enum | ✅ Used |
| Intelligence overview | `analytics_commodity_overview` view | ✅ Used |
| Fundamental signals | Field-reported | ✅ Used |
| Market movements | `getMarketMovements()` | ✅ Used |
| Series options | `getCommoditySeriesOptions()` | ✅ Used (but labels need fix) |

---

## 5. Component Inventory

| Component | File | Reusable? |
|-----------|------|-----------|
| `PageContainer` | `src/components/terminal/TerminalShell.tsx` | ✅ Yes |
| `PageHeader` | `src/components/terminal/TerminalShell.tsx` | ✅ Yes |
| `SectionHeader` | `src/components/terminal/TerminalShell.tsx` | ✅ Yes |
| `MarketOverviewCard` | `src/components/market/MarketOverview.tsx` | ✅ Yes |
| `PriceMovementIndicator` | `src/components/market/PriceDisplay.tsx` | ✅ Yes |
| `VerificationBadge` | `src/components/ui/data-display.tsx` | ✅ Yes |
| `EmptyStatePanel` | `src/components/feedback/TerminalFeedback.tsx` | ✅ Yes |
| `PanelSkeleton` | `src/components/feedback/TerminalFeedback.tsx` | ✅ Yes |
| `IntelligenceOverviewPanel` | `src/components/intelligence/IntelligencePanels.tsx` | ✅ Yes |
| `FundamentalSignalsPanel` | `src/components/intelligence/IntelligencePanels.tsx` | ✅ Yes |
| `IntelligenceBadge` | `src/components/intelligence/IntelligenceIndicators.tsx` | ✅ Yes |

---

## 6. SEO Metadata (Current)

```typescript
title: `${commodity.name} Prices & Market Intelligence | Hatsi360 Markets`
description: commodity.description ?? `Explore ${commodity.name} prices...`
openGraph: ✅ Present with social card
twitter: ✅ Present with social card
```

**Status:** ✅ Good — already updated in previous SEO work.

---

## 7. Recommendations

### Immediate Fixes (Stage 1)
1. Fix comparable series labels to show human-readable names
2. Enhance price movement section with actual observation details
3. Improve empty states for fundamentals

### Architecture (Stage 2)
1. Create reusable `CommodityHero` component
2. Create `MarketSnapshot` component with latest price card
3. Create `PriceAnalyticsChart` component using Recharts
4. Create `MarketComparisonTable` with sorting/filtering

### Enhancement (Stage 3-8)
1. Add breadcrumb navigation
2. Add freshness indicator
3. Add grade/quality intelligence section
4. Add seasonal intelligence (if data available)
5. Add research integration
6. Add watchlist/alert actions

---

**Next step:** Create `wheat-data-source-map.md` and `wheat-analytics-audit.md`, then proceed to implementation.
