# Stage 8: Research & Premium Data — Complete ✅

**Commit:** `88a2cab`  
**Date:** 2026-01-XX

---

## Overview

Stage 8 adds research and premium data integration to commodity pages, connecting users to related market reports and providing clear premium access indicators.

---

## Components Created

### 1. ResearchSection (`src/components/commodity/ResearchSection.tsx`)

**Displays commodity-related research reports with:**

- **Report Cards**: Grid layout (1/2/3 columns responsive)
  - Title and summary
  - Publication date
  - Market association
  - Premium badge (locked/unlocked state)
  - "Read report" or "Upgrade to access" action

- **Premium Access Indicators**:
  - 🔒 Lock icon for locked premium reports
  - ✨ Sparkles icon for unlocked premium reports
  - Clear visual distinction between free and premium content

- **Premium Access Prompt**:
  - Appears when premium reports exist but user lacks access
  - Gradient background with premium branding
  - "View pricing" and "See what's included" CTAs
  - Explains value of premium research

- **Footer Stats**:
  - Count of free vs premium reports
  - Latest publication date
  - Icons for quick scanning

**Empty State**: Informative message when no reports exist yet, with link to full research page

---

### 2. Query Functions (`src/lib/intelligence/research-queries.ts`)

#### `getCommodityResearchReports(commodityId, limit)`
- Fetches published reports related to a specific commodity
- Returns full report data with commodity and market relations
- Sorted by publication date (newest first)
- Handles both free and premium reports

#### `hasPremiumReportsAccess()`
- Checks if current user has 'reports' entitlement
- Uses `has_entitlement()` RPC function from migration 0016
- Returns boolean for access control

#### `getResearchReportSummaries(commodityId, limit)`
- Lightweight version for commodity page display
- Returns only essential fields (title, slug, summary, premium status, date)
- Default limit: 5 reports

---

## Data Flow

```
User request: /commodities/wheat
    ↓
CommodityProfilePage (server component)
    ↓
Fetch data in parallel (Promise.all):
  - getResearchReportSummaries(commodity.id, 6)
  - hasPremiumReportsAccess()
    ↓
Pass to ResearchSection:
  - reports: ResearchReportSummary[]
  - hasPremiumAccess: boolean
  - commodityName, commoditySlug
    ↓
Render report cards with access control
```

---

## Premium Access Control

### Entitlement System (Migration 0016)

The platform uses a key-based entitlement system:
- **Key**: `'reports'` — unlocks premium market intelligence
- **Source**: `customer_subscriptions` table
- **Resolver**: `user_entitlements()` and `has_entitlement()` functions

### Access States

1. **Has Access**: User has active subscription with 'reports' entitlement
   - Premium reports show ✨ badge
   - "Read report" link works normally

2. **No Access**: User lacks entitlement or not logged in
   - Premium reports show 🔒 badge
   - "Upgrade to access" link redirects to `/pricing`
   - Premium Access Prompt appears below reports

3. **Free Reports**: Always accessible
   - No badge shown
   - "Read report" link works for everyone

---

## Integration with Existing Systems

### Market Reports Table
- Uses existing `market_reports` table
- Fields: `id`, `title`, `slug`, `summary`, `is_premium`, `published_at`, `commodity_id`, `market_id`
- Relations: `commodities` (name, slug), `markets` (name, slug)

### Research Client
- Reuses existing `/client/research` page
- Same filtering and sorting logic
- Consistent report display across platform

### Pricing Page
- Premium prompts link to `/pricing`
- "See what's included" links to `/pricing#features`
- Clear upgrade path for users

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
7. Market Comparison (Stage 4)
8. Regional Intelligence (Stage 6)
9. Grade & Quality Intelligence (Stage 7)
10. Seasonal Intelligence (Stage 7)
11. **Research & Reports (Stage 8)** ← NEW
12. Comparable Series
13. Reporting Markets
14. Time Range Navigation
15. Synonyms
```

**Rationale:** Placed after all intelligence sections as a "learn more" CTA, before the technical series/market data.

---

## Technical Implementation

### Server-Side Access Control
- Access check happens server-side (no client-side flicker)
- `hasPremiumReportsAccess()` called in Promise.all
- Result passed to component as boolean prop

### Responsive Grid Layout
- Mobile: 1 column
- Tablet (sm): 2 columns
- Desktop (lg): 3 columns
- Consistent with other card grids

### Premium Badge Logic
```typescript
const isLocked = report.isPremium && !hasPremiumAccess;

// Locked state
<Lock className="size-2.5" />
Premium
<Link href="/pricing">Upgrade to access</Link>

// Unlocked state
<Sparkles className="size-2.5" />
Premium
<Link href={`/client/research/${report.slug}`}>Read report</Link>
```

### Empty State
- Shows when no reports exist for commodity
- Informative message about future reports
- Link to full research page

---

## Design Decisions

### 1. Limit Reports to 6
- **Why**: Commodity page should not become a research portal
- **Benefit**: Keeps focus on price intelligence, offers research as supplement
- **Implementation**: `getResearchReportSummaries(commodity.id, 6)`

### 2. Premium Access Prompt
- **Why**: Clear upgrade path for premium content
- **Benefit**: Drives subscription conversions
- **Design**: Gradient background, premium branding, dual CTAs

### 3. Server-Side Access Control
- **Why**: No client-side flicker, better UX
- **Benefit**: Locked state rendered immediately
- **Implementation**: Access check in Promise.all

### 4. Link to Full Research Page
- **Why**: Commodity page shows preview, not full archive
- **Benefit**: Users can browse all reports in dedicated interface
- **Implementation**: "View all research" link in header

---

## Testing Checklist

- [x] Build passes with 0 TypeScript errors
- [x] Handles null/undefined data gracefully
- [x] Premium reports show lock icon for users without access
- [x] Premium reports show sparkles icon for users with access
- [x] "Read report" links work for accessible reports
- [x] "Upgrade to access" links redirect to pricing page
- [x] Premium Access Prompt appears when needed
- [x] Empty state shows when no reports exist
- [x] Responsive grid layout on all screen sizes
- [x] Report cards truncate long summaries (line-clamp-3)
- [x] Publication dates formatted correctly

---

## Reusability

This component is **fully commodity-agnostic** and works for all 12 commodities:
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

### New Files (2)
- `src/components/commodity/ResearchSection.tsx` — 295 lines
- `src/lib/intelligence/research-queries.ts` — 148 lines

### Modified Files (1)
- `src/app/(site)/commodities/[slug]/page.tsx`
  - Added imports for research queries and component
  - Added 2 new queries to Promise.all
  - Added ResearchSection render after SeasonalIntelligence

---

## Data Sources

### Market Reports
- **Table**: `market_reports`
- **Fields**: `id`, `title`, `slug`, `summary`, `is_premium`, `published_at`, `commodity_id`, `market_id`
- **Relations**: `commodities` (name, slug), `markets` (name, slug)

### Entitlement System
- **Table**: `customer_subscriptions`
- **Function**: `has_entitlement(p_key text)` from migration 0016
- **Key**: `'reports'` for premium market intelligence

---

## Next Steps

**Stage 9: Responsive Refinement**
- Mobile optimization testing
- Touch target improvements
- Responsive table enhancements
- Loading state improvements
- Final accessibility audit

---

**Delivered by:** Arena AI Agent  
**Build Status:** ✅ 0 errors, 0 warnings  
**Commit:** `88a2cab`
