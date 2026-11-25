import { NextResponse, type NextRequest } from 'next/server';
import { searchMarket } from '@/lib/market';

/**
 * The global search endpoint.
 *
 * Phase 03 §13.3 is explicit that a search must not ship the whole corpus to
 * the browser: *"no client-side filtering of a fully loaded dataset"*. So the
 * query goes to the server, which already knows how to narrow it through the
 * public view, and the browser receives only the grouped results it renders.
 *
 * The response carries the query and an `emptyReason` even when nothing matched,
 * because an empty result is a legitimate answer and the UI must be able to
 * say *why* it is empty rather than showing a blank panel.
 */
export const dynamic = 'force-dynamic';

/** The shortest query worth running. One character matches everything. */
const MIN_LENGTH = 2;

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get('q') ?? '').trim();

  if (query.length < MIN_LENGTH) {
    return NextResponse.json({
      query,
      groups: [],
      total: 0,
      emptyReason: `Enter at least ${MIN_LENGTH} characters to search commodities, markets and states.`,
    });
  }

  const result = await searchMarket(query);

  return NextResponse.json(
    // `searchMarket` returns its own `query`, already trimmed, so it is spread
    // last and is the one that wins. Passing it first as well would just be
    // overwritten.
    result,
    {
      headers: {
        // A search result is only true at the moment it is asked for.
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}
