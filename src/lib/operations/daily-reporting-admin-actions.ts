'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { isDailyMarketReportingEnabled } from '@/lib/reporting/feature';

function ensureFeature() {
  if (!isSupabaseConfigured() || !isDailyMarketReportingEnabled()) {
    redirect('/admin/daily-reporting?status=disabled');
  }
}

function saved() {
  revalidatePath('/admin/daily-reporting');
  redirect('/admin/daily-reporting?status=saved');
}

export async function saveReportingConfiguration(formData: FormData): Promise<void> {
  const actor = await requireAdmin('/admin/daily-reporting');
  ensureFeature();
  const parsed = z.object({
    marketId: z.coerce.number().int().positive(),
    commodityId: z.coerce.number().int().positive(),
    gradeId: z.preprocess((v) => v === '' ? null : v, z.coerce.number().int().positive().nullable()),
    unitId: z.coerce.number().int().positive(),
    currencyCode: z.string().trim().length(3).transform((v) => v.toUpperCase()),
    priceType: z.enum(['farmgate','wholesale_asking','wholesale_transaction','retail','processor_procurement','export_buy','export_sell','indicative','unspecified']),
    minExpectedAmount: z.preprocess((v) => v === '' ? null : v, z.coerce.number().positive().nullable()),
    maxExpectedAmount: z.preprocess((v) => v === '' ? null : v, z.coerce.number().positive().nullable()),
  }).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success || (parsed.data.minExpectedAmount != null && parsed.data.maxExpectedAmount != null && parsed.data.minExpectedAmount > parsed.data.maxExpectedAmount)) {
    redirect('/admin/daily-reporting?status=invalid');
  }
  const supabase = await createClient();
  const { error } = await supabase.from('market_commodity_reporting_configs').upsert({
    market_id: parsed.data.marketId,
    commodity_id: parsed.data.commodityId,
    grade_id: parsed.data.gradeId,
    unit_id: parsed.data.unitId,
    currency_code: parsed.data.currencyCode,
    price_type: parsed.data.priceType,
    min_expected_amount: parsed.data.minExpectedAmount,
    max_expected_amount: parsed.data.maxExpectedAmount,
    created_by: actor.id,
    updated_by: actor.id,
    is_active: true,
  }, { onConflict: 'market_id,commodity_id,grade_id,unit_id,price_type' });
  if (error) redirect('/admin/daily-reporting?status=save-failed');
  saved();
}

export async function saveAssignmentCoverage(formData: FormData): Promise<void> {
  await requireAdmin('/admin/daily-reporting');
  ensureFeature();
  const parsed = z.object({
    assignmentId: z.coerce.number().int().positive(),
    configId: z.string().uuid(),
    displayOrder: z.coerce.number().int().min(0).max(9999).default(0),
  }).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect('/admin/daily-reporting?status=invalid');
  const supabase = await createClient();
  const { error } = await supabase.from('market_assignment_reporting_coverage').upsert({
    assignment_id: parsed.data.assignmentId,
    reporting_config_id: parsed.data.configId,
    display_order: parsed.data.displayOrder,
    is_active: true,
  }, { onConflict: 'assignment_id,reporting_config_id' });
  if (error) redirect('/admin/daily-reporting?status=save-failed');
  saved();
}

export async function saveReportingWindow(formData: FormData): Promise<void> {
  const actor = await requireAdmin('/admin/daily-reporting');
  ensureFeature();
  const parsed = z.object({
    sessionKind: z.enum(['opening','closing']),
    marketId: z.preprocess((v) => v === '' ? null : v, z.coerce.number().int().positive().nullable()),
    windowStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    windowEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    activeDays: z.string().default('1,2,3,4,5,6'),
  }).safeParse(Object.fromEntries(formData.entries()));
  const days = parsed.success ? parsed.data.activeDays.split(',').map(Number) : [];
  if (!parsed.success || parsed.data.windowStart >= parsed.data.windowEnd || days.length < 1 || days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    redirect('/admin/daily-reporting?status=invalid');
  }
  const supabase = await createClient();
  const select = supabase.from('market_reporting_windows').select('id').eq('session_kind', parsed.data.sessionKind);
  const existingQuery = parsed.data.marketId == null ? select.is('market_id', null) : select.eq('market_id', parsed.data.marketId);
  const { data: existing } = await existingQuery.maybeSingle();
  const values = {
    market_id: parsed.data.marketId,
    session_kind: parsed.data.sessionKind,
    window_start: parsed.data.windowStart,
    window_end: parsed.data.windowEnd,
    timezone_name: 'Africa/Lagos',
    active_days: days,
    is_active: true,
    updated_by: actor.id,
    updated_at: new Date().toISOString(),
  };
  const result = existing
    ? await supabase.from('market_reporting_windows').update(values).eq('id', existing.id)
    : await supabase.from('market_reporting_windows').insert(values);
  if (result.error) redirect('/admin/daily-reporting?status=save-failed');
  saved();
}

export async function saveReportingSettings(formData: FormData): Promise<void> {
  const actor = await requireAdmin('/admin/daily-reporting');
  ensureFeature();
  const parsed = z.object({ graceMinutes: z.coerce.number().int().min(0).max(1440) }).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect('/admin/daily-reporting?status=invalid');
  const supabase = await createClient();
  const { error } = await supabase.from('market_reporting_settings').upsert({
    singleton: true,
    timezone_name: 'Africa/Lagos',
    grace_minutes: parsed.data.graceMinutes,
    updated_by: actor.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'singleton' });
  if (error) redirect('/admin/daily-reporting?status=save-failed');
  saved();
}

export async function recordMarketClosure(formData: FormData): Promise<void> {
  const actor = await requireAdmin('/admin/daily-reporting');
  ensureFeature();
  const parsed = z.object({
    marketId: z.coerce.number().int().positive(),
    businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.string().trim().max(500).default(''),
  }).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect('/admin/daily-reporting?status=invalid');
  const supabase = await createClient();
  const { error } = await supabase.from('market_reporting_closures').upsert({
    market_id: parsed.data.marketId,
    business_date: parsed.data.businessDate,
    reason: parsed.data.reason || null,
    created_by: actor.id,
  }, { onConflict: 'market_id,business_date' });
  if (error) redirect('/admin/daily-reporting?status=save-failed');
  saved();
}
