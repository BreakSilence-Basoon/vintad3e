import assert from 'node:assert/strict';
import test from 'node:test';
import { timetableInitialView } from './view.ts';

test('URL chooses the existing timetable slide and malformed choices fall back', () => {
  assert.equal(timetableInitialView('schedule'), 'schedule');
  assert.equal(timetableInitialView('history'), 'history');
  assert.equal(timetableInitialView(undefined), 'history');
  assert.equal(timetableInitialView(['schedule', 'history']), 'history');
  assert.equal(timetableInitialView('unknown'), 'history');
});
