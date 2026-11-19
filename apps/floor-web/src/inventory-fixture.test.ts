import assert from 'node:assert/strict';
import test from 'node:test';
import { fixtureInventory } from './inventory-fixture.ts';
test('inventory fixtures require explicit development opt-in and are independent reads', () => {
  assert.equal(fixtureInventory('production','1'), null);
  assert.equal(fixtureInventory('development',undefined), null);
  const first=fixtureInventory('development','1'); assert.ok(first);
  assert.equal(first.rows[0].name,'재료 01'); assert.equal(first.recipes[0].menuName,'음료 01');
  first.rows.length=0; assert.equal(fixtureInventory('development','1')?.rows.length,1);
});
