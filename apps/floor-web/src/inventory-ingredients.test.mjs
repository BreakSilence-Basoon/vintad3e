import test from 'node:test'; import assert from 'node:assert/strict'; import { parseIngredients, newIngredient } from './inventory-ingredients.mjs';
test('synthetic ingredients reject malformed or duplicate input and storage',()=>{assert.deepEqual(parseIngredients(null),[]);assert.equal(parseIngredients('{bad'),null);assert.equal(parseIngredients('[{}]'),null);assert.equal(newIngredient('  ','g',[]),null);assert.equal(newIngredient('재료 01','g',[{name:'재료 01'}]),null);assert.equal(newIngredient('재료 02','bad',[]),null);const item=newIngredient('재료 02','g',[]);assert.deepEqual(parseIngredients(JSON.stringify([item])),[item]);});
test('the baseline ingredient and 100 added ingredients stay readable at the limit', () => {
  const added = Array.from({ length: 99 }, (_, index) => newIngredient(`재료 ${index + 2}`, 'g', []));
  const baseline = { id: 'baseline', name: '재료 01', unit: 'g' };
  const last = newIngredient('재료 101', 'ml', [baseline, ...added]);
  assert.ok(last);
  assert.equal(parseIngredients(JSON.stringify([...added, last])).length, 100);
  assert.equal(newIngredient('재료 102', 'ea', [baseline, ...added, last]), null);
});
