import assert from 'node:assert/strict';
import test from 'node:test';
import { readFixturePayouts, writeFixturePayout } from './settlement-fixture-storage.ts';

test('unknown fields and impossible dates cannot be discarded by a synthetic payout write', () => {
  let raw: string | null = null;
  const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } };
  for (const entry of [{ paid: true, checkedDate: '2026-11-19', extra: 'preserve' }, { paid: true, checkedDate: '2026-02-30' }]) {
    const value = JSON.stringify({ '2026-10': entry }); raw = value;
    assert.equal(readFixturePayouts(storage, 'supporter-1'), null);
    assert.equal(writeFixturePayout(storage, 'supporter-1', '2026-11', true, '2026-11-19'), null);
    assert.equal(raw, value);
  }
  raw = null;
  assert.equal(writeFixturePayout(storage, 'supporter-1', '2026-10', true, '2026-02-29'), null);
  assert.deepEqual(writeFixturePayout(storage, 'supporter-1', '2026-10', true, '2028-02-29'), { '2026-10': { paid: true, checkedDate: '2028-02-29' } });
});
