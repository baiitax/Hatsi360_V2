/**
 * Daily reporting remains opt-in until migration 0032 is applied to the
 * matching Supabase project and the scheduled-job secret/role is confirmed.
 * This prevents a deployment of the old schema from crashing agent pages.
 */
export function isDailyMarketReportingEnabled(): boolean {
  return process.env.DAILY_MARKET_REPORTING_ENABLED === 'true';
}
