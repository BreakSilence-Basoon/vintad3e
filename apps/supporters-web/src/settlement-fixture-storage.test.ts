import assert from 'node:assert/strict';
import test from 'node:test';
import { readFixturePayouts, writeFixturePayout } from './settlement-fixture-storage.ts';

test('payout changes stay scoped to known fixture IDs and survive a read', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  assert.deepEqual(writeFixturePayout(storage, 'supporter-1', '2026-10', true, '2026-11-19'), { '2026-10': { paid: true, checkedDate: '2026-11-19' } });
  assert.deepEqual(readFixturePayouts(storage, 'supporter-2'), {});
  assert.equal(writeFixturePayout(storage, 'unknown', '2026-10', true, '2026-11-19'), null);
  assert.equal(writeFixturePayout(storage, 'supporter-1', 'not-a-month', true, '2026-11-19'), null);
  assert.deepEqual(readFixturePayouts(storage, 'supporter-1'), { '2026-10': { paid: true, checkedDate: '2026-11-19' } });
  values.set('vintad3e:settlement:supporter-1', '{');
  assert.equal(writeFixturePayout(storage, 'supporter-1', '2026-11', false, '2026-11-19'), null);
  assert.equal(values.get('vintad3e:settlement:supporter-1'), '{');
  const unavailable = { getItem: () => { throw new Error('unavailable'); }, setItem: () => { throw new Error('unavailable'); } };
  assert.equal(readFixturePayouts(unavailable, 'supporter-1'), null);
  assert.equal(writeFixturePayout(unavailable, 'supporter-1', '2026-10', true, '2026-11-19'), null);
});
