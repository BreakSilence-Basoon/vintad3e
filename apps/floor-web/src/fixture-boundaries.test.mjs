import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSalesHref, parseSalesFilters, parseSalesPage } from './sales-filters.ts';
import { filterSalesFixtures, getSalesFixtures, paginateSalesFixtures } from './sales-fixture.ts';
import { fixtureInventory } from './inventory-fixture.ts';
import { newIngredient, parseIngredients } from './inventory-ingredients.mjs';
import { newCount, parseCounts } from './inventory-counts.mjs';
import { fixtureSignInNotice } from './fixture-sign-in-notice.mjs';

test('sales pagination handles empty, invalid and bounded inputs', () => {
  for (const value of [undefined, '', '-1', 'not-a-number', 'Infinity']) assert.equal(parseSalesPage(value), 1);
  assert.equal(parseSalesPage('2'), 2);
  assert.equal(parseSalesPage('201'), 200);
  assert.equal(parseSalesPage(['3', '4']), 3);
});

test('sales filters preserve valid inputs and drop malformed date shapes', () => {
  const filters = parseSalesFilters({ range: 'custom', from: '2026-01-02', to: '2026-01-03', keyword: ' 예시 ', sort: 'asc' });
  assert.equal(filters.dateFrom.toISOString(), '2026-01-01T15:00:00.000Z');
  assert.equal(filters.keyword, '예시');
  assert.equal(new URL(buildSalesHref(2, filters), 'http://example.invalid').searchParams.get('salesPage'), '2');
  const invalid = parseSalesFilters({ range: 'custom', from: 'not-a-date', to: '' });
  assert.equal(invalid.dateFrom, null); assert.equal(invalid.dateTo, null);
});

test('sales fixtures and filtering handle disabled and empty lists', () => {
  const now = new Date('2026-01-03T00:00:00.000Z'), filters = parseSalesFilters({ keyword: '없는 상품' });
  assert.deepEqual(getSalesFixtures('production', '1', now), []);
  assert.deepEqual(getSalesFixtures('development', '1', new Date('invalid')), []);
  assert.deepEqual(filterSalesFixtures([], filters), []);
  assert.deepEqual(filterSalesFixtures(getSalesFixtures('development', '1', now), filters), []);
  assert.deepEqual(paginateSalesFixtures([], 1), []);
});

test('inventory fixtures return fresh data and fail closed when disabled', () => {
  const inventory = fixtureInventory('development', '1');
  assert.equal(inventory.ingredients.length, 1);
  inventory.ingredients[0].name = 'changed';
  assert.notEqual(fixtureInventory('development', '1').ingredients[0].name, 'changed');
  assert.equal(fixtureInventory('production', '1'), null);
  assert.equal(fixtureInventory('development', ''), null);
});

test('ingredient and count parsers reject malformed and duplicate synthetic records', () => {
  assert.deepEqual(parseIngredients(null), []);
  for (const raw of ['', '{', '{}', '[null]']) assert.equal(parseIngredients(raw), null);
  const item = newIngredient('재료 예시', 'g', []);
  assert.ok(item); assert.equal(parseIngredients(JSON.stringify([item, item])), null);
  assert.equal(newIngredient('재료 예시', 'g', [item]), null);
  assert.deepEqual(parseCounts(null, [item]), []);
  assert.equal(parseCounts('[]', [item]).length, 0);
  assert.equal(newCount('2026-01-01', '12:00', [item.id], ['-1'], [item], Date.parse('2026-01-02T00:00:00Z')), null);
});

test('sign-in notices safely handle empty and unknown categories', () => {
  assert.equal(fixtureSignInNotice(''), null); assert.equal(fixtureSignInNotice(null), null);
  assert.ok(fixtureSignInNotice('AccessDenied')?.title);
  assert.deepEqual(fixtureSignInNotice('__proto__'), fixtureSignInNotice('unknown'));
});
