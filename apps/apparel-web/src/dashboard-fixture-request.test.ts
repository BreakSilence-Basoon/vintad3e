import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtureDashboardRequest, readFixtureDisplay } from './dashboard-fixture-request.ts';

test('synthetic work transfer updates both locations together and preserves invalid data', async () => {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window'), oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { sessionStorage: storage } });
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });
  const stockSlot = 'vintad3e-apparel-fixture-stock', store = 'basic:seongsu:TSHIRT-001-BK-M', warehouse = 'basic:hanam:TSHIRT-001-BK-M';
  const post = (path: string, body: object) => fixtureDashboardRequest(path, { method: 'POST', body: JSON.stringify(body) });
  try {
    data.set(stockSlot, JSON.stringify({ [store]: { onHand: 1, target: 3, shortage: 2, tracking: true }, [warehouse]: { onHand: 4, target: 0, shortage: 0, tracking: true } }));
    assert.equal((await post('/api/admin/seongsu-work-quantities', { action: 'save', stockTargetId: store, skuId: 'TSHIRT-001-BK-M', locationId: 'seongsu', workQty: 2 })).status, 200);
    assert.equal((await post('/api/admin/seongsu-work-quantities', { action: 'transfer', productId: 'basic' })).status, 200);
    const rows = JSON.parse(data.get(stockSlot)!);
    assert.equal(rows[store].onHand, 3); assert.equal(rows[store].shortage, 0); assert.equal(rows[store].workQty, 0); assert.equal(rows[warehouse].onHand, 2);
    assert.equal((await post('/api/admin/seongsu-work-quantities', { action: 'save', stockTargetId: store, skuId: 'TSHIRT-001-BK-M', locationId: 'seongsu', workQty: 9 })).status, 200);
    const before = data.get(stockSlot);
    assert.equal((await post('/api/admin/seongsu-work-quantities', { action: 'transfer' })).status, 409);
    assert.equal(data.get(stockSlot), before);
    data.set(stockSlot, '{broken');
    assert.equal((await post('/api/admin/seongsu-work-quantities', { action: 'transfer' })).status, 503);
    assert.equal(data.get(stockSlot), '{broken');
    assert.equal((await post('/api/admin/products/basic/display', { hidden: true })).status, 200);
    assert.equal(readFixtureDisplay()?.basic, true);
    assert.equal((await post('/api/admin/products/unknown/display', { hidden: false })).status, 400);
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow); else Reflect.deleteProperty(globalThis, 'window');
    if (oldStorage) Object.defineProperty(globalThis, 'sessionStorage', oldStorage); else Reflect.deleteProperty(globalThis, 'sessionStorage');
  }
});
