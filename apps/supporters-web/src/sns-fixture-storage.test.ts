import assert from 'node:assert/strict';
import test from 'node:test';
import { readConnection, readRegistrations, writeConnection, writeRegistration } from './sns-fixture-storage.ts';
function memory() { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } }; }
test('only known synthetic posts can change and registration is separate per platform', () => {
  const store = memory();
  assert.deepEqual(readRegistrations(store), {});
  assert.equal(writeRegistration(store, 'instagram-1', false), true);
  assert.equal(writeRegistration(store, 'tiktok-1', true), true);
  assert.equal(writeRegistration(store, 'unknown', true), false);
  assert.deepEqual(readRegistrations(store), { 'instagram-1': false, 'tiktok-1': true });
  store.setItem('vintad3e:sns-registrations', '{"unknown":true}');
  assert.equal(readRegistrations(store), null);
  assert.equal(writeRegistration(store, 'instagram-1', true), false);
});
test('synthetic connections are separated and storage failures fail closed', () => {
  const store = memory();
  assert.equal(readConnection(store, 'instagram'), true);
  assert.equal(writeConnection(store, 'instagram', false), true);
  assert.equal(readConnection(store, 'instagram'), false);
  assert.equal(readConnection(store, 'tiktok'), true);
  store.setItem('vintad3e:sns-connection:instagram', 'unexpected');
  assert.equal(readConnection(store, 'instagram'), null);
  assert.equal(writeConnection(store, 'instagram', true), false);
  const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  assert.equal(readRegistrations(broken), null);
  assert.equal(writeRegistration(broken, 'instagram-1', false), false);
  assert.equal(readConnection(broken, 'instagram'), null);
  assert.equal(writeConnection(broken, 'instagram', false), false);
});
