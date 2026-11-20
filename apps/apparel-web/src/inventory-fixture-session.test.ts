import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFixtureStock, writeFixtureStock } from './inventory-fixture-session.ts';

test('only known fixture stock with valid values is restored', () => {
  const key = 'basic:seongsu:TSHIRT-001-BK-M';
  const valid = { onHand: 3, target: 10, shortage: 7, tracking: true };
  assert.deepEqual(parseFixtureStock(JSON.stringify({ [key]: valid, 'unrelated': valid })), { [key]: valid });
  assert.deepEqual(parseFixtureStock(JSON.stringify({ [key]: { ...valid, workQty: 2 } })), { [key]: { ...valid, workQty: 2 } });
  assert.deepEqual(parseFixtureStock(JSON.stringify({ [key]: { ...valid, workQty: -1 } })), {});
  assert.deepEqual(parseFixtureStock(JSON.stringify({ [key]: { ...valid, shortage: 8 } })), {});
  assert.deepEqual(parseFixtureStock(JSON.stringify({ [key]: { ...valid, onHand: -1 } })), {});
  assert.deepEqual(parseFixtureStock('{'), {});
  assert.deepEqual(parseFixtureStock('x'.repeat(16001)), {});
});

test('stock writes preserve corrupted, unknown and unavailable tab storage', () => {
  const key = 'basic:seongsu:TSHIRT-001-BK-M', row = { onHand: 3, target: 10, shortage: 7, tracking: true };
  let raw: string | null = null, blocked = false;
  const old = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { sessionStorage: { getItem: () => { if (blocked) throw new Error('unavailable'); return raw; }, setItem: (_key: string, value: string) => { raw = value; } } } });
  try {
    assert.equal(writeFixtureStock({ [key]: row }), true);
    assert.deepEqual(JSON.parse(raw!), { [key]: row });
    for (const value of ['{broken', JSON.stringify({ unknown: row }), JSON.stringify({ [key]: { ...row, extra: 'preserve' } }), JSON.stringify({ [key]: { ...row, workQty: -1 } }), JSON.stringify({ [key]: { ...row, tracking: false } })]) {
      raw = value; assert.equal(writeFixtureStock({ [key]: row }), false); assert.equal(raw, value);
    }
    raw = JSON.stringify({ [key]: row }); blocked = true;
    assert.equal(writeFixtureStock({ [key]: row }), false); assert.equal(raw, JSON.stringify({ [key]: row }));
  } finally { if (old) Object.defineProperty(globalThis, 'window', old); else Reflect.deleteProperty(globalThis, 'window'); }
});
