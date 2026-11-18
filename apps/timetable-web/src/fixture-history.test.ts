import assert from 'node:assert/strict';
import test from 'node:test';
import { fixtureHistory } from './fixture-history.ts';

const now = Date.parse('2026-11-17T16:00:00Z');
const filters = { employee: 'all', from: '', range: 'last7' as const, sort: 'desc' as const, to: '' };
test('fixture requires explicit development opt-in', () => {
  assert.equal(fixtureHistory('production', '1', now, filters).length, 0);
  assert.equal(fixtureHistory('development', undefined, now, filters).length, 0);
  assert.equal(fixtureHistory('development', '1', now, filters).length, 7);
  assert.equal(fixtureHistory('development', '1', now, { ...filters, range: 'all' }).length, 21);
});
test('fixture filters use Seoul calendar dates and sort order', () => {
  assert.equal(fixtureHistory('development', '1', now, { ...filters, range: 'today' }).length, 1);
  const custom = fixtureHistory('development', '1', now, { ...filters, range: 'custom', from: '2026-11-17', to: '2026-11-17' });
  assert.equal(custom.length, 1);
  assert.equal(custom[0].startsAt, '2026-11-17T00:00:00.000Z');
  const asc = fixtureHistory('development', '1', now, { ...filters, sort: 'asc' });
  assert.ok(asc[0].startsAt < asc[1].startsAt);
  assert.equal(fixtureHistory('development', '1', now, { ...filters, employee: 'other' }).length, 0);
});
