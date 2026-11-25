import 'server-only';

import { getDataSource } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';

/**
 * Global market search.
 *
 * Phase 03 §13 requires commodity, market, state and research discovery, with
 * grouped results, a no-result state, and — critically — §13.3: *"Avoid fetching
 * the entire commodity or market dataset into the browser for every query."*
 *
 * So the search is server-side. The caller sends a term; this module filters on
 * the server and returns a bounded, grouped result. Nothing is fetched into the
 * browser to be filtered there.
 *
 * The catalogue is small (22 commodities, 11 markets, 11 states), so the filter
 * runs in memory on the server against an already-loaded list — but the *shape*
 * is what matters: the browser receives only the matches, never the corpus.
 */

export interface SearchGroup {
  id: 'commodities' | 'markets' | 'states' | 'research';
  label: string;
  results: SearchResult[];
}

export interface SearchResult {
  label: string;
  /** A secondary line — category, state, or the number of observations. */
  detail: string | null;
  href: string;
}

export interface MarketSearchResult {
  query: string;
  groups: SearchGroup[];
  total: number;
  emptyReason: string | null;
}

/** How many results per group. Enough to be useful, small enough to be fast. */
const PER_GROUP_LIMIT = 6;
/** Below this length a search is not run — a single character matches everything. */
const MIN_QUERY_LENGTH = 2;

/**
 * Search the market catalogue.
 *
 * Matches on the name and the slug, so "paddy" finds "Paddy Rice" through its
 * name and "paddy-rice" through its slug. Case-insensitive, and the term is
 * length-checked before anything is loaded.
 */
export async function searchMarket(rawQuery: string): Promise<MarketSearchResult> {
  const query = rawQuery.trim();

  if (query.length < MIN_QUERY_LENGTH) {
    return {
      query,
      groups: [],
      total: 0,
      emptyReason: `Enter at least ${MIN_QUERY_LENGTH} characters to search.`,
    };
  }

  const noResults = (): MarketSearchResult => ({
    query,
    groups: [],
    total: 0,
    emptyReason: `Nothing in the market catalogue matches “${query}”. Try a commodity name, a market, or a state.`,
  });

  if (!isSupabaseConfigured()) {
    return { query, groups: [], total: 0, emptyReason: 'No database is configured, so there is nothing to search.' };
  }

  const source = await getDataSource();
  const term = query.toLowerCase();

  const [commodities, markets, states] = await Promise.all([
    source.listCommodities(),
    source.listMarkets(),
    source.listStates(),
  ]);

  const commodityResults: SearchResult[] = commodities
    .filter((c) => c.isActive && matches(term, c.name, c.slug))
    .slice(0, PER_GROUP_LIMIT)
    .map((c) => ({
      label: c.name,
      detail: [c.categoryName, describeCount(c.observationCount, 'observation')]
        .filter(Boolean)
        .join(' · ') || null,
      href: `/commodities/${c.slug}`,
    }));

  const marketResults: SearchResult[] = markets
    .filter((m) => matches(term, m.name, m.slug, m.stateName))
    .slice(0, PER_GROUP_LIMIT)
    .map((m) => ({
      label: m.name,
      detail: m.stateName ?? null,
      href: `/markets/${m.slug}`,
    }));

  const stateResults: SearchResult[] = states
    .filter((s) => matches(term, s.name, s.slug))
    .slice(0, PER_GROUP_LIMIT)
    .map((s) => {
      const count = markets.filter((m) => m.stateId === s.id).length;
      return {
        label: s.name,
        detail: `${count} market${count === 1 ? '' : 's'} configured`,
        href: `/markets?state=${s.slug}`,
      };
    });

  const groups: SearchGroup[] = [
    { id: 'commodities', label: 'Commodities', results: commodityResults },
    { id: 'markets', label: 'Markets', results: marketResults },
    { id: 'states', label: 'States and regions', results: stateResults },
  ].filter((group) => group.results.length > 0) as SearchGroup[];

  const total = groups.reduce((sum, group) => sum + group.results.length, 0);

  if (total === 0) return noResults();

  return { query, groups, total, emptyReason: null };
}

/** Whether a term appears in any of a record's searchable fields. */
function matches(term: string, ...fields: (string | null | undefined)[]): boolean {
  return fields.some((field) => field != null && field.toLowerCase().includes(term));
}

/** "3 observations", "1 observation", or `null` when there are none. */
function describeCount(count: number | undefined, noun: string): string | null {
  if (count == null || count === 0) return null;
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
