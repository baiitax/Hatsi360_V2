# Commodity Profile Redesign Plan

**Document Version:** 1.0
**Created:** 2026-01-XX
**Status:** Implementation Ready

---

## 1. Design Vision

Transform the commodity profile page from a basic data display into a **professional market intelligence workspace** that answers five questions:

1. **What is happening?** — Latest prices and market activity
2. **Where is it happening?** — Reporting markets and regional comparisons
3. **Why might it be happening?** — Production, supply, demand fundamentals
4. **What should I understand?** — Historical trends, quality, seasonal behavior
5. **What can I do next?** — Compare markets, save intelligence, set alerts, access reports

---

## 2. New Information Architecture

### Page Structure (Top to Bottom)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. BREADCRUMB                                               │
│    Home / Commodities / Cereals / Wheat                      │
├─────────────────────────────────────────────────────────────┤
│ 2. COMMODITY HERO                                           │
│    [Wheat image]  WHEAT                                     │
│                   Global cereal commodity and major input    │
│                   into flour, food processing and feed       │
│                   supply chains.                             │
│                                                             │
│    Category: Cereals  |  Unit: Bag  |  Grades: Milling      │
│    Markets: 8  |  Observations: 21  |  Latest: 10 Nov 2026 │
│                                                             │
│    [View Price History] [Compare Markets] [Add to Watchlist]│
│    [Create Alert] [Explore Research]                        │
├─────────────────────────────────────────────────────────────┤
│ 3. MARKET SNAPSHOT                                          │
│    ┌──────────────┬──────────────┬──────────────┐          │
│    │ Latest Price │  Reporting   │  Published   │          │
│    │   ₦52,300    │   Markets    │ Observations │          │
│    │  per bag     │      8       │      21      │          │
│    │  Milling     │              │              │          │
│    │  Wholesale   │  Latest:     │  Latest:     │          │
│    │  Dawanau     │  10 Nov 2026 │  10 Nov 2026 │          │
│    │  10 Nov 2026 │              │              │          │
│    └──────────────┴──────────────┴──────────────┘          │
│                                                             │
│    Freshness: ● Recently observed (within 7 days)          │
├─────────────────────────────────────────────────────────────┤
│ 4. PRICE PERFORMANCE & ANALYTICS                            │
│    ┌─────────────────────────────────────────────────────┐ │
│    │  [LINE CHART — 400px height]                        │ │
│    │                                                     │ │
│    │  Series: [Wholesale · Milling · Bag · NGN ▼]       │ │
│    │  Market: [All Markets ▼]  Range: [90d ▼]           │ │
│    └─────────────────────────────────────────────────────┘ │
│                                                             │
│    Latest: ₦52,300 (10 Nov)  Previous: ₦52,000 (3 Nov)    │
│    Change: +₦300 (+0.6%) ↗                                 │
│                                                             │
│    High: ₦53,100  |  Low: ₦51,200  |  Avg: ₦52,050         │
├─────────────────────────────────────────────────────────────┤
│ 5. MARKET COMPARISON                                        │
│    ┌─────────────────────────────────────────────────────┐ │
│    │  [HORIZONTAL BAR CHART]                             │ │
│    │  Dawanau        ████████████████████ ₦52,300        │ │
│    │  Mile 12        ███████████████████  ₦52,100        │ │
│    │  Bodija         ██████████████████   ₦51,800        │ │
│    └─────────────────────────────────────────────────────┘ │
│                                                             │
│    Table: Market | Location | Price | Grade | Date          │
│    [Sort by price] [Filter by region] [View details]        │
├─────────────────────────────────────────────────────────────┤
│ 6. REPORTING MARKET INTELLIGENCE                            │
│    Detailed market cards with:                              │
│    - Market name, location                                  │
│    - Latest price, grade, unit                              │
│    - Observation count                                      │
│    - Freshness indicator                                    │
│    - Link to market detail page                             │
├─────────────────────────────────────────────────────────────┤
│ 7. WHEAT FUNDAMENTALS                                       │
│    ┌──────────────┬──────────────┬──────────────┐          │
│    │ Production   │    Yield     │    Exports   │          │
│    │  2024: 12.5M │  2.1 t/ha    │  1.2M t      │          │
│    │  tonnes      │              │              │          │
│    │  [FAOSTAT]   │  [FAOSTAT]   │  [FAOSTAT]   │          │
│    └──────────────┴──────────────┴──────────────┘          │
│                                                             │
│    If unavailable:                                          │
│    "Production and supply intelligence for Wheat is being   │
│    integrated from FAOSTAT and USDA sources. Expected       │
│    availability: Q1 2026."                                  │
├─────────────────────────────────────────────────────────────┤
│ 8. SUPPLY & DEMAND INTELLIGENCE                             │
│    Self-sufficiency: 45%                                    │
│    Stock-to-use: 18%                                        │
│    Imports: 8.5M tonnes (2024)                              │
│                                                             │
│    Narrative: "Nigeria imports approximately 55% of its     │
│    wheat consumption, primarily from Russia, USA, and       │
│    Canada. Domestic production is concentrated in the       │
│    northern states..."                                      │
├─────────────────────────────────────────────────────────────┤
│ 9. GLOBAL PRODUCTION & TRADE                                │
│    Major exporters: Russia, EU, USA, Canada, Australia      │
│    Major importers: Egypt, Indonesia, Nigeria, Turkey       │
│                                                             │
│    [Country comparison table]                               │
├─────────────────────────────────────────────────────────────┤
│ 10. SEASONAL INTELLIGENCE                                   │
│    If insufficient data:                                    │
│    "Seasonal patterns require 12+ months of comparable      │
│    data. This section will be available as the observation  │
│    history grows."                                          │
├─────────────────────────────────────────────────────────────┤
│ 11. GRADE & QUALITY INTELLIGENCE                            │
│    Grades observed: Milling grade                           │
│                                                             │
│    Standard specifications (if available):                  │
│    - Protein: 12-14%                                        │
│    - Moisture: <14%                                         │
│    - Test weight: >76 kg/hl                                 │
├─────────────────────────────────────────────────────────────┤
│ 12. TRADE & EXPORT INTELLIGENCE                             │
│    Nigerian wheat import context                            │
│    Major source countries                                   │
│    Trade corridors                                          │
├─────────────────────────────────────────────────────────────┤
│ 13. RESEARCH & PREMIUM REPORTS                              │
│    Latest Wheat-related reports:                            │
│    - "Northern Nigeria Grain Review Q3 2026" [Premium]      │
│    - "Global Wheat Outlook 2026" [Public]                   │
│                                                             │
│    [View all reports]                                       │
├─────────────────────────────────────────────────────────────┤
│ 14. DATA SOURCES & METHODOLOGY                              │
│    Data sources: Hatsi360 field agents, FAOSTAT, USDA       │
│    Methodology link                                         │
│    Last updated: 10 Nov 2026, 14:30 WAT                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Component Architecture

### New Components to Create

| Component | File | Purpose |
|-----------|------|---------|
| `CommodityBreadcrumb` | `src/components/commodity/CommodityBreadcrumb.tsx` | Breadcrumb navigation |
| `CommodityHero` | `src/components/commodity/CommodityHero.tsx` | Hero section with image and metadata |
| `MarketSnapshot` | `src/components/commodity/MarketSnapshot.tsx` | Latest price, freshness, coverage |
| `CommodityPriceChart` | `src/components/commodity/CommodityPriceChart.tsx` | Recharts line chart |
| `PricePerformanceMetrics` | `src/components/commodity/PricePerformanceMetrics.tsx` | Latest, previous, change, high, low, avg |
| `MarketComparisonChart` | `src/components/commodity/MarketComparisonChart.tsx` | Horizontal bar chart |
| `MarketComparisonTable` | `src/components/commodity/MarketComparisonTable.tsx` | Sortable/filterable table |
| `ReportingMarketCard` | `src/components/commodity/ReportingMarketCard.tsx` | Market detail card |
| `FundamentalsSection` | `src/components/commodity/FundamentalsSection.tsx` | Production, supply, demand |
| `GradeIntelligence` | `src/components/commodity/GradeIntelligence.tsx` | Grade and quality info |
| `ResearchSection` | `src/components/commodity/ResearchSection.tsx` | Related reports |
| `DataProvenance` | `src/components/commodity/DataProvenance.tsx` | Sources and methodology |

### Reusable Components (Existing)

| Component | File | Use For |
|-----------|------|---------|
| `PageContainer` | `TerminalShell.tsx` | Page wrapper |
| `SectionHeader` | `TerminalShell.tsx` | Section titles |
| `MarketOverviewCard` | `MarketOverview.tsx` | Stat cards |
| `PriceMovementIndicator` | `PriceDisplay.tsx` | Price change |
| `VerificationBadge` | `data-display.tsx` | Verification status |
| `EmptyStatePanel` | `TerminalFeedback.tsx` | Empty states |
| `IntelligenceOverviewPanel` | `IntelligencePanels.tsx` | FAOSTAT data |

---

## 4. Implementation Stages

### Stage 1 — Quick Wins (Day 1)
- [ ] Fix comparable series labels (join grades/units tables)
- [ ] Enhance price movement section with actual values
- [ ] Add breadcrumb navigation

### Stage 2 — Hero & Snapshot (Day 2)
- [ ] Create `CommodityHero` component
- [ ] Create `MarketSnapshot` component
- [ ] Integrate into page

### Stage 3 — Analytics (Day 3-4)
- [ ] Create `CommodityPriceChart` component
- [ ] Create `PricePerformanceMetrics` component
- [ ] Integrate into page

### Stage 4 — Market Comparison (Day 5)
- [ ] Create `MarketComparisonChart` component
- [ ] Create `MarketComparisonTable` component
- [ ] Integrate into page

### Stage 5 — Fundamentals & Intelligence (Day 6-7)
- [ ] Enhance `FundamentalsSection`
- [ ] Add `GradeIntelligence` section
- [ ] Add `ResearchSection`

### Stage 6 — Polish & Responsive (Day 8)
- [ ] Mobile optimization
- [ ] Loading states
- [ ] Empty states
- [ ] Final testing

---

## 5. Data Service Enhancements

### Fix Series Labels
**File:** `src/lib/trade/queries.ts`

**Current:**
```typescript
label: [
  key.priceType.replace(/_/g, ' '),
  key.gradeId ? `grade ${key.gradeId}` : 'no grade recorded',
  key.unitId ? `unit ${key.unitId}` : 'no unit recorded',
  key.currencyCode,
].join(' · '),
```

**Fixed:**
```typescript
// Join with grades and units tables
const gradeName = gradeMap.get(key.gradeId) ?? 'no grade recorded';
const unitCode = unitMap.get(key.unitId) ?? 'no unit recorded';

label: [
  key.priceType.replace(/_/g, ' '),
  gradeName,
  unitCode,
  key.currencyCode,
].join(' · '),
```

### Add Grade/Unit Lookup
**File:** `src/lib/trade/queries.ts`

```typescript
async function getGradeAndUnitMaps() {
  const supabase = await createClient();
  
  const { data: grades } = await supabase
    .from('grades')
    .select('id, name');
  
  const { data: units } = await supabase
    .from('units')
    .select('id, code, name');
  
  const gradeMap = new Map(grades?.map(g => [g.id, g.name]) ?? []);
  const unitMap = new Map(units?.map(u => [u.id, u.code]) ?? []);
  
  return { gradeMap, unitMap };
}
```

---

## 6. SEO Metadata (Already Implemented)

```typescript
title: `${commodity.name} Prices & Market Intelligence | Hatsi360 Markets`
description: commodity.description ?? `Explore ${commodity.name} prices...`
openGraph: ✅ With social card
twitter: ✅ With social card
```

**Status:** ✅ Complete from previous SEO work.

---

## 7. Reusable Architecture for Other Commodities

The new architecture will be **commodity-agnostic**:

- All components accept `commodity` prop
- Data-driven rendering (no hardcoded commodity logic)
- Configuration-based sections (enable/disable per commodity)
- Consistent design system across all commodities

**Rollout plan after Wheat:**
1. Maize
2. Sorghum
3. Millet
4. Rice
5. Soybeans
6. Sesame
7. Groundnuts
8. Cowpea
9. Hibiscus
10. Gum Arabic
11. Ginger
12. Shea

---

## 8. Success Metrics

### User Experience
- [ ] Page loads in <2 seconds
- [ ] Chart renders in <1 second
- [ ] All actions (watchlist, alert, compare) work
- [ ] Mobile layout is usable at 320px

### Data Quality
- [ ] All prices show currency and unit
- [ ] All dates are accurate
- [ ] Series labels are human-readable
- [ ] Movement calculations use comparable observations only

### Business Value
- [ ] Users can understand Wheat market at a glance
- [ ] Users can drill into analytics
- [ ] Users can compare markets
- [ ] Users can access research
- [ ] Premium features are clearly indicated

---

**Next:** Begin Stage 1 implementation — fix series labels and add breadcrumb.
