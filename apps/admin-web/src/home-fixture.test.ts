import assert from 'node:assert/strict';
import test from 'node:test';
import { getFixtureHome } from './home-fixture.ts';

test('synthetic home status and visits require explicit development opt-in', () => {
  const now = new Date('2026-11-18T00:00:00.000Z');
  assert.equal(getFixtureHome('production', '1', now), null);
  assert.equal(getFixtureHome('development', undefined, now), null);
  assert.equal(getFixtureHome('development', '1', new Date('invalid')), null);
  const rows = getFixtureHome('development', '1', now)!;
  assert.equal(rows.find(row => row.id === 'portal')?.visit?.name, '직원 01');
  assert.equal(rows.find(row => row.id === 'partners')?.visit?.name, '외부 구성원 01');
  assert.equal(rows.find(row => row.id === 'creative')?.visit, null);
  assert.ok(rows.every(row => row.status === '정상'));
});
