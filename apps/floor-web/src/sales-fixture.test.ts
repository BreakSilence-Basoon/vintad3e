import assert from 'node:assert/strict';
import test from 'node:test';
import { getSalesFixtures, filterSalesFixtures } from './sales-fixture.ts';
import { parseSalesFilters } from './sales-filters.ts';

const now = new Date('2026-11-18T04:00:00.000Z');
test('sales fixtures are available only with explicit development opt-in', () => {
  assert.deepEqual(getSalesFixtures('production', '1', now), []);
  assert.deepEqual(getSalesFixtures('development', undefined, now), []);
  assert.equal(getSalesFixtures('development', '1', now).length, 3);
});
test('keyword, custom Seoul dates and sort apply to fixture sales', () => {
  const sales = getSalesFixtures('development', '1', now);
  assert.deepEqual(filterSalesFixtures(sales, parseSalesFilters({ keyword: '쿠키' })).map(sale => sale.id), ['sale-2']);
  assert.deepEqual(filterSalesFixtures(sales, parseSalesFilters({ range: 'custom', from: '2026-11-17', to: '2026-11-17' })).map(sale => sale.id), ['sale-2']);
  assert.deepEqual(filterSalesFixtures(sales, parseSalesFilters({ sort: 'asc' })).map(sale => sale.id), ['sale-3','sale-2','sale-1']);
});
