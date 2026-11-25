-- Additive daily reporting workflow integration test. Runs only inside the
-- throwaway PostgreSQL migration harness and rolls every row back.
begin;

insert into auth.users (id, email) values
  ('99999999-1111-4111-8111-111111111111', 'report-admin@test.local'),
  ('99999999-2222-4222-8222-222222222222', 'report-agent@test.local'),
  ('99999999-3333-4333-8333-333333333333', 'other-agent@test.local')
on conflict (id) do nothing;
insert into public.profiles (id, full_name, role, account_status) values
  ('99999999-1111-4111-8111-111111111111', 'Reporting Admin', 'admin', 'active'),
  ('99999999-2222-4222-8222-222222222222', 'Reporting Agent', 'agent', 'active'),
  ('99999999-3333-4333-8333-333333333333', 'Other Agent', 'agent', 'active')
on conflict (id) do update set role = excluded.role, account_status = excluded.account_status;

set local role authenticated;
set local request.jwt.claim.sub = '99999999-1111-4111-8111-111111111111';

-- Make the test independent of wall-clock hour; rollback restores defaults.
update public.market_reporting_windows
   set window_start = '00:00', window_end = '23:59', active_days = array[0,1,2,3,4,5,6]::smallint[]
 where market_id is null;

insert into public.market_agent_assignments (user_id, market_id, status, starts_on)
select '99999999-2222-4222-8222-222222222222', m.id, 'active', current_date - 2
  from public.markets m
 where m.is_active
   and not exists (select 1 from public.market_operating_schedules mos where mos.market_id = m.id)
 order by m.id
 limit 1;

insert into public.market_commodity_reporting_configs (
  market_id, commodity_id, unit_id, currency_code, price_type, created_by, updated_by
)
select a.market_id, c.id, u.id, 'NGN', 'wholesale_transaction',
       '99999999-1111-4111-8111-111111111111', '99999999-1111-4111-8111-111111111111'
  from public.market_agent_assignments a
  cross join lateral (select id from public.commodities where is_active order by id limit 1) c
  cross join lateral (select id from public.measurement_units order by id limit 1) u
 where a.user_id = '99999999-2222-4222-8222-222222222222'
   and a.status = 'active'
on conflict do nothing;

insert into public.market_assignment_reporting_coverage (assignment_id, reporting_config_id)
select a.id, c.id
  from public.market_agent_assignments a
  join public.market_commodity_reporting_configs c on c.market_id = a.market_id
 where a.user_id = '99999999-2222-4222-8222-222222222222'
   and a.status = 'active'
   and c.created_by = '99999999-1111-4111-8111-111111111111'
on conflict do nothing;

do $$
declare
  v_assignment bigint;
  v_market bigint;
  v_config uuid;
  v_date date := current_date;
  v_open uuid;
  v_close uuid;
  v_open_item uuid;
  v_close_item uuid;
  v_batch bigint;
  v_first uuid;
  v_retry uuid;
  v_session_status text;
begin
  select id, market_id into v_assignment, v_market
    from public.market_agent_assignments
   where user_id = '99999999-2222-4222-8222-222222222222' and status = 'active'
   order by id desc limit 1;
  select id into v_config from public.market_commodity_reporting_configs
   where market_id = v_market and created_by = '99999999-1111-4111-8111-111111111111'
   order by created_at desc limit 1;
  perform public.generate_daily_market_reporting_sessions(v_date);
  perform public.generate_daily_market_reporting_sessions(v_date);
  select id into v_open from public.daily_market_reporting_sessions
   where assignment_id = v_assignment and business_date = v_date and session_kind = 'opening';
  select id into v_close from public.daily_market_reporting_sessions
   where assignment_id = v_assignment and business_date = v_date and session_kind = 'closing';
  if v_open is null or v_close is null then raise exception 'Opening and closing sessions were not generated'; end if;
  select id into v_open_item from public.daily_market_reporting_items where session_id = v_open and reporting_config_id = v_config;
  select id into v_close_item from public.daily_market_reporting_items where session_id = v_close and reporting_config_id = v_config;
  if v_open_item is null or v_close_item is null then raise exception 'Configured coverage was not snapshotted into both sessions'; end if;

  -- Sessions are unique and repeated generation is idempotent.
  if (select count(*) from public.daily_market_reporting_sessions where assignment_id = v_assignment and business_date = v_date) <> 2 then
    raise exception 'Repeated generation created duplicate sessions';
  end if;

  perform set_config('request.jwt.claim.sub', '99999999-2222-4222-8222-222222222222', true);
  v_batch := public.open_daily_market_reporting_session(v_open);
  select session_status::text into v_session_status from public.daily_market_reporting_sessions where id = v_open;
  if v_session_status not in ('in_progress','partially_submitted','reopened') then raise exception 'Expected opened session state, got %', v_session_status; end if;
  v_first := public.submit_daily_reporting_price(v_open, v_open_item, 42000, now(), 'test quote', 'daily-report-test-key-001');
  v_retry := public.submit_daily_reporting_price(v_open, v_open_item, 42000, now(), 'test quote', 'daily-report-test-key-001');
  if v_first is distinct from v_retry then raise exception 'Idempotent retry created a different observation'; end if;
  if (select count(*) from public.price_observations where submission_key = 'daily-report-test-key-001') <> 1 then
    raise exception 'Idempotent retry created duplicate observations';
  end if;
  if not exists (select 1 from public.price_observations where id = v_first and daily_reporting_session_id = v_open and reporting_session_kind = 'opening') then
    raise exception 'Submitted observation was not linked to its operational session';
  end if;
  if not exists (select 1 from public.daily_market_reporting_items where id = v_open_item and observation_id = v_first and status = 'submitted') then
    raise exception 'Item status did not follow the existing observation submission';
  end if;
  if exists (select 1 from public.published_price_observations where id = v_first) then
    raise exception 'A submitted report became public before verification and publication';
  end if;

  perform set_config('request.jwt.claim.sub', '99999999-1111-4111-8111-111111111111', true);
  perform public.approve_observation(v_first, 'Workflow test approval');
  if exists (select 1 from public.published_price_observations where id = v_first) then
    raise exception 'A verified but unpublished report became public';
  end if;
  perform public.publish_observation(v_first);
  if not exists (select 1 from public.published_price_observations where id = v_first and reporting_session_kind = 'opening' and reporting_business_date = v_date) then
    raise exception 'Published verified opening price did not appear with its reporting label';
  end if;
  if not exists (select 1 from public.daily_market_reporting_items where id = v_open_item and status = 'published') then
    raise exception 'Reporting item did not follow publication state';
  end if;

  perform set_config('request.jwt.claim.sub', '99999999-2222-4222-8222-222222222222', true);
  perform public.open_daily_market_reporting_session(v_close);
  perform public.set_daily_reporting_item_status(v_close, v_close_item, 'unavailable', 'No supply today');
  perform public.set_daily_reporting_item_status(v_close, v_close_item, 'unavailable', 'No supply today');
  if exists (select 1 from public.price_observations where daily_reporting_session_id = v_close) then
    raise exception 'Availability outcome created a fake price observation';
  end if;
  if not exists (select 1 from public.daily_market_reporting_items where id = v_close_item and status = 'unavailable') then
    raise exception 'Availability outcome was not persisted';
  end if;

  perform set_config('request.jwt.claim.sub', '99999999-3333-4333-8333-333333333333', true);
  begin
    perform public.submit_daily_reporting_price(v_open, v_open_item, 42000, now(), null, 'other-agent-key-001');
    raise exception 'Unassigned agent was allowed to submit into another agent''s session';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;
