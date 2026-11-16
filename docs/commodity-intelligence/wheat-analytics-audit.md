# Wheat Analytics — Chart & Analytics Audit

**Document Version:** 1.0
**Created:** 2026-01-XX

---

## 1. Current Analytics Implementation

### Chart Component
**File:** `src/components/data/PriceChart.tsx` (used by `/prices/[commodity]`, NOT by `/commodities/[slug]`)

**Status:** The commodity profile page (`/commodities/[slug]`) does NOT include a chart. Users must click "Chart it" to go to `/charts?commodity=wheat`.

### Analytics on Commodity Profile Page
- **No chart** on the profile page itself
- **No historical trend visualization**
- **No price distribution analysis**
- **No market comparison chart**

### Analytics on Related Pages
- `/prices/[commodity]` — Full price history with table (no chart)
- `/charts?commodity=[slug]` — Chart workspace with Recharts

---

## 2. Chart Infrastructure (Existing)

### Recharts Integration
**Package:** `recharts` (installed, version varies)

**Existing chart components:**
- `src/components/data/PriceChart.tsx` — Line chart for price history
- `src/components/intelligence/ProductionChart.tsx` — Production trends
- `src/components/intelligence/TradeFlowChart.tsx` — Trade flows
- `src/components/intelligence/SupplyDemandChart.tsx` — Supply/demand balance

### Chart Pattern (from PriceChart.tsx)
```tsx
'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Data format: { date: string, price: number }
// Responsive, mobile-friendly
// Custom tooltip with date and price
```

---

## 3. Missing Analytics on Wheat Page

### A. Historical Price Chart ⚠️ HIGH PRIORITY
**Should include:**
- Line chart showing price over time
- Market selector (if multiple markets)
- Series selector (if multiple series)
- Date range selector (30d, 90d, 6m, 1y, all)
- Interactive tooltips
- Empty state for insufficient data

### B. Price Performance Metrics ⚠️ HIGH PRIORITY
**Should calculate:**
- Latest price (with date, market, series)
- Previous comparable price
- Absolute change (₦)
- Percentage change (%)
- Highest observed price (period)
- Lowest observed price (period)
- Average price (period)
- Number of observations (period)

**Constraint:** Only compare within same series (price type + grade + unit + currency).

### C. Market Comparison Chart ⚠️ MEDIUM PRIORITY
**Should show:**
- Bar chart comparing latest prices across markets
- Only comparable series
- Clear labeling of market, price, date

### D. Price Distribution ⚠️ LOW PRIORITY
**Should show (if sufficient data):**
- Histogram of prices
- Median, average, range
- Market-level dispersion

---

## 4. Recommended Analytics Architecture

### Component: `CommodityPriceChart`
**Location:** `src/components/commodity/CommodityPriceChart.tsx`

**Props:**
```tsx
interface CommodityPriceChartProps {
  observations: PriceObservation[];
  commodityName: string;
  commoditySlug: string;
  seriesOptions: SeriesOption[];
  markets: Market[];
}
```

**Features:**
- Responsive Recharts line chart
- Series selector dropdown
- Market filter (multi-select)
- Date range buttons (30d, 90d, 6m, 1y, all)
- Custom tooltip showing: date, price, market, grade, unit
- Empty state: "No price data available for the selected filters"
- Loading state: skeleton chart

### Component: `PricePerformanceMetrics`
**Location:** `src/components/commodity/PricePerformanceMetrics.tsx`

**Props:**
```tsx
interface PricePerformanceMetricsProps {
  observations: PriceObservation[];
  seriesKey?: SeriesKey; // Optional filter
}
```

**Calculations:**
```typescript
// Only use observations from same series
const comparable = observations.filter(o => matchesSeries(o, seriesKey));

const latest = comparable[comparable.length - 1];
const previous = comparable[comparable.length - 2];
const change = latest.price - previous.price;
const changePercent = (change / previous.price) * 100;

const prices = comparable.map(o => o.price);
const highest = Math.max(...prices);
const lowest = Math.min(...prices);
const average = prices.reduce((a, b) => a + b, 0) / prices.length;
```

**Display:**
```
Latest: ₦52,300 (10 Nov 2026, Dawanau)
Previous: ₦52,000 (3 Nov 2026, Dawanau)
Change: +₦300 (+0.6%) ↗

Period High: ₦53,100
Period Low: ₦51,200
Average: ₦52,050
Observations: 21
```

### Component: `MarketComparisonChart`
**Location:** `src/components/commodity/MarketComparisonChart.tsx`

**Props:**
```tsx
interface MarketComparisonChartProps {
  marketPrices: MarketPrice[]; // Latest price per market
  commodityName: string;
}
```

**Features:**
- Horizontal bar chart
- Market names on Y-axis
- Prices on X-axis
- Color-coded by region (optional)
- Tooltip: market, state, price, date

---

## 5. Data Requirements for Analytics

### Minimum Data for Chart
- **10+ observations** over **30+ days** for meaningful trend
- **Same series** (price type + grade + unit + currency)
- **At least 2 markets** for comparison

### Wheat Current Status
- ✅ 21 observations (sufficient)
- ✅ 8 markets (sufficient)
- ✅ Multiple series (wholesale, retail)
- ⚠️ Need to verify date range (may be < 30 days)

---

## 6. Analytics Implementation Plan

### Stage 1 — Fix Series Labels (Immediate)
- Update `getCommoditySeriesOptions()` to join with grades/units tables
- Show "Wholesale · Milling grade · Bag · NGN" instead of "wholesale · grade 13 · unit 4 · NGN"

### Stage 2 — Add Price Chart (High Priority)
- Create `CommodityPriceChart` component
- Integrate into `/commodities/[slug]` page
- Add series and market filters
- Add date range selector

### Stage 3 — Add Performance Metrics (High Priority)
- Create `PricePerformanceMetrics` component
- Calculate latest, previous, change, high, low, average
- Display with clear provenance (dates, markets, series)

### Stage 4 — Add Market Comparison (Medium Priority)
- Create `MarketComparisonChart` component
- Horizontal bar chart of latest prices
- Only comparable series

### Stage 5 — Add Distribution Analysis (Low Priority)
- Only if 50+ observations available
- Histogram, median, dispersion

---

## 7. Chart Design Guidelines

### Visual Design
- **Brand colors:** Forest Green (#103C2D), Primary Green (#1D805A), Gold (#C7A45A)
- **Background:** White cards with subtle border (#E3EAE5)
- **Grid:** Light gray (#F7F9F7)
- **Axis labels:** Slate (#64736B), 11px
- **Data line:** Primary Green (#1D805A), 2px
- **Data points:** Primary Green circles, 4px radius
- **Tooltip:** White background, shadow, rounded corners

### Responsive Behavior
- **Desktop:** Full width, 400px height
- **Tablet:** Full width, 300px height
- **Mobile:** Full width, 250px height, simplified tooltip

### Accessibility
- High contrast data line
- Text labels alongside colors
- Keyboard-navigable controls
- Screen reader descriptions

---

## 8. Analytics Limitations to Communicate

### What the Chart Shows
- Actual published observations only
- No interpolation between gaps
- No forecasting or trend lines
- No statistical modeling

### What the Chart Does NOT Show
- Future prices
- Market-wide trends (only specific series)
- Causation (only correlation)
- Investment recommendations

### Provenance Labels
Every chart must include:
- Data source: "Hatsi360 field observations"
- Date range: "10 Oct – 10 Nov 2026"
- Series: "Wholesale · Milling grade · Bag · NGN"
- Observation count: "21 observations"
- Last updated: "10 Nov 2026, 14:30 WAT"

---

**Next:** See `commodity-profile-redesign.md` for full page architecture.
