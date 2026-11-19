import assert from 'node:assert/strict';
import test from 'node:test';
import { fixtureHistory } from './fixture-history.ts';
import { fixtureEmployeeId, fixtureHistoryDay, historyWithinShiftWindow, parseHistoryEdits, selectHistory } from './fixture-history-admin.ts';

const now = Date.parse('2026-11-18T09:00:00.000Z');
const filters = { employee: 'all', from: '', to: '', range: 'all' as const, sort: 'desc' as const };
const base = fixtureHistory('development', '1', now, filters);
const day = fixtureHistoryDay(now);
test('admin fixture accepts only bounded valid edits from the current Seoul day', () => {
  const valid = { startsAt: '2026-11-16T02:00:00.000Z', endsAt: '2026-11-16T09:00:00.000Z', note: '수정 사유' };
  const raw = JSON.stringify({ day, edits: { '0': valid, '1': null, '100': valid, '2': { ...valid, endsAt: valid.startsAt }, '3': { ...valid, note: '' } } });
  assert.deepEqual(parseHistoryEdits(raw, day), { '0': valid, '1': null });
  assert.deepEqual(parseHistoryEdits(raw, day + 1), {});
  assert.deepEqual(parseHistoryEdits('x'.repeat(32001), day), {});
  assert.deepEqual(parseHistoryEdits('{', day), {});
});
test('edits and deletions are applied before date, employee and sort filtering', () => {
  const edits = { '0': { startsAt: '2026-11-15T00:00:00.000Z', endsAt: '2026-11-15T08:00:00.000Z', note: '변경' }, '1': null };
  const rows = selectHistory(base, edits, filters, now);
  assert.equal(rows.length, 20);
  assert.equal(rows.find(row => row.id === '0')?.note, '변경');
  assert.equal(rows.some(row => row.id === '1'), false);
  assert.equal(selectHistory(base, edits, { ...filters, range: 'today' }, now).length, 0);
  assert.deepEqual(selectHistory(base, edits, { ...filters, employee: fixtureEmployeeId }, now), rows);
  assert.deepEqual(selectHistory(base, edits, { ...filters, employee: 'unknown' }, now), []);
  const asc = selectHistory(base, edits, { ...filters, sort: 'asc' }, now);
  assert.ok(asc[0].startsAt <= asc[1].startsAt);
});

test('synthetic attendance uses the original scheduled shift window', () => {
  const start = '2026-11-17T00:00:00.000Z';
  assert.equal(historyWithinShiftWindow(start, '2026-11-16T18:00:00.000Z', '2026-11-17T20:00:00.000Z'), true);
  assert.equal(historyWithinShiftWindow(start, '2026-11-16T17:59:59.000Z', null), false);
  assert.equal(historyWithinShiftWindow(start, start, '2026-11-17T20:00:01.000Z'), false);
});
