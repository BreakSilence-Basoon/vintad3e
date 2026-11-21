import test from 'node:test';
import assert from 'node:assert/strict';
import { readOnlineChecklist, saveOnlineChecklist } from './dashboard-online-storage.ts';

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
