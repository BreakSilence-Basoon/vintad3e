import assert from 'node:assert/strict';
import test from 'node:test';
import { getSalesOverviewFixture } from './sales-overview-fixture.ts';

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
