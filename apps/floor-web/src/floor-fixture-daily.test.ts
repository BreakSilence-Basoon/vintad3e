import assert from 'node:assert/strict';
import test from 'node:test';
import { fixtureFloorDaily, fixtureFloorTrend } from './floor-fixture-daily.ts';
const now = new Date('2026-11-18T12:00:00.000Z');
test('daily brief computes only opted-in POS sales and comparisons', () => {
  const day = fixtureFloorDaily('development', '1', now);
  assert.equal(day.businessDate, '2026-11-18');
  assert.equal(day.totals.fnbNet, 12000);
  assert.equal(day.totals.fnbQuantity, 2);
  assert.equal(day.comparisons.previousDay.totals.fnbNet, 0);
  assert.equal(day.menus[0].productName, '드립 커피');
  assert.equal(fixtureFloorDaily('production', '1', now).totals.fnbNet, 0);
  assert.equal(fixtureFloorDaily('development', undefined, now).menus.length, 0);
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
