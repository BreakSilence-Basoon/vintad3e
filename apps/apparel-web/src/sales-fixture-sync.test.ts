import test from 'node:test';
import assert from 'node:assert/strict';
import { readFixtureSync, writeFixtureSync } from './sales-fixture-sync.ts';

test('synthetic sync stays in supplied storage and preserves malformed state', () => {
  let value: string | null = null;
  const store = { getItem: () => value, setItem: (_: string, next: string) => { value = next; } };
  const first = new Date('2026-02-03T04:05:06.000Z');
  assert.equal(readFixtureSync(store), null);
  assert.equal(writeFixtureSync(store, first), first.toISOString());
  assert.equal(readFixtureSync(store), first.toISOString());
  value = 'corrupted';
  assert.equal(writeFixtureSync(store, first), null);
  assert.equal(value, 'corrupted');
  assert.equal(writeFixtureSync({ getItem: () => { throw new Error('unavailable'); }, setItem: () => {} }, first), null);
});
