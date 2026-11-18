import assert from 'node:assert/strict';
import test from 'node:test';
import { getSalesFixtures, filterSalesFixtures, paginateSalesFixtures } from './sales-fixture.ts';
import { parseSalesFilters } from './sales-filters.ts';

const now = new Date('2026-11-18T04:00:00.000Z');
test('sales fixtures are available only with explicit development opt-in', () => {
  assert.deepEqual(getSalesFixtures('production', '1', now), []);
  assert.deepEqual(getSalesFixtures('development', undefined, now), []);
  assert.equal(getSalesFixtures('development', '1', now).length, 21);
});
test('keyword, custom Seoul dates and sort apply to fixture sales', () => {
  const sales = getSalesFixtures('development', '1', now);
  assert.deepEqual(filterSalesFixtures(sales, parseSalesFilters({ keyword: '쿠키' })).map(sale => sale.id), ['sale-2']);
  assert.deepEqual(filterSalesFixtures(sales, parseSalesFilters({ range: 'custom', from: '2026-11-17', to: '2026-11-17' })).map(sale => sale.id), ['sale-2']);
  assert.deepEqual(filterSalesFixtures(sales, parseSalesFilters({ sort: 'asc' })).slice(-3).map(sale => sale.id), ['sale-3','sale-2','sale-1']);
});

test('pagination follows filtered order and accumulates 18 items per page', () => {
  const sales = filterSalesFixtures(getSalesFixtures('development', '1', now), parseSalesFilters({}));
  assert.equal(paginateSalesFixtures(sales, 1).length, 18);
  assert.deepEqual(paginateSalesFixtures(sales, 2), sales);
  assert.deepEqual(paginateSalesFixtures([], 1), []);
  const filtered = filterSalesFixtures(sales, parseSalesFilters({ keyword: '쿠키' }));
  assert.deepEqual(paginateSalesFixtures(filtered, 1).map(sale => sale.id), ['sale-2']);
});
