import type { Metadata } from 'next';
<<<<<<< HEAD
import { requirePathAccess } from '@/lib/auth/guards';
=======
import { requireStaff } from '@/lib/auth/guards';
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2
import { listReferenceData } from '@/lib/operations/admin';
import { DataTable, type Column } from '@/components/ops/DataTable';
import { PageHeader, InlineEmpty } from '@/components/ops/Primitives';

export const metadata: Metadata = {
  title: 'Market zones — Control Centre',
  robots: { index: false, follow: false },
};

/**
 * Market zones — an optional grouping of markets inside a state.
 *
<<<<<<< HEAD
 * The catalogue migrated from the previous system has no zones, so the empty
 * state is the truthful state. Nothing is invented to fill it.
 */
export default async function AdminZonesPage() {
  await requirePathAccess('/admin/zones');
=======
 * The current catalogue has no zones, so the empty
 * state is the truthful state. Nothing is invented to fill it.
 */
export default async function AdminZonesPage() {
  await requireStaff('/admin/zones');
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2
  const { zones } = await listReferenceData();

  const rows = (zones as {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    state_id: number;
  }[]).map((zone) => ({
    id: zone.id,
    name: zone.name,
    slug: zone.slug,
    description: zone.description,
    stateId: zone.state_id,
  }));

  const columns: Column<(typeof rows)[number]>[] = [
    { key: 'name', header: 'Zone', cell: (row) => <span className="font-medium text-ink-900">{row.name}</span> },
    { key: 'slug', header: 'Slug', cell: (row) => <span className="font-mono text-xs">{row.slug}</span> },
    {
      key: 'description',
      header: 'Description',
      cell: (row) => (
        <span className="text-xs text-ink-600">{row.description ?? 'No description recorded.'}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Market zones"
<<<<<<< HEAD
        description="Optional groupings of markets inside a state — a grains corridor, a river market belt. Zones are assigned by operations staff; the migrated catalogue has none."
=======
        description="Optional groupings of markets inside a state — a grains corridor, a river market belt. Zones are assigned by operations staff."
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Catalogue' },
          { label: 'Market zones' },
        ]}
      />
      {rows.length === 0 ? (
        <InlineEmpty
          title="No market zones are configured"
<<<<<<< HEAD
          description="Zones are an optional operational grouping. The eleven markets in the catalogue migrated without one, and none has been invented to fill the gap."
=======
          description="Zones are an optional operational grouping."
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2
        />
      ) : (
        <DataTable
          caption="Market zones"
          columns={columns}
          rows={rows}
          rowKey={(row) => String(row.id)}
          empty="No market zones are configured."
        />
      )}
    </>
  );
}
