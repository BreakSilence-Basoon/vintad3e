import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyInventoryOptionFilters } from './inventory-collection.ts';
import { filterFixtureInventory, getFixtureInventory } from './inventory-fixture.ts';

test('fixture is available only through explicit development opt-in', () => {
  assert.equal(getFixtureInventory('production', '1').length, 0);
  assert.equal(getFixtureInventory('development', undefined).length, 0);
  const items = getFixtureInventory('development', '1');
  assert.equal(items.length, 2);
  items[0].variants.length = 0;
  assert.equal(getFixtureInventory('development', '1')[0].variants.length, 2);
});

test('collection, search and tracked option filters work together', () => {
  const items = getFixtureInventory('development', '1');
  const filters = { ...emptyInventoryOptionFilters, collection: 'in-house' as const, search: '' };
  assert.equal(filterFixtureInventory(items, filters)[0].id, 'basic');
  assert.equal(filterFixtureInventory(items, { ...filters, collection: 'collab' })[0].id, 'collab');
  assert.equal(filterFixtureInventory(items, { ...filters, search: '화이트' }).length, 1);
  assert.equal(filterFixtureInventory(items, { ...filters, color: '블루' }).length, 0);
  items[0].variants.forEach((variant) => { variant.tracksInventory = false; });
  assert.equal(filterFixtureInventory(items, filters).length, 0);
});
