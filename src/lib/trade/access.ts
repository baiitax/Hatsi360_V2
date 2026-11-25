import 'server-only';

import { cache } from 'react';
import { getProfile } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { hasPaidIntelligenceSubscription, isTradeAdministrator } from './access-policy';

export type TradeAccess = 'admin' | 'paid' | 'guest' | 'inactive' | 'unpaid';

/** Resolve access from the authenticated profile and its own subscription rows. */
export const getTradeAccess = cache(async function resolveTradeAccess(): Promise<TradeAccess> {
  const profile = await getProfile();
  if (!profile) return 'guest';

  if (profile.accountStatus !== 'active') return 'inactive';
  if (isTradeAdministrator(profile.role)) return 'admin';
  if (!isSupabaseConfigured()) return 'unpaid';

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('customer_subscriptions')
      .select('status, starts_at, ends_at, trial_ends_at, entitlements')
      .eq('user_id', profile.id);

    if (error || !data) return 'unpaid';
    return hasPaidIntelligenceSubscription(data) ? 'paid' : 'unpaid';
  } catch {
    // The trade workspace fails closed if the subscription service is down.
    return 'unpaid';
  }
});
