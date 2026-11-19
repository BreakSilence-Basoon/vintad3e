import assert from 'node:assert/strict';
import test from 'node:test';
import { fixtureFloorDaily, fixtureFloorTrend, fixtureMenuTotals } from './floor-fixture-daily.ts';
import { getSalesFixtures } from './sales-fixture.ts';
const now = new Date('2026-11-18T12:00:00.000Z');
test('daily brief computes only opted-in POS sales and comparisons', () => {
  const day = fixtureFloorDaily('development', '1', now);
  assert.equal(day.businessDate, '2026-11-18');
  assert.equal(day.totals.fnbNet, 12000);
  assert.equal(day.totals.fnbQuantity, 3);
  assert.equal(day.comparisons.previousDay.totals.fnbNet, 0);
  assert.equal(day.menus[0].productName, '드립 커피');
  assert.deepEqual(day.menus.map(item => [item.productName, item.net, item.listUnitPrice]), [['드립 커피', 10000, 5000], ['차', 2000, 2000]]);
  assert.equal(day.menus[0].quantity, 2);
  assert.equal(day.menus.reduce((sum, item) => sum + item.net, 0), day.totals.fnbNet);
  assert.equal(fixtureFloorDaily('production', '1', now).totals.fnbNet, 0);
  assert.equal(fixtureFloorDaily('development', undefined, now).menus.length, 0);
});
test('repeated menu lines combine amounts without inventing a unit price', () => {
  const sale = getSalesFixtures('development', '1', now)[0];
  const differentPrice = { ...sale, items: [{ ...sale.items[0], listUnitPrice: 6000 }] };
  const menu = fixtureMenuTotals([sale, differentPrice]).find(item => item.productName === '드립 커피')!;
  assert.equal(menu.quantity, 3);
  assert.equal(menu.net, 15000);
  assert.equal(menu.listUnitPrice, null);
});
test('period totals use the same sales and respect business dates', () => {
  const week = fixtureFloorTrend('development', '1', now, { days: 7 });
  assert.equal(week.from, '2026-11-12');
  assert.equal(week.to, '2026-11-18');
  assert.equal(week.totals.fnbNet, 32000);
  assert.equal(week.totals.fnbOrderCount, 5);
  const custom = fixtureFloorTrend('development', '1', now, { from: '2026-11-17', to: '2026-11-17' });
  assert.equal(custom.totals.fnbNet, 0);
  assert.equal(fixtureFloorTrend('production', '1', now, { days: 7 }).daily.length, 0);
});
