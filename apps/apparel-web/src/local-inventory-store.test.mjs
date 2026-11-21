import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { initializeInventoryStore, readInventory, writeInventory, undoInventory } from './local-inventory-store.mjs';

test('SQLite apply and undo preserve the prior version and reject stale writes', () => {
  const db = new DatabaseSync(':memory:');
  try {
    initializeInventoryStore(db);
    assert.deepEqual(readInventory(db), { revision: 0, rows: [], canUndo: false });
    const first = [{ sku: 'SHIRT-01', name: '셔츠', quantity: 3 }];
    const second = [{ sku: 'PANTS-01', name: '바지', quantity: 7 }];
    assert.equal(writeInventory(db, 0, first), true);
    assert.equal(writeInventory(db, 0, second), false);
    assert.deepEqual(readInventory(db).rows, first);
    assert.equal(writeInventory(db, 1, second), true);
    assert.equal(undoInventory(db, 1), false);
    assert.equal(undoInventory(db, 2), true);
    assert.deepEqual(readInventory(db), { revision: 3, rows: first, canUndo: false });
    assert.equal(undoInventory(db, 3), false);
  } finally { db.close(); }
});
