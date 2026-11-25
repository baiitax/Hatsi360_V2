import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { isDailyMarketReportingEnabled } from '@/lib/reporting/feature';
import { PageHeader, Panel, Pill } from '@/components/ops/Primitives';
import {
  recordMarketClosure,
  saveAssignmentCoverage,
  saveReportingConfiguration,
  saveReportingSettings,
  saveReportingWindow,
} from '@/lib/operations/daily-reporting-admin-actions';

export const metadata: Metadata = {
  title: 'Daily reporting — Control Centre',
  robots: { index: false, follow: false },
};

const fieldClass = 'min-h-11 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900';
const labelClass = 'block text-xs font-semibold text-ink-700';
const statuses: Record<string, string> = {
  scheduled: 'Scheduled', in_progress: 'In progress', partially_submitted: 'Partial',
  submitted: 'Submitted', overdue: 'Overdue', closed: 'Closed', reopened: 'Reopened',
};

export default async function DailyReportingAdminPage({
  searchParams,
}: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin('/admin/daily-reporting');
  const params = await searchParams;
  const enabled = isSupabaseConfigured() && isDailyMarketReportingEnabled();
  const supabase = enabled ? await createClient() : null;

  let markets: { id: number; name: string }[] = [];
  let commodities: { id: number; name: string }[] = [];
  let units: { id: number; name: string; code: string }[] = [];
  let grades: { id: number; name: string }[] = [];
  let assignments: { id: number; market_id: number; user_id: string; starts_on: string; ends_on: string | null; status: string }[] = [];
  let profiles: { id: string; full_name: string }[] = [];
  let configs: { id: string; market_id: number; commodity_id: number; grade_id: number | null; unit_id: number; currency_code: string; price_type: string; min_expected_amount: number | null; max_expected_amount: number | null; is_active: boolean }[] = [];
  let coverage: { assignment_id: number; reporting_config_id: string; display_order: number; is_active: boolean }[] = [];
  let windows: { id: string; market_id: number | null; session_kind: string; window_start: string; window_end: string; active_days: number[]; timezone_name: string; is_active: boolean }[] = [];
  let graceMinutes = 0;
  let reportRows: { id: string; business_date: string; session_kind: string; session_status: string; market_id: number; agent_user_id: string; items: { status: string }[] }[] = [];

  if (supabase) {
    const [marketResult, commodityResult, unitResult, gradeResult, assignmentResult, profileResult, configResult, coverageResult, windowResult, sessionResult, settingsResult] = await Promise.all([
      supabase.from('markets').select('id,name').eq('is_active', true).order('name'),
      supabase.from('commodities').select('id,name').eq('is_active', true).order('name'),
      supabase.from('measurement_units').select('id,name,code').order('name'),
      supabase.from('commodity_grades').select('id,name').order('name'),
      supabase.from('market_agent_assignments').select('id,market_id,user_id,starts_on,ends_on,status').order('starts_on', { ascending: false }),
      supabase.from('profiles').select('id,full_name').order('full_name'),
      supabase.from('market_commodity_reporting_configs').select('id,market_id,commodity_id,grade_id,unit_id,currency_code,price_type,min_expected_amount,max_expected_amount,is_active').order('market_id'),
      supabase.from('market_assignment_reporting_coverage').select('assignment_id,reporting_config_id,display_order,is_active').order('display_order'),
      supabase.from('market_reporting_windows').select('id,market_id,session_kind,window_start,window_end,active_days,timezone_name,is_active').order('session_kind'),
      supabase.from('daily_market_reporting_sessions').select('id,business_date,session_kind,session_status,market_id,agent_user_id').order('business_date', { ascending: false }).limit(120),
      supabase.from('market_reporting_settings').select('grace_minutes').eq('singleton', true).maybeSingle(),
    ]);
    markets = (marketResult.data ?? []) as typeof markets;
    commodities = (commodityResult.data ?? []) as typeof commodities;
    units = (unitResult.data ?? []) as typeof units;
    grades = (gradeResult.data ?? []) as typeof grades;
    assignments = (assignmentResult.data ?? []) as typeof assignments;
    profiles = (profileResult.data ?? []) as typeof profiles;
    configs = (configResult.data ?? []) as typeof configs;
    coverage = (coverageResult.data ?? []) as typeof coverage;
    windows = (windowResult.data ?? []) as typeof windows;
    graceMinutes = Number(settingsResult.data?.grace_minutes ?? 0);
    const rawSessions = (sessionResult.data ?? []) as Omit<(typeof reportRows)[number], 'items'>[];
    if (rawSessions.length) {
      const { data: itemRows } = await supabase.from('daily_market_reporting_items').select('session_id,status').in('session_id', rawSessions.map((row) => row.id));
      reportRows = rawSessions.map((row) => ({ ...row, items: (itemRows ?? []).filter((item) => item.session_id === row.id).map((item) => ({ status: String(item.status) })) })) as typeof reportRows;
    }
  }

  const marketName = (id: number) => markets.find((row) => row.id === id)?.name ?? `Market ${id}`;
  const commodityName = (id: number) => commodities.find((row) => row.id === id)?.name ?? `Commodity ${id}`;
  const unitName = (id: number) => units.find((row) => row.id === id)?.name ?? `Unit ${id}`;
  const agentName = (id: string) => profiles.find((row) => row.id === id)?.full_name ?? 'Agent';
  const message = params.status === 'saved' ? 'Changes saved.' : params.status === 'disabled' ? 'Feature flag is off or the database is not configured. The page has not queried reporting tables.' : params.status === 'invalid' ? 'Check the values and try again.' : params.status === 'save-failed' ? 'The change could not be saved. Check for duplicate or cross-market configuration.' : '';

  return (
    <>
      <PageHeader title="Daily market reporting" description="Persistent assignments, configured commodity coverage, opening and closing windows, and daily completion visibility." breadcrumbs={[{ label: 'Control Centre', href: '/admin/overview' }, { label: 'Daily reporting' }]} />
      {message ? <p role="status" className="mb-4 rounded-lg border border-ink-200 bg-white p-3 text-sm font-semibold text-ink-800">{message}</p> : null}
      {!enabled ? <Panel title="Reporting setup is inactive" description="After validating and applying the additive migration in an explicitly approved environment, set DAILY_MARKET_REPORTING_ENABLED=true. Until then this UI stays read-only/off and makes no reporting-table queries."><p className="text-sm text-ink-600">Historical observations remain untouched; no sessions are inferred retroactively.</p></Panel> : null}
      {enabled ? <div className="space-y-5">
        <Panel title="Configured market price definitions" description="Each definition is one commodity, grade, unit, currency and economic price type. No unit conversion or inferred price type is applied.">
          <form action={saveReportingConfiguration} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className={labelClass}>Market<select name="marketId" required className={fieldClass}><option value="">Select market</option>{markets.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
            <label className={labelClass}>Commodity<select name="commodityId" required className={fieldClass}><option value="">Select commodity</option>{commodities.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
            <label className={labelClass}>Grade (optional)<select name="gradeId" className={fieldClass}><option value="">No grade</option>{grades.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
            <label className={labelClass}>Unit<select name="unitId" required className={fieldClass}><option value="">Select unit</option>{units.map((row) => <option key={row.id} value={row.id}>{row.name} ({row.code})</option>)}</select></label>
            <label className={labelClass}>Currency<input name="currencyCode" defaultValue="NGN" maxLength={3} required className={fieldClass} /></label>
            <label className={labelClass}>Economic price type<select name="priceType" className={fieldClass}>{['farmgate','wholesale_asking','wholesale_transaction','retail','processor_procurement','export_buy','export_sell','indicative','unspecified'].map((type) => <option key={type} value={type}>{type.replaceAll('_',' ')}</option>)}</select></label>
            <label className={labelClass}>Expected minimum (optional)<input name="minExpectedAmount" inputMode="decimal" className={fieldClass} /></label>
            <label className={labelClass}>Expected maximum (optional)<input name="maxExpectedAmount" inputMode="decimal" className={fieldClass} /></label>
            <button className="min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-bold text-white sm:col-span-2 lg:col-span-4">Save price definition</button>
          </form>
          <ul className="mt-4 divide-y divide-ink-100">{configs.map((row) => <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"><span className="font-semibold text-ink-900">{marketName(row.market_id)} · {commodityName(row.commodity_id)}{row.grade_id ? ` · ${grades.find((grade) => grade.id === row.grade_id)?.name ?? ''}` : ''}</span><span className="text-ink-600">{row.currency_code} / {unitName(row.unit_id)} · {row.price_type.replaceAll('_',' ')} · {row.is_active ? 'Active' : 'Paused'}</span></li>)}</ul>
        </Panel>

        <Panel title="Assign configured coverage" description="Attach approved price definitions to existing agent-market assignments. The database verifies the definition belongs to the assignment's market.">
          <form action={saveAssignmentCoverage} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className={labelClass}>Persistent assignment<select name="assignmentId" required className={fieldClass}><option value="">Select assignment</option>{assignments.map((row) => <option key={row.id} value={row.id}>{agentName(row.user_id)} · {marketName(row.market_id)} · {row.status}</option>)}</select></label>
            <label className={labelClass}>Configured price definition<select name="configId" required className={fieldClass}><option value="">Select definition</option>{configs.map((row) => <option key={row.id} value={row.id}>{marketName(row.market_id)} · {commodityName(row.commodity_id)} · {unitName(row.unit_id)}</option>)}</select></label>
            <label className={labelClass}>Display order<input name="displayOrder" type="number" min="0" defaultValue="0" className={fieldClass} /></label>
            <button className="min-h-11 self-end rounded-lg bg-brand-700 px-4 py-2 text-sm font-bold text-white">Add coverage</button>
          </form>
          <ul className="mt-4 divide-y divide-ink-100">{coverage.map((row) => { const assignment = assignments.find((item) => item.id === row.assignment_id); const config = configs.find((item) => item.id === row.reporting_config_id); return <li key={`${row.assignment_id}-${row.reporting_config_id}`} className="py-2 text-xs text-ink-700">{assignment ? `${agentName(assignment.user_id)} · ${marketName(assignment.market_id)}` : `Assignment ${row.assignment_id}`} — {config ? `${commodityName(config.commodity_id)} · ${unitName(config.unit_id)}` : 'Configuration'} · {row.is_active ? 'Active' : 'Paused'}</li>; })}</ul>
        </Panel>

        <Panel title="Opening and closing windows" description="Times are interpreted in Africa/Lagos. Global defaults apply unless a market-specific window is saved.">
          <div className="grid gap-4 lg:grid-cols-2">{(['opening','closing'] as const).map((kind) => { const globalWindow = windows.find((row) => row.market_id == null && row.session_kind === kind); return <form key={kind} action={saveReportingWindow} className="grid grid-cols-2 gap-3 rounded-lg border border-ink-100 p-3"><input type="hidden" name="sessionKind" value={kind} /><input type="hidden" name="marketId" value="" /><label className={`${labelClass} col-span-2`}>{kind === 'opening' ? 'Opening' : 'Closing'} · Africa/Lagos</label><label className={labelClass}>Start<input type="time" name="windowStart" defaultValue={globalWindow?.window_start.slice(0,5) ?? (kind === 'opening' ? '07:00' : '15:00')} required className={fieldClass} /></label><label className={labelClass}>End<input type="time" name="windowEnd" defaultValue={globalWindow?.window_end.slice(0,5) ?? (kind === 'opening' ? '11:00' : '19:00')} required className={fieldClass} /></label><label className={`${labelClass} col-span-2`}>Active days (0=Sun through 6=Sat; comma-separated)<input name="activeDays" defaultValue={(globalWindow?.active_days ?? [1,2,3,4,5,6]).join(',')} className={fieldClass} /></label><button className="min-h-11 rounded-lg bg-brand-700 px-3 text-sm font-bold text-white">Save global {kind} window</button><span className="self-center text-xs text-ink-500">Current: {globalWindow?.window_start.slice(0,5) ?? '—'}–{globalWindow?.window_end.slice(0,5) ?? '—'}</span></form>; })}</div>
        </Panel>

        <Panel title="Market-specific window override" description="Use this only when a market's operating hours differ from the Africa/Lagos global default.">
          <form action={saveReportingWindow} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className={labelClass}>Market<select name="marketId" required className={fieldClass}><option value="">Select market</option>{markets.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
            <label className={labelClass}>Session<select name="sessionKind" className={fieldClass}><option value="opening">Opening</option><option value="closing">Closing</option></select></label>
            <label className={labelClass}>Start<input name="windowStart" type="time" defaultValue="07:00" required className={fieldClass} /></label>
            <label className={labelClass}>End<input name="windowEnd" type="time" defaultValue="11:00" required className={fieldClass} /></label>
            <label className={labelClass}>Active days<input name="activeDays" defaultValue="1,2,3,4,5,6" className={fieldClass} /></label>
            <button className="min-h-11 rounded-lg bg-brand-700 px-4 text-sm font-bold text-white sm:col-span-2 lg:col-span-5">Save market override</button>
          </form>
          <ul className="mt-3 space-y-1 text-xs text-ink-600">{windows.filter((row) => row.market_id != null).map((row) => <li key={row.id}>{marketName(row.market_id!)} · {row.session_kind}: {row.window_start.slice(0,5)}–{row.window_end.slice(0,5)} Africa/Lagos</li>)}</ul>
        </Panel>

        <Panel title="Schedule grace settings" description="The overdue job uses this Africa/Lagos grace period after a reporting window ends.">
          <form action={saveReportingSettings} className="flex flex-wrap items-end gap-3"><label className={`${labelClass} w-full sm:max-w-xs`}>Grace period (minutes)<input type="number" min="0" max="1440" name="graceMinutes" defaultValue={graceMinutes} className={fieldClass} /></label><button className="min-h-11 rounded-lg bg-brand-700 px-4 text-sm font-bold text-white">Save grace setting</button></form>
        </Panel>

        <Panel title="Market closure" description="Record an exceptional market closure to suppress generated opening/closing expectations for that market and date.">
          <form action={recordMarketClosure} className="grid gap-3 sm:grid-cols-3"><label className={labelClass}>Market<select name="marketId" required className={fieldClass}><option value="">Select market</option>{markets.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label><label className={labelClass}>Business date<input name="businessDate" type="date" required className={fieldClass} /></label><label className={labelClass}>Reason<input name="reason" maxLength={500} className={fieldClass} /></label><button className="min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-bold text-white sm:col-span-3">Record closure</button></form>
        </Panel>

        <Panel title="Daily completeness and review status" description="A count of configured reporting items by session. Submitted, verified and published remain distinct states.">
          {reportRows.length ? <div className="space-y-2">{reportRows.slice(0,60).map((row) => { const complete = row.items.filter((item) => ['submitted','verified','published','no_reliable_quote','unavailable','market_closed'].includes(item.status)).length; const verified = row.items.filter((item) => item.status === 'verified').length; const published = row.items.filter((item) => item.status === 'published').length; return <article key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-100 p-3"><div><p className="text-sm font-semibold text-ink-900">{marketName(row.market_id)} · {row.session_kind} · {row.business_date}</p><p className="text-xs text-ink-500">{agentName(row.agent_user_id)} · {complete}/{row.items.length} items accounted for · {verified} verified · {published} published</p></div><Pill tone={row.session_status === 'overdue' ? 'warning' : row.session_status === 'submitted' ? 'success' : 'neutral'}>{statuses[row.session_status] ?? row.session_status}</Pill></article>; })}</div> : <p className="text-sm text-ink-500">No generated reporting sessions are available yet. The scheduler creates expectations from active assignments and configured coverage.</p>}
        </Panel>
      </div> : null}
    </>
  );
}
