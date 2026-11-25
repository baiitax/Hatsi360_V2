import { describe, expect, it } from 'vitest';
import { collectAllPages } from '@/lib/data/pagination';

describe('collectAllPages', () => {
  it('continues past the first 1,000-row REST boundary without dropping rows', async () => {
    const source = Array.from({ length: 1_351 }, (_, index) => index);
    const requests: { offset: number; limit: number }[] = [];
    const result = await collectAllPages(async (offset, limit) => {
      requests.push({ offset, limit });
      return source.slice(offset, offset + limit);
    });

    expect(result).toEqual(source);
    expect(requests).toEqual([
      { offset: 0, limit: 500 },
      { offset: 500, limit: 500 },
      { offset: 1_000, limit: 500 },
    ]);
  });

  it('returns an empty result for an empty source', async () => {
    await expect(collectAllPages(async () => [])).resolves.toEqual([]);
  });

  it('validates page size', async () => {
    await expect(collectAllPages(async () => [], 0)).rejects.toThrow(/positive integer/);
  });
});
