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

import { fixtureAdminSchedulePath } from './fixture-admin-route.ts';
test('admin schedule legacy route is available only to explicitly enabled local fixtures', () => {
  assert.equal(fixtureAdminSchedulePath('development','1','1','2026-02'), '/?view=schedule&month=2026-02');
  assert.equal(fixtureAdminSchedulePath('development','1','1',['2026-02','2026-03']), '/?view=schedule&month=2026-02');
  for (const [env,fixture,admin] of [['production','1','1'],['development','1',''],['development','','1']] as const) assert.equal(fixtureAdminSchedulePath(env,fixture,admin,'2026-02'), null);
});
