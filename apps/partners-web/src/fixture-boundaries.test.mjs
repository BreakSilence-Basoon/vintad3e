import test from 'node:test';
import assert from 'node:assert/strict';
import { getPartnerFixture, getDjFixture } from './partner-fixture.ts';
import { monthDays, monthEvents, parsePartnerEvents } from './partner-schedule.ts';
import { periodRows, readCollaboration } from './fixture-collaboration.mjs';
import { isDateInput, parsePercent, payoutAmount, toBusinessDayBounds } from './fixture-showroom-settlement.ts';
import { guestOrigin, guestSession, guestSessionAction } from './guest-session.mjs';
import { fixtureSignInNotice } from './fixture-sign-in-notice.mjs';

test('partner data is empty for disabled fixtures and invalid calendar dates', () => {
  const valid = getPartnerFixture('development', '1', '2028-02-29');
  assert.equal(valid.schedule.events.length, 3);
  assert.equal(valid.ledger.rows.length, 2);
  for (const [mode, enabled, day] of [['production','1','2028-02-29'], ['development','','2028-02-29'], ['development','1',''], ['development','1','2026-02-29']]) {
    assert.deepEqual(getPartnerFixture(mode, enabled, day), { schedule: { kind: 'ready', events: [] }, ledger: { kind: 'ready', rows: [] } });
    assert.deepEqual(getDjFixture(mode, enabled, day), { kind: 'ready', rows: [] });
  }
});

test('calendar parsing handles empty data, duplicates and impossible timestamps', () => {
  const row = { id: 'example', area: 'dj', title: '예시', startsAt: '2026-01-02T00:00:00.000Z', endsAt: '2026-01-02T01:00:00.000Z' };
  assert.deepEqual(parsePartnerEvents([]), []);
  assert.equal(parsePartnerEvents([row])?.length, 1);
  for (const input of [null, {}, [row, row], [{ ...row, startsAt: '2026-02-30T00:00:00.000Z' }], [{ ...row, endsAt: row.startsAt }], [{ ...row, area: 'unknown' }]]) assert.equal(parsePartnerEvents(input), null);
  assert.deepEqual(monthEvents([], '2026-01'), []);
  assert.deepEqual(monthDays(''), []);
});

test('collaboration ranges preserve empty, inclusive and invalid date cases', () => {
  assert.equal(periodRows('2026-01-02', '2026-01-02').length, 1);
  assert.deepEqual(periodRows('2027-01-01', ''), []);
  for (const from of ['2026-02-30', 'not-a-date', ['2026-01-01']]) assert.equal(periodRows(from, ''), null);
  assert.equal(readCollaboration('2026-03-01', '2026-01-01', {}).kind, 'invalid');
});

test('settlement inputs respect valid calendar days and percent limits', () => {
  assert.equal(isDateInput('2028-02-29'), true);
  for (const value of ['', '2026-02-29', '2026-13-01']) assert.equal(isDateInput(value), false);
  assert.deepEqual(toBusinessDayBounds({ from: '2026-01-01', to: '2026-01-01' }), { from: '2026-01-01T00:00:00+09:00', to: '2026-01-02T00:00:00+09:00' });
  assert.equal(toBusinessDayBounds({ from: '2026-01-02', to: '2026-01-01' }), null);
  assert.equal(parsePercent(''), null); assert.equal(parsePercent('-1'), null); assert.equal(parsePercent('101'), null);
  assert.equal(payoutAmount(1000, 10), 100);
});

test('guest sessions remain scoped to the selected synthetic partner', () => {
  const env = { NODE_ENV: 'development', VINTAD3E_PARTNERS_FIXTURE: '1' }, origin = 'http://127.0.0.1:3828', host = '127.0.0.1:3828', now = 1_000_000;
  const request = new Request(`${origin}/login`, { method: 'POST', headers: { host, origin } });
  const response = guestSessionAction(request, env, 'partner-01', 'login', now), cookie = response.headers.get('set-cookie').split(';')[0];
  assert.equal(guestSession(cookie, host, env, 'partner-01', now + 1), true);
  assert.equal(guestSession(cookie, host, env, 'partner-02', now + 1), false);
  assert.equal(guestSession(`${cookie}; ${cookie}`, host, env, 'partner-01', now + 1), false);
  assert.equal(guestSession(cookie, host, env, 'partner-01', now + 30 * 60_000), false);
  assert.equal(guestOrigin({ ...env, VINTAD3E_PARTNERS_FIXTURE_ORIGIN: 'http://localhost:3828' }), null);
  assert.equal(guestSessionAction(request, env, 'unknown', 'login', now).status, 404);
});

test('sign-in notices handle missing and prototype-like input', () => {
  assert.equal(fixtureSignInNotice(''), null);
  assert.equal(fixtureSignInNotice(null), null);
  assert.ok(fixtureSignInNotice('AccessDenied')?.title);
  assert.deepEqual(fixtureSignInNotice('__proto__'), fixtureSignInNotice('unknown'));
});
