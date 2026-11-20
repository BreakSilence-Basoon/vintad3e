import test from 'node:test';
import assert from 'node:assert/strict';
import { createInventoryService } from './server-inventory-service.mjs';
const csv = text => new TextEncoder().encode(text);
test('server state validates a file, rejects stale writes and restores its previous rows', () => {
  const state = createInventoryService(), original = state.read();
  assert.throws(() => state.apply(0, csv('SKU,상품명,현재수량,이메일\nA,옷,1,a')));
  assert.deepEqual(state.read(), original);
  assert.equal(state.apply(0, csv('SKU,상품명,현재수량\nA,셔츠,5')), true);
  assert.equal(state.apply(0, csv('SKU,상품명,현재수량\nB,바지,1')), false);
  assert.equal(state.undo(0), false);
  assert.equal(state.undo(1), true);
  assert.deepEqual(state.read(), { ...original, revision: 2 });
});
