-- =============================================================================
-- 0032 — Persistent market coverage + opening/closing reporting sessions
--
-- Additive only. Existing tasks, batches and price observations remain intact.
-- Historical rows receive NULL reporting-session fields and are NOT guessed
-- into opening/closing sessions. This migration is intentionally not applied
-- to the connected Supabase project: its remote migration ledger does not match
-- this repository's migration chain (see docs/DATABASE_MIGRATION.md).
-- =============================================================================

-- ------------------------------------------------------------ vocabulary ----
do $$ begin
  create type public.reporting_session_kind as enum ('opening', 'closing');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reporting_session_status as enum (
    'scheduled', 'in_progress', 'partially_submitted', 'submitted',
    'overdue', 'closed', 'reopened'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reporting_item_status as enum (
    'expected', 'draft', 'submitted', 'verified', 'published', 'rejected',
    'no_reliable_quote', 'unavailable', 'market_closed'
  );
exception when duplicate_object then null; end $$;

-- ------------------------------------------ persistent assignment details ----
alter table public.market_agent_assignments
  add column if not exists supervisor_id uuid references public.profiles(id) on delete set null,
  add column if not exists shared_coverage boolean not null default false,
  add column if not exists operational_notes text,
  add column if not exists priority public.operational_priority not null default 'normal';

create index if not exists market_agent_assignments_supervisor_idx
  on public.market_agent_assignments (supervisor_id) where supervisor_id is not null;

-- Existing deployments may intentionally assign multiple agents to one
-- market; preserve that behavior and let the established assignment workflow
-- govern overlap rather than adding a global uniqueness policy here.
-- ------------------------------------- market commodity configuration -------
create table if not exists public.market_commodity_reporting_configs (
  id uuid primary key default gen_random_uuid(),
  market_id bigint not null references public.markets(id) on delete restrict,
  commodity_id bigint not null references public.commodities(id) on delete restrict,
  grade_id bigint references public.commodity_grades(id) on delete restrict,
  unit_id bigint not null references public.measurement_units(id) on delete restrict,
  currency_code char(3) not null default 'NGN' check (currency_code ~ '^[A-Z]{3}$'),
  price_type public.price_type not null,
  min_expected_amount numeric(18,4) check (min_expected_amount is null or min_expected_amount > 0),
  max_expected_amount numeric(18,4) check (max_expected_amount is null or max_expected_amount > 0),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_commodity_reporting_config_bounds check (
    min_expected_amount is null or max_expected_amount is null or min_expected_amount <= max_expected_amount
  ),
  constraint market_commodity_reporting_config_unique
    unique nulls not distinct (market_id, commodity_id, grade_id, unit_id, price_type)
);

create index if not exists market_commodity_reporting_configs_lookup_idx
  on public.market_commodity_reporting_configs (market_id, commodity_id)
  where is_active;

create table if not exists public.market_assignment_reporting_coverage (
  assignment_id bigint not null references public.market_agent_assignments(id) on delete cascade,
  reporting_config_id uuid not null references public.market_commodity_reporting_configs(id) on delete restrict,
  is_active boolean not null default true,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  primary key (assignment_id, reporting_config_id)
);

create index if not exists market_assignment_reporting_coverage_active_idx
  on public.market_assignment_reporting_coverage (assignment_id, display_order)
  where is_active;

create or replace function public.guard_assignment_reporting_coverage_market()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment_market bigint;
  v_config_market bigint;
begin
  select market_id into v_assignment_market
    from public.market_agent_assignments where id = new.assignment_id;
  select market_id into v_config_market
    from public.market_commodity_reporting_configs where id = new.reporting_config_id;
  if v_assignment_market is null or v_config_market is distinct from v_assignment_market then
    raise exception 'Commodity reporting configuration must belong to the assignment market.'
      using errcode = 'foreign_key_violation';
  end if;
  if exists (
    select 1 from public.market_commodity_reporting_configs c
     where c.id = new.reporting_config_id and c.grade_id is not null
       and not exists (
         select 1 from public.commodity_grades g
          where g.id = c.grade_id and g.commodity_id = c.commodity_id
       )
  ) then
    raise exception 'The configured grade must belong to the configured commodity.'
      using errcode = 'foreign_key_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists market_assignment_reporting_coverage_market_guard on public.market_assignment_reporting_coverage;
create trigger market_assignment_reporting_coverage_market_guard
  before insert or update on public.market_assignment_reporting_coverage
  for each row execute function public.guard_assignment_reporting_coverage_market();

-- --------------------------------------------------------- reporting times --
create table if not exists public.market_reporting_windows (
  id uuid primary key default gen_random_uuid(),
  market_id bigint references public.markets(id) on delete cascade,
  session_kind public.reporting_session_kind not null,
  window_start time not null,
  window_end time not null,
  timezone_name text not null default 'Africa/Lagos',
  active_days smallint[] not null default '{1,2,3,4,5,6}',
  is_active boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint market_reporting_windows_valid check (window_start < window_end),
  constraint market_reporting_windows_days check (
    cardinality(active_days) between 1 and 7
    and active_days <@ array[0,1,2,3,4,5,6]::smallint[]
  ),
  constraint market_reporting_windows_timezone check (length(trim(timezone_name)) > 0)
);

create unique index if not exists market_reporting_windows_global_unique
  on public.market_reporting_windows (session_kind) where market_id is null;
create unique index if not exists market_reporting_windows_market_unique
  on public.market_reporting_windows (market_id, session_kind) where market_id is not null;

insert into public.market_reporting_windows (market_id, session_kind, window_start, window_end, timezone_name)
values
  (null, 'opening', '07:00', '11:00', 'Africa/Lagos'),
  (null, 'closing', '15:00', '19:00', 'Africa/Lagos')
on conflict do nothing;

create table if not exists public.market_reporting_closures (
  id bigint generated always as identity primary key,
  market_id bigint not null references public.markets(id) on delete cascade,
  business_date date not null,
  reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (market_id, business_date)
);

create table if not exists public.market_reporting_settings (
  singleton boolean primary key default true check (singleton),
  timezone_name text not null default 'Africa/Lagos',
  grace_minutes integer not null default 0 check (grace_minutes between 0 and 1440),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.market_reporting_settings (singleton) values (true)
on conflict (singleton) do nothing;

-- --------------------------------------------------------- daily sessions --
create table if not exists public.daily_market_reporting_sessions (
  id uuid primary key default gen_random_uuid(),
  assignment_id bigint not null references public.market_agent_assignments(id) on delete restrict,
  agent_user_id uuid not null references public.profiles(id) on delete restrict,
  market_id bigint not null references public.markets(id) on delete restrict,
  business_date date not null,
  session_kind public.reporting_session_kind not null,
  session_status public.reporting_session_status not null default 'scheduled',
  window_start_at timestamptz not null,
  window_end_at timestamptz not null,
  timezone_name text not null default 'Africa/Lagos',
  generated_at timestamptz not null default now(),
  opened_at timestamptz,
  submitted_at timestamptz,
  closed_at timestamptz,
  reopened_by uuid references public.profiles(id) on delete set null,
  reopen_reason text,
  collection_batch_id bigint unique references public.collection_batches(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint daily_market_reporting_session_window check (window_start_at < window_end_at),
  constraint daily_market_reporting_session_assignment_unique
    unique (assignment_id, business_date, session_kind)
);

create index if not exists daily_reporting_sessions_agent_date_idx
  on public.daily_market_reporting_sessions (agent_user_id, business_date desc);
create index if not exists daily_reporting_sessions_market_date_idx
  on public.daily_market_reporting_sessions (market_id, business_date desc, session_kind);
create index if not exists daily_reporting_sessions_status_window_idx
  on public.daily_market_reporting_sessions (session_status, window_end_at);

create table if not exists public.daily_market_reporting_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.daily_market_reporting_sessions(id) on delete cascade,
  reporting_config_id uuid not null references public.market_commodity_reporting_configs(id) on delete restrict,
  commodity_id bigint not null references public.commodities(id) on delete restrict,
  grade_id bigint references public.commodity_grades(id) on delete restrict,
  unit_id bigint not null references public.measurement_units(id) on delete restrict,
  currency_code char(3) not null,
  price_type public.price_type not null,
  min_expected_amount numeric(18,4),
  max_expected_amount numeric(18,4),
  status public.reporting_item_status not null default 'expected',
  observation_id uuid references public.price_observations(id) on delete set null,
  note text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, reporting_config_id),
  constraint daily_reporting_item_observation_unique unique (observation_id)
);

create index if not exists daily_reporting_items_session_order_idx
  on public.daily_market_reporting_items (session_id, display_order);
create index if not exists daily_reporting_items_status_idx
  on public.daily_market_reporting_items (status, session_id);

alter table public.price_observations
  add column if not exists daily_reporting_session_id uuid
    references public.daily_market_reporting_sessions(id) on delete set null,
  add column if not exists reporting_business_date date,
  add column if not exists reporting_session_kind public.reporting_session_kind;

create index if not exists price_observations_reporting_session_idx
  on public.price_observations (daily_reporting_session_id, commodity_id)
  where daily_reporting_session_id is not null;

-- Extend the already-public, publication-gated view without changing its
-- existing columns or filters. These operational labels are therefore never
-- visible for submitted-but-unverified, rejected, or unpublished observations.
create or replace view public.published_price_observations
with (security_invoker = true)
as
select
  o.id, o.commodity_id, o.market_id, o.variety_id, o.grade_id, o.price_type,
  o.reported_amount, o.reported_unit_id, o.package_weight_kg,
  o.normalized_amount, o.normalized_unit_id, o.currency_code,
  o.collected_at, o.collected_at_precision, o.submitted_at, o.verified_at,
  o.published_at, o.agent_user_id, o.verified_by, o.verification_status,
  o.notes, o.source_system, o.source_reference, o.created_at,
  c.name as commodity_name, c.slug as commodity_slug, c.category_id,
  cc.name as category_name, cc.slug as category_slug,
  m.name as market_name, m.slug as market_slug,
  s.id as state_id, s.name as state_name, s.slug as state_slug,
  co.code as country_code, g.name as grade_name, v.name as variety_name,
  u.code as unit_code, u.name as unit_name, u.dimension as unit_dimension,
  u.is_specific as unit_is_specific,
  coalesce(o.normalized_amount, o.reported_amount) as display_amount,
  coalesce(o.normalized_unit_id, o.reported_unit_id) as display_unit_id,
  c.freshness_window_hours,
  o.daily_reporting_session_id, o.reporting_business_date, o.reporting_session_kind,
  ru.name as reported_unit_name, ru.code as reported_unit_code
from public.price_observations o
join public.commodities c on c.id = o.commodity_id
join public.commodity_categories cc on cc.id = c.category_id
join public.markets m on m.id = o.market_id
join public.states s on s.id = m.state_id
join public.countries co on co.id = s.country_id
left join public.commodity_grades g on g.id = o.grade_id
left join public.commodity_varieties v on v.id = o.variety_id
left join public.measurement_units u on u.id = coalesce(o.normalized_unit_id, o.reported_unit_id)
left join public.measurement_units ru on ru.id = o.reported_unit_id
where o.is_current and o.published_at is not null
  and o.verification_status in ('verified', 'legacy_unverified');
grant select on public.published_price_observations to anon, authenticated;

-- ------------------------------------------------------------- RLS/grants --
alter table public.market_commodity_reporting_configs enable row level security;
alter table public.market_assignment_reporting_coverage enable row level security;
alter table public.market_reporting_windows enable row level security;
alter table public.market_reporting_closures enable row level security;
alter table public.market_reporting_settings enable row level security;
alter table public.daily_market_reporting_sessions enable row level security;
alter table public.daily_market_reporting_items enable row level security;

create policy market_reporting_configs_read on public.market_commodity_reporting_configs
  for select to authenticated
  using (public.is_staff() or market_id in (select public.assigned_market_ids()));
create policy market_reporting_configs_staff_write on public.market_commodity_reporting_configs
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy market_assignment_reporting_coverage_read on public.market_assignment_reporting_coverage
  for select to authenticated using (
    public.is_staff() or exists (
      select 1 from public.market_agent_assignments a
       where a.id = assignment_id and a.user_id = auth.uid()
    )
  );
create policy market_assignment_reporting_coverage_staff_write on public.market_assignment_reporting_coverage
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy market_reporting_windows_read on public.market_reporting_windows
  for select to authenticated using (
    public.is_staff() or market_id is null or market_id in (select public.assigned_market_ids())
  );
create policy market_reporting_windows_staff_write on public.market_reporting_windows
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy market_reporting_closures_read on public.market_reporting_closures
  for select to authenticated using (
    public.is_staff() or market_id in (select public.assigned_market_ids())
  );
create policy market_reporting_closures_staff_write on public.market_reporting_closures
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy market_reporting_settings_staff_read on public.market_reporting_settings
  for select to authenticated using (public.is_staff());
create policy market_reporting_settings_staff_write on public.market_reporting_settings
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy daily_reporting_sessions_read on public.daily_market_reporting_sessions
  for select to authenticated using (public.is_staff() or agent_user_id = auth.uid());
create policy daily_reporting_items_read on public.daily_market_reporting_items
  for select to authenticated using (
    public.is_staff() or exists (
      select 1 from public.daily_market_reporting_sessions s
       where s.id = session_id and s.agent_user_id = auth.uid()
    )
  );

grant select on public.market_commodity_reporting_configs,
  public.market_assignment_reporting_coverage,
  public.market_reporting_windows,
  public.market_reporting_closures,
  public.market_reporting_settings,
  public.daily_market_reporting_sessions,
  public.daily_market_reporting_items to authenticated;
grant insert, update, delete on public.market_commodity_reporting_configs,
  public.market_assignment_reporting_coverage,
  public.market_reporting_windows,
  public.market_reporting_closures,
  public.market_reporting_settings to authenticated;
grant all on public.market_commodity_reporting_configs,
  public.market_assignment_reporting_coverage,
  public.market_reporting_windows,
  public.market_reporting_closures,
  public.market_reporting_settings,
  public.daily_market_reporting_sessions,
  public.daily_market_reporting_items to service_role;

-- Configuration and session lifecycle changes use the existing append-only
-- audit stream. Never put credentials or tokens in these row snapshots.
create or replace function public.audit_daily_reporting_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_events (actor_id, action, entity_table, entity_id, before_value, after_value)
  values (
    nullif(current_setting('request.jwt.claim.sub', true), '')::uuid,
    lower(tg_op) || '_daily_reporting',
    tg_table_name,
    coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id', to_jsonb(new)->>'assignment_id', to_jsonb(old)->>'assignment_id'),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

do $$
declare v_table text;
begin
  foreach v_table in array array[
    'market_commodity_reporting_configs', 'market_assignment_reporting_coverage',
    'market_reporting_windows', 'market_reporting_closures', 'market_reporting_settings',
    'daily_market_reporting_sessions', 'daily_market_reporting_items'
  ] loop
    execute format('drop trigger if exists %I on public.%I', v_table || '_audit', v_table);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_daily_reporting_change()', v_table || '_audit', v_table);
  end loop;
end $$;

-- Keep reporting history intact. Corrections and lifecycle changes are
-- appended/updated through the controlled workflow, not erased by table CRUD.
create or replace function public.prevent_daily_reporting_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Daily reporting history is retained for audit. Close or correct the record instead of deleting it.'
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger daily_reporting_sessions_no_delete
  before delete on public.daily_market_reporting_sessions
  for each row execute function public.prevent_daily_reporting_delete();
create trigger daily_reporting_items_no_delete
  before delete on public.daily_market_reporting_items
  for each row execute function public.prevent_daily_reporting_delete();

-- -------------------------------------------------------- idempotent scheduler --
create or replace function public.generate_daily_market_reporting_sessions(p_date date default current_date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment record;
  v_window public.market_reporting_windows;
  v_kind public.reporting_session_kind;
  v_session_id uuid;
  v_inserted integer := 0;
  v_dow smallint := extract(dow from p_date)::smallint;
begin
  if auth.role() <> 'service_role' and not public.is_staff() then
    raise exception 'Only the scheduler or operations staff may generate reporting sessions.'
      using errcode = 'insufficient_privilege';
  end if;

  for v_assignment in
    select a.id, a.user_id, a.market_id
      from public.market_agent_assignments a
      join public.profiles p on p.id = a.user_id and p.is_active and p.account_status = 'active'
      join public.markets m on m.id = a.market_id and m.is_active
     where a.status::text = 'active'
       and a.starts_on <= p_date
       and (a.ends_on is null or a.ends_on >= p_date)
       and exists (
         select 1
           from public.market_assignment_reporting_coverage ac
           join public.market_commodity_reporting_configs c on c.id = ac.reporting_config_id
          where ac.assignment_id = a.id and ac.is_active and c.is_active
       )
       and not exists (
         select 1 from public.market_reporting_closures close_day
          where close_day.market_id = a.market_id and close_day.business_date = p_date
       )
       and (
         not exists (select 1 from public.market_operating_schedules mos where mos.market_id = a.market_id)
         or exists (
           select 1 from public.market_operating_schedules mos
            where mos.market_id = a.market_id and mos.day_of_week = v_dow and mos.opens_at is not null
         )
       )
     order by a.market_id, a.user_id
  loop
    foreach v_kind in array array['opening'::public.reporting_session_kind, 'closing'::public.reporting_session_kind]
    loop
      select * into v_window
        from public.market_reporting_windows w
       where w.is_active
         and w.session_kind = v_kind
         and (w.market_id = v_assignment.market_id or w.market_id is null)
       order by (w.market_id is not null) desc
       limit 1;

      if not found then
        -- Defensive fallback if an administrator removed the default row.
        v_window.session_kind := v_kind;
        v_window.window_start := case when v_kind = 'opening' then '07:00'::time else '15:00'::time end;
        v_window.window_end := case when v_kind = 'opening' then '11:00'::time else '19:00'::time end;
        v_window.timezone_name := 'Africa/Lagos';
        v_window.active_days := '{1,2,3,4,5,6}'::smallint[];
      end if;

      if not (v_dow = any(v_window.active_days)) then continue; end if;

      insert into public.daily_market_reporting_sessions (
        assignment_id, agent_user_id, market_id, business_date, session_kind,
        window_start_at, window_end_at, timezone_name
      ) values (
        v_assignment.id, v_assignment.user_id, v_assignment.market_id, p_date, v_kind,
        (p_date + v_window.window_start) at time zone v_window.timezone_name,
        (p_date + v_window.window_end) at time zone v_window.timezone_name,
        v_window.timezone_name
      )
      on conflict (assignment_id, business_date, session_kind) do nothing
      returning id into v_session_id;

      if v_session_id is not null then
        v_inserted := v_inserted + 1;
        insert into public.daily_market_reporting_items (
          session_id, reporting_config_id, commodity_id, grade_id, unit_id,
          currency_code, price_type, min_expected_amount, max_expected_amount, display_order
        )
        select v_session_id, c.id, c.commodity_id, c.grade_id, c.unit_id,
               c.currency_code, c.price_type, c.min_expected_amount, c.max_expected_amount, ac.display_order
          from public.market_assignment_reporting_coverage ac
          join public.market_commodity_reporting_configs c on c.id = ac.reporting_config_id
         where ac.assignment_id = v_assignment.id
           and ac.is_active and c.is_active
         order by ac.display_order, c.commodity_id;
      end if;
      v_session_id := null;
    end loop;
  end loop;
  return v_inserted;
end;
$$;

revoke all on function public.generate_daily_market_reporting_sessions(date) from public;
grant execute on function public.generate_daily_market_reporting_sessions(date) to authenticated, service_role;

create or replace function public.mark_overdue_daily_market_reporting_sessions(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grace integer;
  v_count integer;
begin
  if auth.role() <> 'service_role' and not public.is_staff() then
    raise exception 'Only the scheduler or operations staff may update overdue reporting status.'
      using errcode = 'insufficient_privilege';
  end if;
  select grace_minutes into v_grace from public.market_reporting_settings where singleton;
  update public.daily_market_reporting_sessions
     set session_status = 'overdue'
   where session_status in ('scheduled', 'in_progress', 'partially_submitted')
     and window_end_at + make_interval(mins => coalesce(v_grace, 0)) < p_now;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.mark_overdue_daily_market_reporting_sessions(timestamptz) from public;
grant execute on function public.mark_overdue_daily_market_reporting_sessions(timestamptz) to authenticated, service_role;

-- --------------------------------------------------------- open a report ----
create or replace function public.open_daily_market_reporting_session(p_session_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.daily_market_reporting_sessions;
  v_batch_id bigint;
  v_reference text;
begin
  if auth.uid() is null or not public.is_active_account()
     or not public.has_role('agent', 'market_supervisor') then
    raise exception 'An active market agent account is required.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_session from public.daily_market_reporting_sessions where id = p_session_id for update;
  if not found or v_session.agent_user_id <> auth.uid() then
    raise exception 'That reporting session is not assigned to you.' using errcode = 'insufficient_privilege';
  end if;
  if not exists (
    select 1 from public.market_agent_assignments a
     where a.id = v_session.assignment_id and a.user_id = auth.uid()
       and a.market_id = v_session.market_id and a.status::text = 'active'
       and a.starts_on <= v_session.business_date
       and (a.ends_on is null or a.ends_on >= v_session.business_date)
  ) then
    raise exception 'Your active assignment no longer covers this reporting session.' using errcode = 'insufficient_privilege';
  end if;
  if v_session.session_status not in ('scheduled', 'in_progress', 'partially_submitted', 'reopened') then
    raise exception 'This reporting session is closed.' using errcode = 'invalid_parameter_value';
  end if;
  if v_session.session_status <> 'reopened'
     and (now() < v_session.window_start_at or now() > v_session.window_end_at) then
    raise exception 'This reporting window is not open. Ask your supervisor to reopen a late session.'
      using errcode = 'invalid_parameter_value';
  end if;

  if v_session.collection_batch_id is not null then
    v_batch_id := v_session.collection_batch_id;
  else
    v_reference := 'RPT-' || to_char(v_session.business_date, 'YYYYMMDD') || '-' ||
      upper(substr(replace(v_session.id::text, '-', ''), 1, 10));
    insert into public.collection_batches (reference, market_id, agent_user_id, notes)
    values (v_reference, v_session.market_id, auth.uid(), 'Daily ' || v_session.session_kind::text || ' report')
    returning id into v_batch_id;

    update public.daily_market_reporting_sessions
       set collection_batch_id = v_batch_id,
           opened_at = coalesce(opened_at, now()),
           session_status = case when session_status = 'scheduled' then 'in_progress'::public.reporting_session_status else session_status end
     where id = v_session.id;
  end if;
  return v_batch_id;
end;
$$;

revoke all on function public.open_daily_market_reporting_session(uuid) from public;
grant execute on function public.open_daily_market_reporting_session(uuid) to authenticated;

-- A non-price outcome is explicit; it can never create a zero-price row.
create or replace function public.set_daily_reporting_item_status(
  p_session_id uuid,
  p_item_id uuid,
  p_status public.reporting_item_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.daily_market_reporting_sessions;
  v_item public.daily_market_reporting_items;
begin
  if auth.uid() is null or not public.is_active_account()
     or not public.has_role('agent', 'market_supervisor') then
    raise exception 'An active market agent account is required.' using errcode = 'insufficient_privilege';
  end if;
  if p_status not in ('no_reliable_quote', 'unavailable', 'market_closed') then
    raise exception 'Choose a valid no-price reporting status.' using errcode = 'invalid_parameter_value';
  end if;
  select * into v_session from public.daily_market_reporting_sessions
   where id = p_session_id and agent_user_id = auth.uid() for update;
  if not found then
    raise exception 'That reporting session is not assigned to you.' using errcode = 'insufficient_privilege';
  end if;
  select * into v_item from public.daily_market_reporting_items
   where id = p_item_id and session_id = p_session_id for update;
  if not found or v_item.observation_id is not null then
    raise exception 'That commodity entry has already been reported as a price.' using errcode = 'invalid_parameter_value';
  end if;
  if v_item.status = p_status
     and v_item.note is not distinct from nullif(left(trim(coalesce(p_note, '')), 500), '') then
    return;
  end if;
  if not exists (
    select 1 from public.market_agent_assignments a
     where a.id = v_session.assignment_id and a.user_id = auth.uid()
       and a.market_id = v_session.market_id and a.status::text = 'active'
       and a.starts_on <= v_session.business_date
       and (a.ends_on is null or a.ends_on >= v_session.business_date)
  ) then
    raise exception 'Your active assignment no longer covers this reporting session.' using errcode = 'insufficient_privilege';
  end if;
  if v_session.session_status not in ('in_progress', 'partially_submitted', 'reopened') then
    raise exception 'That reporting session is not open.' using errcode = 'insufficient_privilege';
  end if;
  update public.daily_market_reporting_items
     set status = p_status,
         note = nullif(left(trim(coalesce(p_note, '')), 500), ''),
         updated_at = now()
   where id = p_item_id;
end;
$$;

revoke all on function public.set_daily_reporting_item_status(uuid, uuid, public.reporting_item_status, text) from public;
grant execute on function public.set_daily_reporting_item_status(uuid, uuid, public.reporting_item_status, text) to authenticated;

-- ------------------------------------------------ price/session integrity --
create or replace function public.validate_daily_reporting_observation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.daily_market_reporting_sessions;
  v_item public.daily_market_reporting_items;
begin
  if new.collection_batch_id is null then return new; end if;
  select * into v_session from public.daily_market_reporting_sessions
   where collection_batch_id = new.collection_batch_id;
  if not found then return new; end if; -- legacy/manual collection batch

  if new.agent_user_id is distinct from v_session.agent_user_id
     or new.market_id is distinct from v_session.market_id then
    raise exception 'The observation does not match the assigned reporting session.'
      using errcode = 'insufficient_privilege';
  end if;
  if v_session.session_status not in ('in_progress', 'partially_submitted', 'reopened') then
    raise exception 'The daily reporting session is not open.' using errcode = 'invalid_parameter_value';
  end if;

  select * into v_item from public.daily_market_reporting_items i
   where i.session_id = v_session.id
     and i.commodity_id = new.commodity_id
     and i.grade_id is not distinct from new.grade_id
     and i.unit_id = new.reported_unit_id
     and i.currency_code = new.currency_code
     and i.price_type = new.price_type
   for update;
  if not found or (v_item.observation_id is not null and v_item.observation_id is distinct from new.id) then
    raise exception 'This commodity, grade, unit and price definition are not configured for the reporting session.'
      using errcode = 'invalid_parameter_value';
  end if;

  new.daily_reporting_session_id := v_session.id;
  new.reporting_business_date := v_session.business_date;
  new.reporting_session_kind := v_session.session_kind;
  return new;
end;
$$;

drop trigger if exists price_observation_validate_daily_reporting on public.price_observations;
create trigger price_observation_validate_daily_reporting
  before insert or update of collection_batch_id, commodity_id, grade_id, reported_unit_id,
    currency_code, price_type, agent_user_id, market_id
  on public.price_observations
  for each row execute function public.validate_daily_reporting_observation();

create or replace function public.sync_daily_reporting_item_from_observation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_status public.reporting_item_status;
begin
  if new.daily_reporting_session_id is null then return new; end if;
  v_item_status := case
    when new.published_at is not null then 'published'::public.reporting_item_status
    else case new.verification_status::text
      when 'draft' then 'draft'::public.reporting_item_status
      when 'submitted' then 'submitted'::public.reporting_item_status
      when 'pending_verification' then 'submitted'::public.reporting_item_status
      when 'verified' then 'verified'::public.reporting_item_status
      when 'legacy_unverified' then 'verified'::public.reporting_item_status
      when 'rejected' then 'rejected'::public.reporting_item_status
      when 'correction_requested' then 'rejected'::public.reporting_item_status
      else 'submitted'::public.reporting_item_status
    end
  end;
  update public.daily_market_reporting_items
     set observation_id = new.id, status = v_item_status, updated_at = now()
   where session_id = new.daily_reporting_session_id
     and commodity_id = new.commodity_id
     and grade_id is not distinct from new.grade_id
     and unit_id = new.reported_unit_id
     and currency_code = new.currency_code
     and price_type = new.price_type;
  update public.daily_market_reporting_sessions s
     set session_status = case
       when not exists (
         select 1 from public.daily_market_reporting_items i
          where i.session_id = s.id and i.status not in (
            'submitted','verified','published','rejected','no_reliable_quote','unavailable','market_closed'
          )
       ) then 'submitted'::public.reporting_session_status
       else 'partially_submitted'::public.reporting_session_status
     end,
     submitted_at = case when not exists (
       select 1 from public.daily_market_reporting_items i
        where i.session_id = s.id and i.status not in (
          'submitted','verified','published','rejected','no_reliable_quote','unavailable','market_closed'
        )
     ) then coalesce(s.submitted_at, now()) else s.submitted_at end
   where s.id = new.daily_reporting_session_id;
  return new;
end;
$$;

drop trigger if exists price_observation_sync_daily_reporting on public.price_observations;
create trigger price_observation_sync_daily_reporting
  after insert or update of verification_status, collection_batch_id, published_at on public.price_observations
  for each row execute function public.sync_daily_reporting_item_from_observation();

-- Submit one configured daily item through the established verification RPC.
-- The existing submit_observation() remains the authority for agent role,
-- account, assignment, idempotency event and audit writes; this wrapper only
-- supplies session-owned configuration and attaches the session batch.
create or replace function public.submit_daily_reporting_price(
  p_session_id uuid,
  p_item_id uuid,
  p_amount numeric,
  p_collected_at timestamptz,
  p_notes text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.daily_market_reporting_sessions;
  v_item public.daily_market_reporting_items;
  v_observation_id uuid;
  v_existing public.price_observations;
  v_payload jsonb;
begin
  if auth.uid() is null or not public.is_active_account()
     or not public.has_role('agent', 'market_supervisor') then
    raise exception 'An active market agent account is required.' using errcode = 'insufficient_privilege';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter a positive price or choose an availability status.' using errcode = 'invalid_parameter_value';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'A stable submission key is required.' using errcode = 'invalid_parameter_value';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(trim(p_idempotency_key), 0));

  select * into v_session from public.daily_market_reporting_sessions
   where id = p_session_id and agent_user_id = auth.uid() for update;
  if not found then
    raise exception 'That reporting session is not assigned to you.' using errcode = 'insufficient_privilege';
  end if;
  select * into v_item from public.daily_market_reporting_items
   where id = p_item_id and session_id = p_session_id for update;
  if not found then
    raise exception 'That commodity is not expected in this session.' using errcode = 'invalid_parameter_value';
  end if;

  -- A response can be lost after the commit. Resolve the stable key before
  -- checking whether the now-complete session still accepts new submissions.
  select * into v_existing from public.price_observations where submission_key = trim(p_idempotency_key);
  if found then
    if v_existing.daily_reporting_session_id = p_session_id
       and v_existing.commodity_id = v_item.commodity_id then
      return v_existing.id;
    end if;
    raise exception 'This submission key has already been used for another report item.'
      using errcode = 'unique_violation';
  end if;
  if v_session.session_status not in ('in_progress', 'partially_submitted', 'reopened') then
    raise exception 'That daily reporting session is not open.' using errcode = 'insufficient_privilege';
  end if;

  v_payload := jsonb_build_object(
    'market_id', v_session.market_id,
    'commodity_id', v_item.commodity_id,
    'grade_id', v_item.grade_id,
    'price_type', v_item.price_type,
    'reported_amount', p_amount::text,
    'reported_unit_id', v_item.unit_id,
    'currency_code', v_item.currency_code,
    'collected_at', coalesce(p_collected_at, now()),
    'collected_at_precision', 'minute',
    'notes', nullif(left(trim(coalesce(p_notes, '')), 500), ''),
    'source_reference', 'daily_reporting:' || v_session.session_kind::text,
    'task_id', null
  );

  v_observation_id := public.submit_observation(v_payload, trim(p_idempotency_key));
  update public.price_observations
     set collection_batch_id = v_session.collection_batch_id
   where id = v_observation_id
     and agent_user_id = auth.uid()
     and collection_batch_id is distinct from v_session.collection_batch_id;
  return v_observation_id;
end;
$$;

revoke all on function public.submit_daily_reporting_price(uuid, uuid, numeric, timestamptz, text, text) from public;
grant execute on function public.submit_daily_reporting_price(uuid, uuid, numeric, timestamptz, text, text) to authenticated;

-- Recompute session status after an explicit non-price availability outcome.
create or replace function public.recompute_daily_reporting_session_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_complete boolean;
begin
  select not exists (
    select 1 from public.daily_market_reporting_items i
     where i.session_id = new.session_id and i.status not in (
       'submitted','verified','published','rejected','no_reliable_quote','unavailable','market_closed'
     )
  ) into v_complete;
  update public.daily_market_reporting_sessions
     set session_status = case when v_complete then 'submitted'::public.reporting_session_status
                               else 'partially_submitted'::public.reporting_session_status end,
         submitted_at = case when v_complete then coalesce(submitted_at, now()) else submitted_at end
   where id = new.session_id;
  return new;
end;
$$;

drop trigger if exists daily_reporting_item_recompute_session on public.daily_market_reporting_items;
create trigger daily_reporting_item_recompute_session
  after update of status on public.daily_market_reporting_items
  for each row execute function public.recompute_daily_reporting_session_status();

-- Preserve auditability for reopened sessions. Only staff can reopen; the
-- reason is mandatory and no observation is modified by this operation.
create or replace function public.reopen_daily_market_reporting_session(
  p_session_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Only operations staff may reopen a reporting session.' using errcode = 'insufficient_privilege';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'A reason of at least five characters is required.' using errcode = 'invalid_parameter_value';
  end if;
  update public.daily_market_reporting_sessions
     set session_status = 'reopened', reopened_by = auth.uid(), reopen_reason = left(trim(p_reason), 500)
   where id = p_session_id
     and session_status in ('overdue', 'partially_submitted', 'closed');
  if not found then
    raise exception 'That session cannot be reopened.' using errcode = 'invalid_parameter_value';
  end if;
end;
$$;

revoke all on function public.reopen_daily_market_reporting_session(uuid, text) from public;
grant execute on function public.reopen_daily_market_reporting_session(uuid, text) to authenticated;

comment on table public.market_commodity_reporting_configs is
  'Approved price definition, unit, currency and optional grade for one market-commodity reporting series.';
comment on table public.market_assignment_reporting_coverage is
  'The active market reporting configurations covered by a persistent agent assignment.';
comment on table public.daily_market_reporting_sessions is
  'Idempotently generated opening/closing reporting expectations; historical observations stay unclassified unless explicitly linked.';
comment on table public.daily_market_reporting_items is
  'Snapshot of expected commodity configurations and their reporting/non-price outcomes for one daily session.';
comment on column public.price_observations.reporting_session_kind is
  'Operational opening/closing session; independent of economic price_type.';
