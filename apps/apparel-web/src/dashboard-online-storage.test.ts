import test from 'node:test';
import assert from 'node:assert/strict';
import { readOnlineChecklist, saveOnlineChecklist } from './dashboard-online-storage.ts';
import { compareOrders, getNextSortState } from './dashboard-online-sort.ts';

test('online order preparation is stored in the current tab and invalid data is preserved', () => {
  const entries = new Map<string, string>();
  const storage = { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); } } as Storage;
  assert.deepEqual(readOnlineChecklist(storage), { seongsuPicked: false, hanamPrepared: false });
  assert.equal(saveOnlineChecklist(storage, { seongsuPicked: true, hanamPrepared: false }), true);
  assert.deepEqual(readOnlineChecklist(storage), { seongsuPicked: true, hanamPrepared: false });
  const key = [...entries.keys()][0];
  entries.set(key, '{bad');
  assert.equal(readOnlineChecklist(storage), null);
  assert.equal(saveOnlineChecklist(storage, { seongsuPicked: false, hanamPrepared: true }), false);
  assert.equal(entries.get(key), '{bad');
});

test('both preparation flags round-trip for every stored combination', () => {
  const entries = new Map<string, string>();
  const storage = { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); } } as Storage;
  for (const seongsuPicked of [false, true]) for (const hanamPrepared of [false, true]) {
    const checklist = { seongsuPicked, hanamPrepared };
    assert.equal(saveOnlineChecklist(storage, checklist), true);
    assert.deepEqual(readOnlineChecklist(storage), checklist);
  }
});

test('several synthetic online orders sort by item and date in both directions', () => {
  const base = { requestIds: [], orderNumber: '', channelNameKo: '', totalQuantity: 1, checklist: { seongsuPicked: false, hanamPrepared: false } };
  const orders = [
    { ...base, id: 'a', soldAt: '2026-01-03T00:00:00Z', itemSummary: '셔츠 10' },
    { ...base, id: 'b', soldAt: '2026-01-01T00:00:00Z', itemSummary: '셔츠 2' },
    { ...base, id: 'c', soldAt: '2026-01-02T00:00:00Z', itemSummary: '셔츠 2' },
  ];
  let state = { key: 'order', direction: 'desc' } as const;
  const sorted = (sort: Parameters<typeof compareOrders>[2]) => [...orders].sort((a, b) => compareOrders(a, b, sort)).map(order => order.id);
  assert.deepEqual(sorted(state), ['a', 'c', 'b']);
  assert.deepEqual(sorted(getNextSortState(state, 'order')), ['b', 'c', 'a']);
  const items = getNextSortState(state, 'items');
  assert.deepEqual(sorted(items), ['b', 'c', 'a']);
  assert.deepEqual(sorted(getNextSortState(items, 'items')), ['a', 'c', 'b']);
});
