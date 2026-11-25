import 'server-only';

import { isSupabaseConfigured } from '@/lib/supabase/config';
import { assessCommodityReadiness, type ReadinessInput } from './readiness';
import type { PriceObservation } from '@/types/domain';
import type {
  CommodityReadiness,
  CommodityRecord,
  GradeRecord,
  UnitRecord,
  VarietyRecord,
} from './types';

/**
 * Hatsi360 Markets — the database-backed commodity queries.
 *
 * These are the only functions in this module that touch Supabase, kept apart
 * from the pure logic in `readiness.ts`, `resolve.ts` and `units.ts` so the
 * rules can be tested without a database.
 *
 * Two design commitments run through the whole file:
 *
 *  1. **Published means published.** Counts that drive a public figure come
 *     from the `published_price_observations` view, never from the raw table.
 *     A draft or withdrawn observation must not be able to move a number a
 *     trader acts on.
 *
 *  2. **No N+1.** The directory readiness list fetches its supporting data in
 *     grouped queries for the whole catalogue, not one profile lookup per
 *     commodity. A page that issues 22 round trips to render 22 rows is a page
 *     that gets slower as the catalogue grows.
 */

/* ------------------------------------------------------------- the profile -- */

export interface CommodityProfile {
  commodity: CommodityRecord;
  category: { id: number; name: string; slug: string } | null;
  grades: GradeRecord[];
  varieties: VarietyRecord[];
  synonyms: string[];
  /** Units that appear in this commodity's published observations. */
  units: UnitRecord[];
  readiness: CommodityReadiness;
}

/**
 * The full profile for one commodity, by slug.
 *
 * Returns `null` when the slug does not resolve, so the route can `notFound()`
 * rather than render a half-populated page for a commodity that does not exist.
 */
export async function getCommodityProfileBySlug(
  slug: string,
  publishedRows?: readonly PriceObservation[],
): Promise<CommodityProfile | null> {
  if (!isSupabaseConfigured()) return null;

  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from('commodities')
    .select(
      `
      id, name, slug, description, category_id, default_grade_id, default_variety_id,
      is_active, freshness_window_hours,
      commodity_categories ( id, name, slug )
    `,
    )
    .eq('slug', slug)
    .maybeSingle();

  if (error || !row) return null;

  type Row = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    category_id: number | null;
    default_grade_id: number | null;
    default_variety_id: number | null;
    is_active: boolean;
    freshness_window_hours: number | null;
    commodity_categories: { id: number; name: string; slug: string } | null;
  };
  const typed = row as unknown as Row;

  // The four supporting reads are independent, so they run together. None of
  // them is allowed to fail the page: a commodity with no grades recorded still
  // has a profile, it just has a readiness gap that says so.
  const [gradesResult, varietiesResult, synonymsResult, counts] = await Promise.all([
    supabase
      .from('commodity_grades')
      .select('id, commodity_id, variety_id, name, slug, description')
      .eq('commodity_id', typed.id)
      .order('name', { ascending: true }),
    supabase
      .from('commodity_varieties')
      .select('id, commodity_id, name, slug')
      .eq('commodity_id', typed.id)
      .order('name', { ascending: true }),
    supabase
      .from('commodity_synonyms')
      .select('synonym')
      .eq('commodity_id', typed.id)
      .order('synonym', { ascending: true }),
    getCommodityCounts(typed.id, publishedRows),
  ]);

  const grades = toGrades(gradesResult.data);
  const varieties = toVarieties(varietiesResult.data);
  const synonyms = ((synonymsResult.data ?? []) as { synonym: string }[]).map(
    (record) => record.synonym,
  );

  const readiness = assessCommodityReadiness({
    commodityId: typed.id,
    name: typed.name,
    slug: typed.slug,
    isActive: typed.is_active,
    hasDescription: typed.description !== null && typed.description.trim() !== '',
    hasDefaultGrade: typed.default_grade_id !== null,
    gradeCount: grades.length,
    varietyCount: varieties.length,
    synonymCount: synonyms.length,
    observationCount: counts.observationCount,
    publishedObservationCount: counts.publishedObservationCount,
    marketCount: counts.marketCount,
    unitCount: counts.unitCount,
    priceTypeCount: counts.priceTypeCount,
    gradeUsedCount: counts.gradeUsedCount,
    countsAreComplete: counts.countsAreComplete,
  });

  return {
    commodity: {
      id: typed.id,
      name: typed.name,
      slug: typed.slug,
      description: typed.description,
      categoryId: typed.category_id,
      categoryName: typed.commodity_categories?.name ?? null,
      defaultGradeId: typed.default_grade_id,
      defaultVarietyId: typed.default_variety_id,
      isActive: typed.is_active,
      freshnessWindowHours: typed.freshness_window_hours,
    },
    category: typed.commodity_categories,
    grades,
    varieties,
    synonyms,
    units: counts.units,
    readiness,
  };
}

/* --------------------------------------------------------------- counts -- */

export interface CommodityCounts {
  /** Every recorded observation, published or not. */
  observationCount: number;
  /** Only observations that are published and eligible to be shown. */
  publishedObservationCount: number;
  marketCount: number;
  unitCount: number;
  priceTypeCount: number;
  gradeUsedCount: number;
  units: UnitRecord[];
  /**
   * Whether `observationCount` is the true total.
   *
   * `price_observations` is RLS-protected: the public sees only rows passing
   * `is_public_observation`, while staff see everything. A reader who sees more
   * observations than are published is seeing the complete set; one who sees
   * exactly the published count cannot be told apart from one looking at a
   * commodity with nothing unpublished, so that is treated as incomplete and
   * the more careful wording is used.
   */
  countsAreComplete: boolean;
}

/**
 * The observation counts for one commodity.
 *
 * The published figures come from the view; the total comes from the table, so
 * the profile can tell the difference between "nothing recorded" and "recorded
 * but unpublished" — which are very different things to a user wondering why no
 * price is showing.
 */
export async function getCommodityCounts(
  commodityId: number,
  publishedRows?: readonly PriceObservation[],
): Promise<CommodityCounts> {
  const empty: CommodityCounts = {
    observationCount: 0,
    publishedObservationCount: 0,
    marketCount: 0,
    unitCount: 0,
    priceTypeCount: 0,
    gradeUsedCount: 0,
    units: [],
    countsAreComplete: false,
  };
  if (!isSupabaseConfigured()) return empty;

  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const [allResult, publishedResult, unitsResult] = await Promise.all([
    supabase
      .from('price_observations')
      .select('id', { count: 'exact', head: true })
      .eq('commodity_id', commodityId),
    publishedRows
      ? Promise.resolve({ data: null })
      : supabase
          .from('published_price_observations')
          .select(
            'market_id, price_type, grade_id, reported_unit_id, display_unit_id, unit_code, unit_name, unit_dimension, unit_is_specific',
          )
          .eq('commodity_id', commodityId),
    // Units *defined* for this commodity's observations, for conversion checks.
    supabase
      .from('measurement_units')
      .select('id, code, name, plural_name, dimension, base_unit_id, base_factor, is_specific'),
  ]);

  type PublishedCountRow = {
    market_id: number | null;
    price_type: string;
    grade_id: number | null;
    reported_unit_id: number | null;
    display_unit_id: number | null;
    unit_code: string | null;
    unit_name: string | null;
    unit_dimension: string | null;
    unit_is_specific: boolean | null;
  };
  const published: PublishedCountRow[] = publishedRows
    ? publishedRows.map((row) => ({
        market_id: row.marketId,
        price_type: row.priceType,
        grade_id: row.gradeId,
        reported_unit_id: row.reportedUnitId,
        display_unit_id: row.normalizedUnitId,
        unit_code: row.unitCode ?? null,
        unit_name: row.unitName ?? null,
        unit_dimension: row.unitDimension ?? null,
        unit_is_specific: row.unitIsSpecific ?? null,
      }))
    : ((publishedResult.data ?? []) as PublishedCountRow[]);

  // Units that actually appear in a published observation, not every unit in
  // the catalogue. A commodity quoted only in `bag` has one unit, whatever else
  // the `measurement_units` table holds.
  const unitIds = new Set<number>();
  const units: UnitRecord[] = [];
  const seenUnits = new Set<number>();
  for (const record of published) {
    const unitId = record.reported_unit_id ?? record.display_unit_id;
    if (unitId === null || unitIds.has(unitId)) continue;
    unitIds.add(unitId);
    if (seenUnits.has(unitId)) continue;
    seenUnits.add(unitId);
    units.push({
      id: unitId,
      code: record.unit_code ?? String(unitId),
      name: record.unit_name ?? `Unit ${unitId}`,
      pluralName: null,
      dimension: record.unit_dimension ?? 'unknown',
      baseUnitId: null,
      baseFactor: null,
      isSpecific: record.unit_is_specific ?? false,
    });
  }

  // Where the view could not tell us a unit's conversion factors, take them from
  // the units table so `findConversion` can answer rather than refuse for a
  // reason that is only missing metadata.
  if (units.length > 0 && unitsResult.data) {
    const defined = toUnits(unitsResult.data);
    const byId = new Map(defined.map((unit) => [unit.id, unit]));
    for (const unit of units) {
      const source = byId.get(unit.id);
      if (!source) continue;
      unit.baseUnitId = source.baseUnitId;
      unit.baseFactor = source.baseFactor;
      unit.pluralName = source.pluralName;
      unit.dimension = source.dimension;
    }
  }

  return {
    observationCount: allResult.count ?? 0,
    publishedObservationCount: published.length,
    marketCount: new Set(published.map((record) => record.market_id).filter((id) => id !== null))
      .size,
    unitCount: units.length,
    priceTypeCount: new Set(published.map((record) => record.price_type)).size,
    gradeUsedCount: new Set(published.map((record) => record.grade_id).filter((id) => id !== null))
      .size,
    units,
    countsAreComplete: (allResult.count ?? 0) > published.length,
  };
}

/* ------------------------------------------------------- the directory -- */

export interface CommodityDirectoryEntry {
  commodity: CommodityRecord;
  category: { id: number; name: string; slug: string } | null;
  readiness: CommodityReadiness;
}

/**
 * Every commodity with its readiness, for the directory.
 *
 * This is one catalogue query plus grouped supporting queries for the whole
 * catalogue rather than a profile lookup per commodity: the directory renders
 * every row, and issuing one round trip each would make the page slower with
 * every commodity added.
 */
export async function listCommodityReadiness(
  options: { includeInactive?: boolean } = {},
): Promise<CommodityDirectoryEntry[]> {
  if (!isSupabaseConfigured()) return [];

  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  let builder = supabase
    .from('commodities')
    .select(
      `
      id, name, slug, description, category_id, default_grade_id, default_variety_id,
      is_active, freshness_window_hours,
      commodity_categories ( id, name, slug )
    `,
    )
    .order('name', { ascending: true });

  if (!options.includeInactive) builder = builder.eq('is_active', true);

  const { data: commodityRows, error } = await builder;
  if (error || !commodityRows) return [];

  type Row = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    category_id: number | null;
    default_grade_id: number | null;
    default_variety_id: number | null;
    is_active: boolean;
    freshness_window_hours: number | null;
    commodity_categories: { id: number; name: string; slug: string } | null;
  };
  const commodities = commodityRows as unknown as Row[];
  const ids = commodities.map((row) => row.id);
  if (ids.length === 0) return [];

  // The supporting counts, grouped once for every commodity.
  const [gradeRows, varietyRows, synonymRows, publishedRows, allRows] = await Promise.all([
    supabase.from('commodity_grades').select('commodity_id, id').in('commodity_id', ids),
    supabase.from('commodity_varieties').select('commodity_id, id').in('commodity_id', ids),
    supabase.from('commodity_synonyms').select('commodity_id').in('commodity_id', ids),
    supabase
      .from('published_price_observations')
      .select('commodity_id, market_id, price_type, grade_id, reported_unit_id, display_unit_id')
      .in('commodity_id', ids),
    supabase.from('price_observations').select('commodity_id').in('commodity_id', ids),
  ]);

  const gradeCounts = countBy((gradeRows.data ?? []) as { commodity_id: number }[], 'commodity_id');
  const varietyCounts = countBy(
    (varietyRows.data ?? []) as { commodity_id: number }[],
    'commodity_id',
  );
  const synonymCounts = countBy(
    (synonymRows.data ?? []) as { commodity_id: number }[],
    'commodity_id',
  );
  const published = (publishedRows.data ?? []) as {
    commodity_id: number;
    market_id: number | null;
    price_type: string;
    grade_id: number | null;
    reported_unit_id: number | null;
    display_unit_id: number | null;
  }[];

  // Per-commodity distinct sets, built in one pass over the published rows.
  const markets = new Map<number, Set<number>>();
  const priceTypes = new Map<number, Set<string>>();
  const gradesUsed = new Map<number, Set<number>>();
  const unitsUsed = new Map<number, Set<number>>();
  const publishedCounts = new Map<number, number>();
  const observationCounts = countBy(
    (allRows.data ?? []) as { commodity_id: number }[],
    'commodity_id',
  );

  for (const record of published) {
    publishedCounts.set(record.commodity_id, (publishedCounts.get(record.commodity_id) ?? 0) + 1);
    addTo(markets, record.commodity_id, record.market_id);
    addToString(priceTypes, record.commodity_id, record.price_type);
    addTo(gradesUsed, record.commodity_id, record.grade_id);
    const unitId = record.reported_unit_id ?? record.display_unit_id;
    addTo(unitsUsed, record.commodity_id, unitId);
  }

  return commodities.map((row) => {
    const readiness = assessCommodityReadiness(toReadinessInput(row, {
      gradeCount: gradeCounts.get(row.id) ?? 0,
      varietyCount: varietyCounts.get(row.id) ?? 0,
      synonymCount: synonymCounts.get(row.id) ?? 0,
      publishedObservationCount: publishedCounts.get(row.id) ?? 0,
      observationCount: observationCounts.get(row.id) ?? 0,
      marketCount: markets.get(row.id)?.size ?? 0,
      priceTypeCount: priceTypes.get(row.id)?.size ?? 0,
      gradeUsedCount: gradesUsed.get(row.id)?.size ?? 0,
      unitCount: unitsUsed.get(row.id)?.size ?? 0,
      countsAreComplete:
        (observationCounts.get(row.id) ?? 0) > (publishedCounts.get(row.id) ?? 0),
    }));

    return {
      commodity: {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        categoryId: row.category_id,
        categoryName: row.commodity_categories?.name ?? null,
        defaultGradeId: row.default_grade_id,
        defaultVarietyId: row.default_variety_id,
        isActive: row.is_active,
        freshnessWindowHours: row.freshness_window_hours,
      },
      category: row.commodity_categories,
      readiness,
    };
  });
}

/* ------------------------------------------------------------ mappers -- */

/**
 * Row-to-domain mappers.
 *
 * The database speaks snake_case and the domain speaks camelCase. Mapping
 * explicitly, rather than casting, means a renamed column becomes a type error
 * here instead of an `undefined` that surfaces three layers away.
 */

type GradeRow = {
  id: number;
  commodity_id: number;
  variety_id: number | null;
  name: string;
  slug: string;
  description: string | null;
};

function toGrades(rows: unknown): GradeRecord[] {
  if (!Array.isArray(rows)) return [];
  return (rows as GradeRow[]).map((row) => ({
    id: row.id,
    commodityId: row.commodity_id,
    varietyId: row.variety_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
  }));
}

type VarietyRow = { id: number; commodity_id: number; name: string; slug: string };

function toVarieties(rows: unknown): VarietyRecord[] {
  if (!Array.isArray(rows)) return [];
  return (rows as VarietyRow[]).map((row) => ({
    id: row.id,
    commodityId: row.commodity_id,
    name: row.name,
    slug: row.slug,
  }));
}

type UnitRow = {
  id: number;
  code: string;
  name: string;
  plural_name: string | null;
  dimension: string;
  base_unit_id: number | null;
  base_factor: number | string | null;
  is_specific: boolean;
};

function toUnits(rows: unknown): UnitRecord[] {
  if (!Array.isArray(rows)) return [];
  return (rows as UnitRow[]).map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    pluralName: row.plural_name,
    dimension: row.dimension,
    baseUnitId: row.base_unit_id,
    baseFactor: row.base_factor === null ? null : Number(row.base_factor),
    isSpecific: row.is_specific,
  }));
}

/* ------------------------------------------------------------- helpers -- */

function toReadinessInput(
  row: {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    default_grade_id: number | null;
    is_active: boolean;
  },
  counts: {
    gradeCount: number;
    varietyCount: number;
    synonymCount: number;
    publishedObservationCount: number;
    observationCount: number;
    marketCount: number;
    priceTypeCount: number;
    gradeUsedCount: number;
    unitCount: number;
    countsAreComplete: boolean;
  },
): ReadinessInput {
  return {
    commodityId: row.id,
    name: row.name,
    slug: row.slug,
    isActive: row.is_active,
    hasDescription: row.description !== null && row.description.trim() !== '',
    hasDefaultGrade: row.default_grade_id !== null,
    gradeCount: counts.gradeCount,
    varietyCount: counts.varietyCount,
    synonymCount: counts.synonymCount,
    observationCount: counts.observationCount,
    publishedObservationCount: counts.publishedObservationCount,
    marketCount: counts.marketCount,
    unitCount: counts.unitCount,
    priceTypeCount: counts.priceTypeCount,
    gradeUsedCount: counts.gradeUsedCount,
    countsAreComplete: counts.countsAreComplete,
  };
}

function countBy<T extends Record<string, unknown>>(rows: T[], key: keyof T): Map<number, number> {
  const counts = new Map<number, number>();
  for (const row of rows) {
    const id = row[key];
    if (typeof id !== 'number') continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

function addTo(map: Map<number, Set<number>>, key: number, value: number | null): void {
  if (value === null) return;
  const set = map.get(key) ?? new Set<number>();
  set.add(value);
  map.set(key, set);
}

function addToString(map: Map<number, Set<string>>, key: number, value: string): void {
  const set = map.get(key) ?? new Set<string>();
  set.add(value);
  map.set(key, set);
}
