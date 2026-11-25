export function isTradeAdministrator(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'super_admin';
}

export interface SubscriptionAccessRow {
  status: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  trial_ends_at?: string | null;
  entitlements: unknown;
}

/**
 * Trade Intelligence requires a current paid intelligence subscription.
 * Trials and customer accounts with only an empty/partial grant do not unlock
 * the paid workspace. Both current paid tiers include the `reports` key.
 */
export function hasPaidIntelligenceSubscription(
  rows: readonly SubscriptionAccessRow[],
  now = Date.now(),
): boolean {
  return rows.some((row) => {
    if (row.status !== 'active') return false;

    const startsAt = row.starts_at ? Date.parse(row.starts_at) : null;
    const endsAt = row.ends_at ? Date.parse(row.ends_at) : null;
    const trialEndsAt = row.trial_ends_at ? Date.parse(row.trial_ends_at) : null;

    if (startsAt !== null && (!Number.isFinite(startsAt) || startsAt > now)) return false;
    if (endsAt !== null && (!Number.isFinite(endsAt) || endsAt <= now)) return false;
    if (trialEndsAt !== null && (!Number.isFinite(trialEndsAt) || trialEndsAt <= now)) return false;

    const entitlements = row.entitlements;
    if (!entitlements || typeof entitlements !== 'object' || Array.isArray(entitlements)) {
      return false;
    }

    const keys = entitlements as Record<string, unknown>;
    return keys.reports === true || keys.api === true;
  });
}
