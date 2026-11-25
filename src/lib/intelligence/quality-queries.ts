/**
 * Quality & Seasonal Intelligence queries
 *
 * Stage 7 of commodity intelligence transformation.
 * Fetches grade specifications and seasonal calendar data.
 */

import 'server-only';

import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';

/* ── Types ─────────────────────────────────────────────────────────────────── */

export interface GradeSpecification {
  id: number;
  commodityId: number;
  gradeId: number | null;
  gradeName: string | null;
  parameter: string;
  requirement: string;
  basis: 'official' | 'commercial' | 'indicative';
  sourceName: string | null;
  sourceUrl: string | null;
}

export interface SeasonalPhase {
  id: number;
  commodityId: number;
  stateId: number | null;
  stateName: string | null;
  phase: 'land_preparation' | 'planting' | 'growing' | 'harvest' | 'post_harvest' | 'lean_season' | 'off_season';
  startMonth: number;
  endMonth: number;
  supplyEffect: string | null;
  priceEffect: string | null;
  basis: 'official' | 'commercial' | 'indicative';
  sourceName: string | null;
}

export interface CommodityGrade {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  observationCount: number;
  marketCount: number;
}

/* ── Query Functions ───────────────────────────────────────────────────────── */

/**
 * Fetch grade specifications for a commodity.
 *
 * Returns quality parameters and their requirements, grouped by grade.
 * Empty array if no specifications exist yet.
 */
export async function getCommoditySpecifications(
  commodityId: number
): Promise<GradeSpecification[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();

  // Fetch specifications
  const { data: specs, error: specsError } = await supabase
    .from('commodity_specifications')
    .select('id, commodity_id, grade_id, parameter, requirement, basis, source_name, source_url')
    .eq('commodity_id', commodityId)
    .order('grade_id', { ascending: true })
    .order('parameter', { ascending: true });

  if (specsError || !specs) return [];

  // Fetch grade names for the specifications
  const gradeIds = [...new Set(specs.map((s) => s.grade_id).filter(Boolean))];
  let gradeNames = new Map<number, string>();
  
  if (gradeIds.length > 0) {
    const { data: grades } = await supabase
      .from('commodity_grades')
      .select('id, name')
      .in('id', gradeIds);
    
    if (grades) {
      gradeNames = new Map(grades.map((g) => [g.id, g.name]));
    }
  }

  return specs.map((row) => ({
    id: row.id,
    commodityId: row.commodity_id,
    gradeId: row.grade_id,
    gradeName: row.grade_id ? gradeNames.get(row.grade_id) ?? null : null,
    parameter: row.parameter,
    requirement: row.requirement,
    basis: row.basis as 'official' | 'commercial' | 'indicative',
    sourceName: row.source_name,
    sourceUrl: row.source_url,
  }));
}

/**
 * Fetch seasonal calendar for a commodity.
 *
 * Returns seasonal phases with timing and supply/price effects.
 * Empty array if no seasonality data exists yet.
 */
export async function getCommoditySeasonality(
  commodityId: number
): Promise<SeasonalPhase[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();

  // Fetch seasonality data
  const { data: seasonData, error: seasonError } = await supabase
    .from('commodity_seasonality')
    .select('id, commodity_id, state_id, phase, start_month, end_month, supply_effect, price_effect, basis, source_name')
    .eq('commodity_id', commodityId)
    .order('state_id', { ascending: true })
    .order('start_month', { ascending: true });

  if (seasonError || !seasonData) return [];

  // Fetch state names for the seasonality data
  const stateIds = [...new Set(seasonData.map((s) => s.state_id).filter(Boolean))];
  let stateNames = new Map<number, string>();
  
  if (stateIds.length > 0) {
    const { data: states } = await supabase
      .from('states')
      .select('id, name')
      .in('id', stateIds);
    
    if (states) {
      stateNames = new Map(states.map((s) => [s.id, s.name]));
    }
  }

  return seasonData.map((row) => ({
    id: row.id,
    commodityId: row.commodity_id,
    stateId: row.state_id,
    stateName: row.state_id ? stateNames.get(row.state_id) ?? null : null,
    phase: row.phase as SeasonalPhase['phase'],
    startMonth: row.start_month,
    endMonth: row.end_month,
    supplyEffect: row.supply_effect,
    priceEffect: row.price_effect,
    basis: row.basis as 'official' | 'commercial' | 'indicative',
    sourceName: row.source_name,
  }));
}

/**
 * Fetch grades observed for a commodity with observation counts.
 *
 * Returns grades that have actually been observed in price data,
 * along with how many observations and markets report each grade.
 */
export async function getObservedGrades(
  commodityId: number
): Promise<CommodityGrade[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();

  // Fetch grades for this commodity
  const { data: grades, error: gradesError } = await supabase
    .from('commodity_grades')
    .select('id, name, slug, description')
    .eq('commodity_id', commodityId)
    .order('name');

  if (gradesError || !grades) return [];

  // Fetch observation counts per grade
  const { data: observations } = await supabase
    .from('price_observations')
    .select('grade_id, market_id')
    .eq('commodity_id', commodityId)
    .not('grade_id', 'is', null);

  if (!observations) {
    return grades.map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      description: g.description,
      observationCount: 0,
      marketCount: 0,
    }));
  }

  // Count observations and unique markets per grade
  const gradeStats = new Map<number, { observations: number; markets: Set<number> }>();

  for (const obs of observations) {
    if (!obs.grade_id) continue;
    if (!gradeStats.has(obs.grade_id)) {
      gradeStats.set(obs.grade_id, { observations: 0, markets: new Set() });
    }
    const stats = gradeStats.get(obs.grade_id)!;
    stats.observations++;
    if (obs.market_id) {
      stats.markets.add(obs.market_id);
    }
  }

  return grades.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    description: g.description,
    observationCount: gradeStats.get(g.id)?.observations ?? 0,
    marketCount: gradeStats.get(g.id)?.markets.size ?? 0,
  }));
}
