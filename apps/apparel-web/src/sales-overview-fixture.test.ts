import assert from 'node:assert/strict';
import test from 'node:test';
import { getSalesOverviewFixture } from './sales-overview-fixture.ts';
import { getFixtureSales } from './sales-fixture.ts';

test('overview uses only opted-in synthetic sales and bounded ranges', () => {
  const now = new Date('2026-11-19T12:00:00.000Z');
  assert.equal(getSalesOverviewFixture('production', '1', now), null);
  assert.equal(getSalesOverviewFixture('development', undefined, now), null);
  assert.equal(getSalesOverviewFixture('development', '1', now, 'invalid', now.toISOString()), null);
  assert.equal(getSalesOverviewFixture('development', '1', now, '2024-01-01', now.toISOString()), null);
  const initial = getSalesOverviewFixture('development', '1', now)!;
  assert.equal(initial.totals.storeRevenue, 50000);
  assert.equal(initial.totals.onlineRevenue, 60000);
  assert.equal(initial.series.reduce((sum, row) => sum + row.storeRevenue, 0), initial.totals.storeRevenue);
  assert.equal(initial.series.reduce((sum, row) => sum + row.onlineRevenue, 0), initial.totals.onlineRevenue);
  assert.equal(initial.onlineApparelByDesign[0].productCode, null);
  const narrow = getSalesOverviewFixture('development', '1', now, '2026-09-19T12:00:00.000Z', '2026-10-30T12:00:00.000Z')!;
  assert.equal(narrow.totals.storeRevenue, 8000);
  assert.equal(narrow.totals.onlineRevenue, 60000);
  assert.equal(narrow.grain, 'day');
});

test('the synthetic POS sale has the same amount and Seoul day in sales and statistics', () => {
  for (const value of ['2026-11-18T14:59:59.999Z', '2026-11-18T15:00:00.000Z', '2026-11-18T15:00:00.001Z', '2026-11-19T12:00:00.000Z']) {
    const now = new Date(value), sale = getFixtureSales('development', '1', now).find(item => item.id === 'sale-1');
    const overview = getSalesOverviewFixture('development', '1', now)!;
    const design = overview.storeApparelByDesign.find(item => item.designName === '셔츠');
    assert.equal(design?.revenue ?? 0, sale?.amount ?? 0);
    if (sale) {
      const hour = new Date(Date.parse(sale.soldAt) + 9 * 3600000).toISOString().slice(0, 13);
      const detailed = getSalesOverviewFixture('development', '1', now, new Date(now.getTime() - 86400000).toISOString(), now.toISOString())!;
      const slot = detailed.series.find(item => item.bucket === hour);
      assert.equal(slot?.storeRevenue, sale.amount);
    }
  }
});
