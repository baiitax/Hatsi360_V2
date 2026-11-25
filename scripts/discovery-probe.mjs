/**
 * Phase 04 discovery probe — a privileged read of the live database.
 *
 * An anon-key read of `price_observations` returns 0 rows because of RLS, which
 * is *not* emptiness. So this connects directly with `pg` using the
 * `SUPABASE_DB_*` variables. It writes nothing and it is safe to re-run.
 *
 * It exists so the numbers in `docs/phase-04/DISCOVERY_AND_DATA_READINESS.md`
 * are reproducible rather than remembered. Run it again after any data change
 * and compare.
 *
 *   node scripts/discovery-probe.mjs
 */
import pg from 'pg';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const vars = {};
for (const line of readFileSync(join(root, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const client = new pg.Client({
  host: vars.SUPABASE_DB_HOST,
  port: Number(vars.SUPABASE_DB_PORT),
  user: vars.SUPABASE_DB_USER,
  password: vars.SUPABASE_DB_PASSWORD,
  database: vars.SUPABASE_DB_NAME,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20_000,
});

const q = async (sql, params) => {
  try {
    return await client.query(sql, params);
  } catch (error) {
    return { error: error.message, rows: [] };
  }
};

await client.connect();
console.log(`connected: ${vars.SUPABASE_DB_NAME} as ${vars.SUPABASE_DB_USER}\n`);

/* 1 — table inventory ------------------------------------------------ */
const tables = await q(
  `select table_name from information_schema.tables
   where table_schema='public' and table_type='BASE TABLE' order by table_name`,
);
const counts = [];
for (const t of tables.rows) {
  const r = await q(`select count(*)::int n from "${t.table_name}"`);
  counts.push({ table: t.table_name, rows: r.error ? -1 : r.rows[0].n });
}
console.log(`=== ${counts.length} tables · ${counts.filter((c) => c.rows > 0).length} with rows · ${counts.filter((c) => c.rows === 0).length} empty ===`);
for (const c of counts.filter((c) => c.rows > 0).sort((a, b) => b.rows - a.rows)) {
  console.log(`  ${String(c.rows).padStart(6)}  ${c.table}`);
}
console.log(`  EMPTY: ${counts.filter((c) => c.rows === 0).map((c) => c.table).join(', ')}`);

/* 2 — the publication filter, read exactly --------------------------- */
console.log('\n=== published_price_observations ===');
console.table((await q('select count(*)::int n from published_price_observations')).rows);
console.log(
  (await q("select pg_get_viewdef('published_price_observations'::regclass, true)")).rows[0].def,
);

/* 3 — what is actually in price_observations ------------------------- */
console.log('=== price_observations ===');
console.table(
  (
    await q(`select
      count(*)::int total,
      count(*) filter (where is_current)::int current,
      count(*) filter (where published_at is not null)::int published,
      count(*) filter (where source_system='test_fixture')::int test_fixture,
      count(*) filter (where source_system='legacy_import')::int legacy,
      count(*) filter (where normalized_amount is not null)::int normalized,
      count(*) filter (where variety_id is not null)::int with_variety,
      count(distinct collected_at::date)::int distinct_days,
      count(distinct price_type)::int price_types,
      count(distinct currency_code)::int currencies
    from price_observations`)
  ).rows,
);

/* 4 — per-commodity readiness --------------------------------------- */
console.log('=== per-commodity readiness ===');
console.table(
  (
    await q(`select c.name, c.slug, c.is_active,
      (select count(*) from price_observations po where po.commodity_id=c.id)::int obs,
      (select count(*) from price_observations po where po.commodity_id=c.id and po.published_at is not null)::int published,
      (select count(distinct po.market_id) from price_observations po where po.commodity_id=c.id)::int markets,
      (select count(distinct po.grade_id) from price_observations po where po.commodity_id=c.id and po.grade_id is not null)::int grades_used,
      (select count(*) from commodity_grades g where g.commodity_id=c.id)::int grades_defined,
      (select count(*) from commodity_synonyms sy where sy.commodity_id=c.id)::int synonyms,
      (select count(*) from commodity_specifications sp where sp.commodity_id=c.id)::int specs,
      (select count(*) from commodity_seasonality se where se.commodity_id=c.id)::int seasons,
      (select count(*) from commodity_fundamentals f where f.commodity_id=c.id)::int fundamentals,
      (select min(po.collected_at)::date from price_observations po where po.commodity_id=c.id) first_obs,
      (select max(po.collected_at)::date from price_observations po where po.commodity_id=c.id) last_obs
    from commodities c order by obs desc, c.name`)
  ).rows,
);

/* 5 — the brief's priority list, resolved against the real catalogue -- */
console.log("=== the brief's 10 priority commodities ===");
for (const w of [
  'maize', 'sorghum', 'millet', 'rice', 'sesame',
  'groundnut', 'soybean', 'gum arabic', 'hibiscus', 'ginger',
]) {
  const r = await q(`select name, is_active from commodities where slug ilike $1 or name ilike $1`, [
    `%${w}%`,
  ]);
  console.log(`  ${w.padEnd(11)} ${r.rows.map((x) => `${x.name}${x.is_active ? '' : ' (INACTIVE)'}`).join(', ') || 'NOT FOUND'}`);
}

/* 6 — publicly visible trade offers --------------------------------- */
console.log('\n=== publicly visible seller offers (status=verified AND disclosure_consent) ===');
console.table(
  (
    await q(`select c.name commodity, m.name market, s.price_amount, s.price_type, u.code unit, s.valid_until
      from seller_offers s join commodities c on c.id=s.commodity_id
      left join markets m on m.id=s.market_id left join measurement_units u on u.id=s.unit_id
      where s.status='verified' and s.disclosure_consent order by c.name`)
  ).rows,
);

await client.end();
