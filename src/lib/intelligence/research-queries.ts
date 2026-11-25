/**
 * Research & Premium Data queries
 *
 * Stage 8 of commodity intelligence transformation.
 * Fetches related research reports and handles premium access.
 */

import 'server-only';

import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';

/* ── Types ─────────────────────────────────────────────────────────────────── */

export interface MarketReport {
  id: number;
  title: string;
  slug: string;
  summary?: string;
  isPremium: boolean;
  publishedAt: string | null;
  createdAt: string | null;
  commodityId: number | null;
  commodityName: string | null;
  commoditySlug: string | null;
  marketId: number | null;
  marketName: string | null;
  marketSlug: string | null;
}

export interface ResearchReportSummary {
  id: number;
  title: string;
  slug: string;
  summary?: string;
  isPremium: boolean;
  publishedAt: string | null;
  commodityName: string | null;
  commoditySlug: string | null;
  marketName: string | null;
}

/* ── Query Functions ───────────────────────────────────────────────────────── */

/**
 * Fetch research reports related to a specific commodity.
 *
 * Returns published reports that mention this commodity, sorted by date.
 * Includes both free and premium reports (access control is handled at display time).
 */
export async function getCommodityResearchReports(
  commodityId: number,
  limit: number = 10
): Promise<MarketReport[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();

  // Fetch reports related to this commodity
  const { data, error } = await supabase
    .from('market_reports')
    .select(`
      id,
      title,
      slug,
      summary,
      is_premium,
      published_at,
      created_at,
      commodity_id,
      market_id,
      commodities:commodity_id(id, name, slug),
      markets:market_id(id, name, slug)
    `)
    .eq('commodity_id', commodityId)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row: any) => {
    const commodity = Array.isArray(row.commodities)
      ? row.commodities[0]
      : row.commodities;
    const market = Array.isArray(row.markets) ? row.markets[0] : row.markets;

    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      summary: row.summary,
      isPremium: row.is_premium,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      commodityId: row.commodity_id,
      commodityName: commodity?.name ?? null,
      commoditySlug: commodity?.slug ?? null,
      marketId: row.market_id,
      marketName: market?.name ?? null,
      marketSlug: market?.slug ?? null,
    };
  });
}

/**
 * Check if the current user has access to premium reports.
 *
 * Returns true if the user has the 'reports' entitlement from an active subscription.
 */
export async function hasPremiumReportsAccess(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = await createClient();

  // Check if user has 'reports' entitlement
  const { data, error } = await supabase.rpc('has_entitlement', {
    p_key: 'reports',
  });

  if (error) return false;

  return data === true;
}

/**
 * Get a summary of research reports for display on commodity page.
 *
 * Returns a limited set of reports with essential info for preview cards.
 */
export async function getResearchReportSummaries(
  commodityId: number,
  limit: number = 5
): Promise<ResearchReportSummary[]> {
  const reports = await getCommodityResearchReports(commodityId, limit);

  return reports.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    summary: r.summary,
    isPremium: r.isPremium,
    publishedAt: r.publishedAt,
    commodityName: r.commodityName,
    commoditySlug: r.commoditySlug,
    marketName: r.marketName,
  }));
}
