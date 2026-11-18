import test from 'node:test';
import assert from 'node:assert/strict';
import { filterFixtureSchedule, fixtureSchedule } from './fixture-schedule.ts';

test('schedule fixture is opt-in and restricted to development', () => {
  assert.deepEqual(fixtureSchedule('production', '1', '2026-02'), []);
  assert.deepEqual(fixtureSchedule('development', undefined, '2026-02'), []);
  assert.deepEqual(fixtureSchedule('development', '1', '2026-13'), []);
  assert.deepEqual(fixtureSchedule('development', '1', '2026-02').map(item => item.date), ['2026-02-08', '2026-02-18']);
});

test('schedule filters match both employee and location', () => {
  const shifts = fixtureSchedule('development', '1', '2026-02');
  assert.deepEqual(filterFixtureSchedule(shifts, '', 'location-1').map(item => item.date), ['2026-02-08']);
  assert.deepEqual(filterFixtureSchedule(shifts, 'employee-2', 'location-1'), []);
  assert.deepEqual(filterFixtureSchedule(shifts, 'employee-2', 'location-2').map(item => item.date), ['2026-02-18']);
});
