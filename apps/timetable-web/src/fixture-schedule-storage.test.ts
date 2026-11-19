import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtureScheduleOverlaps } from './fixture-schedule-overlap.ts';
import { fixtureScheduleEntries } from './fixture-schedule-entries.ts';
import { readScheduleOverrides, scheduleInputInstant, validScheduleOverride, writeScheduleOverride } from './fixture-schedule-storage.ts';
function memory() { const data = new Map<string, string>(); return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } }; }
const id = '2026-02-08-employee-1';
const value = { startInput: '2026-02-08T09:00', endInput: '2026-02-08T18:00', note: '정정', attendance: null };
test('schedule changes are confined to valid synthetic ids and survive a read', () => {
  const store = memory();
  assert.deepEqual(readScheduleOverrides(store), {});
  assert.deepEqual(writeScheduleOverride(store, id, value), { [id]: value });
  assert.deepEqual(readScheduleOverrides(store), { [id]: value });
  assert.equal(writeScheduleOverride(store, 'other-person', value), null);
  assert.equal(writeScheduleOverride(store, id, { ...value, endInput: value.startInput }), null);
  assert.equal(writeScheduleOverride(store, id, { ...value, note: '  ' }), null);
  assert.deepEqual(writeScheduleOverride(store, id, null), { [id]: null });
});
test('schedule storage rejects malformed state and preserves timestamp semantics', () => {
  const store = memory();
  store.setItem('vintad3e:timetable-schedule', '{"unknown":null}');
  assert.equal(readScheduleOverrides(store), null);
  assert.equal(writeScheduleOverride(store, id, value), null);
  assert.equal(scheduleInputInstant('2026-02-30T09:00'), null);
  assert.equal(scheduleInputInstant('2026-02-08T09:00'), Date.parse('2026-02-08T00:00:00.000Z'));
  assert.equal(validScheduleOverride({ ...value, attendance: { startsAt: '2026-02-08T01:00:00.000Z', endsAt: '2026-02-08T00:00:00.000Z' } }), false);
  assert.equal(validScheduleOverride({ ...value, attendance: { startsAt: '2026-02-08T00:00:00.000Z', endsAt: null } }), true);
  const unavailable = { getItem: () => { throw new Error('unavailable'); }, setItem: () => { throw new Error('unavailable'); } };
  assert.equal(readScheduleOverrides(unavailable), null);
  assert.equal(writeScheduleOverride(unavailable, id, value), null);
});

test('unknown schedule and attendance fields cannot replace identity or be discarded by a write', () => {
  const store = memory();
  const slot = 'vintad3e:timetable-schedule';
  for (const record of [
    { ...value, employee: { id: 'other' } },
    { ...value, date: '2026-03-01' },
    { ...value, attendance: { startsAt: '2026-02-08T00:00:00.000Z', endsAt: null, extra: 'preserve' } },
  ]) {
    const raw = JSON.stringify({ [id]: record });
    store.setItem(slot, raw);
    assert.equal(readScheduleOverrides(store), null);
    assert.equal(writeScheduleOverride(store, id, value), null);
    assert.equal(store.getItem(slot), raw);
  }
});

test('moved and deleted synthetic schedules appear on the matching visible days only', () => {
  const moved = { ...value, startInput: '2026-03-02T09:00', endInput: '2026-03-02T18:00' };
  const changes = { [id]: moved, '2026-02-18-employee-2': null };
  assert.deepEqual(fixtureScheduleEntries('2026-02', changes, ['2026-02-08', '2026-02-18']).map(row => row.id), []);
  assert.deepEqual(fixtureScheduleEntries('2026-03', changes, ['2026-03-02', '2026-03-08', '2026-03-18']).map(row => row.date), ['2026-03-08', '2026-03-18', '2026-03-02']);
});

test('scheduled edits cannot overlap another synthetic shift for the same employee', () => {
  assert.equal(fixtureScheduleOverlaps(id, '2026-03-08T10:00', '2026-03-08T11:00', {}), true);
  assert.equal(fixtureScheduleOverlaps(id, '2026-03-08T18:00', '2026-03-08T19:00', {}), false);
  assert.equal(fixtureScheduleOverlaps(id, '2026-03-08T10:00', '2026-03-08T11:00', { '2026-03-08-employee-1': null }), false);
  assert.equal(fixtureScheduleOverlaps(id, '2026-03-09T10:00', '2026-03-09T11:00', { '2026-01-08-employee-1': { ...value, startInput: '2026-03-09T09:00', endInput: '2026-03-09T18:00' } }), true);
});
