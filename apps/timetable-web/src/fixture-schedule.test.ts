import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtureSchedule } from './fixture-schedule.ts';

test('schedule fixture is opt-in and restricted to development', () => {
  assert.deepEqual(fixtureSchedule('production', '1', '2026-02'), []);
  assert.deepEqual(fixtureSchedule('development', undefined, '2026-02'), []);
  assert.deepEqual(fixtureSchedule('development', '1', '2026-13'), []);
  assert.deepEqual(fixtureSchedule('development', '1', '2026-02'), [{ date: '2026-02-08' }, { date: '2026-02-18' }]);
});
