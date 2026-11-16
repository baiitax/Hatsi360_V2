# Wheat Commodity — Data Source Map

**Document Version:** 1.0
**Created:** 2026-01-XX

---

## 1. Primary Data Sources

### Commodity Record
| Field | Table | Column | Notes |
|-------|-------|--------|-------|
| id | `commodities` | `id` | Primary key |
| name | `commodities` | `name` | "Wheat" |
| slug | `commodities` | `slug` | "wheat" |
| description | `commodities` | `description` | Nullable text |
| category | `commodities` | `category` | "Cereals" or similar |
| synonyms | `commodities` | `synonyms` | Text array |
| image_url | `commodities` | `image_url` | Nullable |

### Price Observations
| Field | Table | Column | Notes |
|-------|-------|--------|-------|
| id | `price_observations` | `id` | Primary key |
| commodity_id | `price_observations` | `commodity_id` | FK to commodities |
| market_id | `price_observations` | `market_id` | FK to markets |
| reported_amount | `price_observations` | `reported_amount` | Original price |
| normalized_amount | `price_observations` | `normalized_amount` | Standardized price |
| currency_code | `price_observations` | `currency_code` | "NGN" |
| unit_id | `price_observations` | `unit_id` | FK to units |
| unit_code | `price_observations` | `unit_code` | "bag" |
| grade_id | `price_observations` | `grade_id` | FK to grades |
| grade_name | `price_observations` | `grade_name` | "Milling grade" |
| price_type | `price_observations` | `price_type` | Enum: wholesale, retail, etc. |
| collected_at | `price_observations` | `collected_at` | Timestamp |
| published_at | `price_observations` | `published_at` | Timestamp |
| verification_status | `price_observations` | `verification_status` | Enum |

### Markets
| Field | Table | Column | Notes |
|-------|-------|--------|-------|
| id | `markets` | `id` | Primary key |
| name | `markets` | `name` | "Dawanau International Grains Market" |
| slug | `markets` | `slug` | "dawanau-international-grains-market" |
| state_name | `markets` | `state_name` | "Kano" |
| is_active | `markets` | `is_active` | Boolean |

### Grades
| Field | Table | Column | Notes |
|-------|-------|--------|-------|
| id | `grades` | `id` | Primary key (currently shown as "grade 13") |
| name | `grades` | `name` | "Milling grade" (should be shown instead of ID) |
| commodity_id | `grades` | `commodity_id` | FK to commodities |

### Units
| Field | Table | Column | Notes |
|-------|-------|--------|-------|
| id | `units` | `id` | Primary key (currently shown as "unit 4") |
| code | `units` | `code` | "bag" (should be shown instead of ID) |
| name | `units` | `name` | "Bag" |

---

## 2. Intelligence Data Sources

### Analytics Commodity Overview
| Field | View | Column | Notes |
|-------|------|--------|-------|
| commodity_id | `analytics_commodity_overview` | `commodity_id` | |
| commodity_name | `analytics_commodity_overview` | `commodity_name` | |
| commodity_slug | `analytics_commodity_overview` | `commodity_slug` | |
| latest_production_year | `analytics_commodity_overview` | `latest_production_year` | FAOSTAT |
| latest_production_mt | `analytics_commodity_overview` | `latest_production_mt` | Metric tonnes |
| latest_yield_mt_per_ha | `analytics_commodity_overview` | `latest_yield_mt_per_ha` | |
| self_sufficiency_percent | `analytics_commodity_overview` | `self_sufficiency_percent` | |
| stock_to_use_percent | `analytics_commodity_overview` | `stock_to_use_percent` | |
| latest_exports_mt | `analytics_commodity_overview` | `latest_exports_mt` | |
| latest_imports_mt | `analytics_commodity_overview` | `latest_imports_mt` | |
| total_evidence_records | `analytics_commodity_overview` | `total_evidence_records` | |

### Fundamental Signals
| Field | Source | Notes |
|-------|--------|-------|
| signal_type | Field-reported | Production, supply, demand, trade |
| commodity_id | Field-reported | |
| value | Field-reported | Numeric or text |
| reporting_period | Field-reported | Date or period |
| source | Field-reported | Agent or institution |

---

## 3. Data Service Functions

| Function | File | Purpose |
|----------|------|---------|
| `getDataSource()` | `src/lib/data/index.ts` | Returns data source instance |
| `source.getCommodityBySlug(slug)` | Data source | Fetch commodity by slug |
| `source.listObservationsForAnalysis({commodityId})` | Data source | Fetch all observations |
| `getCommoditySeriesOptions(commodityId)` | `src/lib/trade/queries.ts` | Get comparable series |
| `getMarketMovements(limit)` | `src/lib/trade/queries.ts` | Get price movements |
| `getCommodityIntelligenceOverview(slug)` | `src/lib/intelligence/commodity-intelligence.ts` | FAOSTAT intelligence |
| `getCommodityFundamentals(commodityId, limit)` | `src/lib/intelligence/commodity-intelligence.ts` | Field signals |

---

## 4. Data Flow

```
User request: /commodities/wheat
    ↓
CommodityProfilePage (server component)
    ↓
getDataSource() → source.getCommodityBySlug('wheat')
    ↓
source.listObservationsForAnalysis({commodityId: wheat.id})
    ↓
applyRange(observations, range.days) → windowed observations
    ↓
groupByMarket(windowed) → per-market rollup
    ↓
getCommoditySeriesOptions(wheat.id) → series options
getMarketMovements(200) → movements
getCommodityIntelligenceOverview('wheat') → intelligence
getCommodityFundamentals(wheat.id, 10) → signals
    ↓
Render page with all data
```

---

## 5. Data Quality Notes

### Wheat-Specific Observations
- **21 observations** across **8 markets**
- **1 unit**: bag (unit_id: 4)
- **1 grade**: Milling grade (grade_id: 13)
- **Price types**: wholesale, retail (likely)
- **Currency**: NGN (Nigerian Naira)
- **Latest observation**: Need to verify date from database

### Comparable Series Issue
The 8 series likely represent:
- Wholesale × Milling grade × Bag × NGN (multiple markets)
- Retail × Milling grade × Bag × NGN (multiple markets)

The current UI shows "grade 13 · unit 4" instead of "Milling grade · Bag" because `getCommoditySeriesOptions()` uses IDs instead of joining with grades/units tables.

---

## 6. Missing Data (Not Yet Available)

| Data Type | Status | Notes |
|-----------|--------|-------|
| Detailed grade specifications | ❌ Not in schema | Protein content, moisture, etc. |
| Seasonal patterns | ❌ Insufficient history | Need 12+ months of data |
| Global trade flows | ❌ Not integrated | UN Comtrade, FAOSTAT trade |
| Nigerian production stats | ❌ Not integrated | NBS, FAO Nigeria |
| Quality test results | ❌ Not collected | Field agent quality data |
| Supply/demand balance | ⚠️ Partial | Via analytics_commodity_overview |

---

## 7. Recommendations for Data Enhancement

### Short-term (Fix existing data presentation)
1. Join series options with grades/units tables for human-readable labels
2. Show actual latest/previous observation values in movement section
3. Add observation dates to movement explanation

### Medium-term (Integrate additional data)
1. Add grade specifications from authoritative sources (if available)
2. Integrate FAOSTAT trade data for global context
3. Add seasonal analysis when 12+ months of data available

### Long-term (Advanced intelligence)
1. Field agent quality data collection
2. Nigerian official statistics integration
3. AI-assisted commodity analysis

---

**Next:** See `wheat-analytics-audit.md` for chart and analytics review.
