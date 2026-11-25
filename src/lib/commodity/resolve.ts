/**
 * Hatsi360 Markets — commodity term resolution.
 *
 * Users search with trade names, local names and abbreviations, and the platform
 * holds 42 synonyms across 15 commodities to help. The risk is not failing to
 * match — it is matching the *wrong* commodity confidently.
 *
 * So this module never guesses. When a term maps to more than one commodity it
 * returns `ambiguous` with the candidates and lets the interface ask, because
 * silently picking one would send a trader to another crop's prices.
 *
 * Normalisation is deliberately conservative: case folding, whitespace
 * collapsing and punctuation stripping. It does not stem, transliterate or
 * fuzzy-match, because "maize" and "maize (white)" are different commodities and
 * a fuzzy match between them would be wrong in a way the user cannot see.
 */

import type { CommodityRecord, SynonymRecord, SynonymResolution } from './types';

export interface ResolveInput {
  commodities: Pick<CommodityRecord, 'id' | 'name' | 'slug' | 'isActive'>[];
  synonyms: SynonymRecord[];
}

/** Inactive duplicates must never win a resolution. */
function activeOnly<T extends { isActive: boolean }>(rows: T[]): T[] {
  return rows.filter((row) => row.isActive);
}

/**
 * Resolve a free-text term to a commodity.
 *
 * The order is slug, then exact name, then synonym — most specific first, so an
 * exact match always beats a looser one.
 */
export function resolveCommodityTerm(term: string, input: ResolveInput): SynonymResolution {
  const normalised = normalise(term);
  if (normalised === '') {
    return { kind: 'none', commodityId: null, candidates: [], matchedTerm: null };
  }

  const commodities = activeOnly(input.commodities);
  const byId = new Map(commodities.map((commodity) => [commodity.id, commodity]));

  /* 1 — exact slug ------------------------------------------------------- */
  const bySlug = commodities.find((commodity) => normalise(commodity.slug) === normalised);
  if (bySlug) {
    return {
      kind: 'exact_slug',
      commodityId: bySlug.id,
      candidates: [],
      matchedTerm: bySlug.slug,
    };
  }

  /* 2 — exact name ------------------------------------------------------- */
  const byName = commodities.filter((commodity) => normalise(commodity.name) === normalised);
  if (byName.length === 1) {
    return {
      kind: 'exact_name',
      commodityId: byName[0].id,
      candidates: [],
      matchedTerm: byName[0].name,
    };
  }
  if (byName.length > 1) {
    // Two active commodities share a name. That is a data problem, not something
    // to resolve by picking the first row.
    return ambiguous(byName.map((c) => c.id), byId);
  }

  /* 3 — synonym ---------------------------------------------------------- */
  const matched = input.synonyms.filter(
    (record) => byId.has(record.commodityId) && normalise(record.synonym) === normalised,
  );
  const distinct = [...new Set(matched.map((record) => record.commodityId))];

  if (distinct.length === 1) {
    const commodity = byId.get(distinct[0])!;
    return {
      kind: 'unique_synonym',
      commodityId: commodity.id,
      candidates: [],
      matchedTerm: matched[0].synonym,
    };
  }
  if (distinct.length > 1) {
    // The whole reason this module exists: a shared trade name must not silently
    // resolve to one crop.
    return ambiguous(distinct, byId);
  }

  return { kind: 'none', commodityId: null, candidates: [], matchedTerm: null };
}

function ambiguous(ids: number[], byId: Map<number, { name: string; slug: string }>): SynonymResolution {
  const candidates = ids
    .map((id) => byId.get(id))
    .filter((row): row is { name: string; slug: string } => Boolean(row))
    .map((row, index) => ({ commodityId: ids[index], name: row.name, slug: row.slug }));
  return { kind: 'ambiguous', commodityId: null, candidates, matchedTerm: null };
}

/**
 * Normalise a term for comparison.
 *
 * Lowercased, trimmed, internal whitespace collapsed, and surrounding punctuation
 * stripped. Nothing more: a normaliser that went further would start equating
 * terms that name genuinely different commodities.
 */
export function normalise(term: string): string {
  return term
    .toLowerCase()
    .replace(/[\u2018\u2019'`]/g, '')
    .replace(/[.,;:()\[\]{}"\/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Whether a term is worth searching at all.
 *
 * A one-character query would match too much to be useful and costs a round trip
 * to say so.
 */
export function isSearchable(term: string): boolean {
  return normalise(term).length >= 2;
}
