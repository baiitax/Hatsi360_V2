/**
 * Read all rows from a range-paginated data source without silently stopping at
 * its default page cap. Callers should keep this for data volumes that are
 * explicitly needed in memory; public aggregate endpoints should eventually
 * prefer database-side aggregate queries as volume grows.
 */
export async function collectAllPages<T>(
  fetchPage: (offset: number, limit: number) => Promise<readonly T[]>,
  pageSize = 500,
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError('pageSize must be a positive integer.');
  }

  const rows: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await fetchPage(offset, pageSize);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
