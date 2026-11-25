import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { isDailyMarketReportingEnabled } from '@/lib/reporting/feature';
import { getSession } from '@/lib/auth';

const payloadSchema = z.object({
  sessionId: z.string().uuid(),
  itemId: z.string().uuid(),
  amount: z.coerce.number().positive().max(1_000_000_000),
  collectedAt: z.string().datetime({ offset: true }),
  notes: z.string().trim().max(500).optional().nullable(),
  idempotencyKey: z.string().trim().min(8).max(120),
});

/** Submit one configured item; the database supplies all price dimensions. */
export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !isDailyMarketReportingEnabled()) {
    return NextResponse.json({ ok: false, message: 'Daily reporting is not enabled.' }, { status: 503 });
  }
  const session = await getSession();
  if (!session?.profile) return NextResponse.json({ ok: false, message: 'Sign in first.' }, { status: 401 });
  if (session.profile.accountStatus !== 'active') {
    return NextResponse.json({ ok: false, message: 'This account is not active.' }, { status: 403 });
  }
  if (!['agent', 'market_supervisor'].includes(session.profile.role)) {
    return NextResponse.json({ ok: false, message: 'An active market agent account is required.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request.' }, { status: 400 });
  }
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? 'Check the report.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: observationId, error } = await supabase.rpc('submit_daily_reporting_price', {
    p_session_id: parsed.data.sessionId,
    p_item_id: parsed.data.itemId,
    p_amount: String(parsed.data.amount),
    p_collected_at: parsed.data.collectedAt,
    p_notes: parsed.data.notes ?? null,
    p_idempotency_key: parsed.data.idempotencyKey,
  });
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, observationId });
}
