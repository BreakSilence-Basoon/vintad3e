import test from 'node:test';
import assert from 'node:assert/strict';
import { timetableInitialView } from './view.ts';
import { emptyCalendarCells } from './calendar-cells.ts';
import { parseHistoryFilters, parseHistoryPage } from './history-filters.ts';
import { fixtureSchedule, filterFixtureSchedule } from './fixture-schedule.ts';
import { readScheduleOverrides, writeScheduleOverride } from './fixture-schedule-storage.ts';
import { cameraMessage } from './camera-message.ts';
import { fixtureKioskOrigin, handleFixtureKiosk } from './fixture-kiosk.mjs';

function memory() { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } }; }

test('view and calendar handle supported, empty and malformed selections', () => {
  assert.equal(timetableInitialView('schedule'), 'schedule');
  for (const value of [undefined, '', 'unknown', []]) assert.equal(timetableInitialView(value), 'history');
  assert.ok(emptyCalendarCells('2028-02').some(cell => cell.dateKey === '2028-02-29' && !cell.outside));
  for (const month of ['', '2026-13', 'bad']) assert.throws(() => emptyCalendarCells(month));
});

test('history filters and pagination reject malformed selections', () => {
  const valid = parseHistoryFilters({ range: 'custom', from: '2026-01-01', to: '2026-01-02', sort: 'asc' });
  assert.equal(valid.range, 'custom'); assert.equal(valid.sort, 'asc');
  assert.equal(parseHistoryFilters({ range: 'custom', from: 'bad', to: '' }).range, 'all');
  assert.equal(parseHistoryFilters({ range: 'custom', from: '2026-02-01', to: '2026-01-01' }).range, 'all');
  for (const page of [undefined, '', '-1', 'invalid']) assert.equal(parseHistoryPage(page), 1);
  assert.equal(parseHistoryPage('2'), 2); assert.equal(parseHistoryPage('9999'), 1000);
});

test('schedule fixtures remain isolated and reject disabled or invalid months', () => {
  const shifts = fixtureSchedule('development', '1', '2026-02');
  assert.equal(shifts.length, 2);
  assert.equal(filterFixtureSchedule(shifts, 'employee-1', '').length, 1);
  assert.deepEqual(filterFixtureSchedule([], 'employee-1', ''), []);
  for (const [mode, enabled, month] of [['production','1','2026-02'], ['development','','2026-02'], ['development','1',''], ['development','1','2026-13']]) assert.deepEqual(fixtureSchedule(mode, enabled, month), []);
});

test('schedule storage rejects invalid and corrupt records without overwriting', () => {
  const store = memory(), slot = 'vintad3e:timetable-schedule';
  assert.deepEqual(readScheduleOverrides(store), {});
  assert.equal(writeScheduleOverride(store, 'invalid', null), null);
  store.setItem(slot, '{bad');
  assert.equal(readScheduleOverrides(store), null);
  assert.equal(writeScheduleOverride(store, '2026-01-08-employee-1', null), null);
  assert.equal(store.getItem(slot), '{bad');
});

test('camera messages do not expose unexpected error content', () => {
  assert.match(cameraMessage(new DOMException('example', 'NotAllowedError'), true), /권한/);
  assert.match(cameraMessage(null, false), /보안 연결/);
  assert.doesNotMatch(cameraMessage(new Error('private-example'), true), /private-example/);
});

test('synthetic kiosk rejects empty, malformed and oversized declared requests', async () => {
  const origin = 'http://127.0.0.1:3824', host = '127.0.0.1:3824';
  const env = { NODE_ENV: 'development', VINTAD3E_TIMETABLE_FIXTURE: '1', VINTAD3E_TIMETABLE_FIXTURE_ADMIN: '1' };
  assert.equal(fixtureKioskOrigin(env), origin);
  assert.equal(fixtureKioskOrigin({ ...env, VINTAD3E_TIMETABLE_FIXTURE_ORIGIN: 'http://localhost:3824' }), null);
  const request = (body, extra = {}) => new Request(`${origin}/kiosk`, { method: 'POST', headers: { host, origin, 'content-type': 'application/json', ...extra }, body });
  for (const body of ['', '{', '{}', '[]']) assert.equal((await handleFixtureKiosk(request(body), env, 'register')).status, 400);
  assert.equal((await handleFixtureKiosk(request('{}', { 'content-length': '4097' }), env, 'register')).status, 413);
  assert.equal((await handleFixtureKiosk(request('{}', { origin: 'http://example.invalid' }), env, 'register')).status, 403);
});
