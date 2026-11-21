import assert from 'node:assert/strict';
import test from 'node:test';
import {
  belongsToInventoryCollection,
  buildInventoryHref,
  emptyInventoryOptionFilters,
  getInventoryCollection,
  getInventoryOptionFilters,
  variantMatchesInventoryOptionFilters,
} from './inventory-collection.ts';

test('collaboration uses product line, keeping artist graphics in the in-house collection', () => {
  const products = [
    { code: 'ITEM-A', name: 'Item A', businessDomain: 'APPAREL', lineCode: 'collab' },
    { code: 'ITEM-B', name: 'Item B', businessDomain: 'APPAREL', lineCode: 'artist' },
    { code: 'ITEM-C', name: 'Item C', businessDomain: 'APPAREL', lineCode: 'original' },
    { code: 'food', name: 'Food', businessDomain: 'FOOD', lineCode: 'collab' },
  ];
  assert.deepEqual(products.filter(p => belongsToInventoryCollection(p, 'collab')).map(p => p.code), ['ITEM-A']);
  assert.deepEqual(products.filter(p => belongsToInventoryCollection(p, 'in-house')).map(p => p.code), ['ITEM-B', 'ITEM-C']);
});

test('old collaboration links resolve to the new collection and canonical URLs drop FNB', () => {
  for (const domain of ['FNB', 'FOOD', 'BEVERAGE']) {
    const collection = getInventoryCollection({ businessDomain: domain });
    assert.equal(buildInventoryHref({ collection }), '/admin/products?collection=collab');
  }
  assert.equal(getInventoryCollection({ collection: 'in-house', businessDomain: 'FNB' }), 'in-house');
  assert.equal(getInventoryCollection({ collection: 'unknown' }), 'in-house');
  assert.equal(buildInventoryHref({ collection: getInventoryCollection({}) }), '/admin/products');
  const query = new URL(buildInventoryHref({ collection: 'collab' }), 'https://example.test').searchParams;
  assert.equal(query.get('collection'), 'collab');
  assert.equal(query.has('search'), false);
  assert.equal(query.has('businessDomain'), false);
});

test('search and option filters round-trip through the URL', () => {
  const filters = getInventoryOptionFilters({
    type: '반팔', color: '블랙', size: 'M', target: 'WOMEN', tracking: 'off',
  });
  assert.deepEqual(filters, { apparelType: '반팔', color: '블랙', size: 'M', target: 'WOMEN' });
  const href = buildInventoryHref({ collection: 'collab', search: ' Item A ', ...filters });
  const params = new URL(href, 'https://example.test').searchParams;
  assert.equal(params.get('search'), 'Item A');
  assert.equal(params.has('tracking'), false);
  assert.deepEqual(getInventoryOptionFilters(Object.fromEntries(params)), filters);
  assert.equal(
    buildInventoryHref({ collection: 'in-house', search: '', ...emptyInventoryOptionFilters }),
    '/admin/products',
  );
});

test('only inventory-tracked options match, and every chosen option must match', () => {
  const variant = {
    apparelType: '반팔', color: '블랙', size: 'M', apparelTarget: 'WOMEN', tracksInventory: true,
  };
  const pick = (patch: Partial<typeof emptyInventoryOptionFilters>, v = variant) =>
    variantMatchesInventoryOptionFilters(v, { ...emptyInventoryOptionFilters, ...patch });
  assert.equal(pick({}), true);
  assert.equal(pick({ apparelType: '반팔', color: '블랙', size: 'M', target: 'WOMEN' }), true);
  assert.equal(pick({ color: '화이트' }), false);
  assert.equal(pick({ target: 'MEN' }), false);
  assert.equal(pick({}, { ...variant, tracksInventory: false }), false);
});
import { parseSalesFilters } from './sales-filters.ts';

test('sales filters accept original options and bound invalid input', () => {
  const filters = parseSalesFilters({ range: 'custom', from: '2026-01-01', to: 'bad', source: 'pos', status: 'invalid', sort: 'asc', keyword: `  ${'a'.repeat(90)}  ` });
  assert.equal(filters.range, 'custom');
  assert.equal(filters.from, '2026-01-01');
  assert.equal(filters.to, '');
  assert.equal(filters.source, 'pos');
  assert.equal(filters.status, 'all');
  assert.equal(filters.sortDirection, 'asc');
  assert.equal(filters.keyword.length, 80);
});
import { getFixtureSales, filterFixtureSales } from './sales-fixture.ts';
import './sales-pagination.test.ts';
import './filter-combinations.test.ts';

test('synthetic sales honor explicit opt-in, KST dates, filters and ordering', () => {
  const now = new Date('2026-11-19T03:00:00.000Z');
  const sales = getFixtureSales('development', '1', now);
  assert.deepEqual(getFixtureSales('production', '1', now), []);
  assert.deepEqual(getFixtureSales('development', undefined, now), []);
  assert.equal(sales.length, 21);
  assert.deepEqual(filterFixtureSales(sales, parseSalesFilters({ range: 'today' }), now).map(item => item.id), ['sale-1']);
  assert.deepEqual(filterFixtureSales(sales, parseSalesFilters({ source: 'seongsu_ticket', status: 'pending' }), now).map(item => item.id), ['sale-2']);
  assert.deepEqual(filterFixtureSales(sales, parseSalesFilters({ range: 'custom', from: '2026-11-17', to: '2026-11-17' }), now).map(item => item.id), ['sale-2']);
  assert.deepEqual(filterFixtureSales(sales, parseSalesFilters({ keyword: '셔츠', source: 'pos' }), now).map(item => item.id), ['sale-1']);
  assert.deepEqual(filterFixtureSales(sales, parseSalesFilters({ sort: 'asc' }), now).slice(-2).map(item => item.id), ['sale-2', 'sale-1']);
});
