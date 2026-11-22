import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtureAppId, fixtureAppMembers, fixtureMenuPermissions } from './fixture-app-permissions.ts';
import { fixtureGrantDisplay, fixtureMemberPage, getFixtureDirectory, getFixtureMembers } from './members-fixture.ts';
import { getFixtureHome } from './home-fixture.ts';
import { fixtureCoverNext, fixtureNext, fixtureOrigin } from './fixture-session.mjs';
import { fixtureSignInNotice } from './fixture-sign-in-notice.mjs';

test('empty member pages are stable and invalid cursors fail closed', () => {
  assert.deepEqual(fixtureMemberPage([], 'employee', undefined), { rows: [], previous: false, next: null });
  for (const cursor of ['', 'employee:0', 'partner:50', ['employee:50']]) assert.equal(fixtureMemberPage([], 'employee', cursor), null);
  const directory = getFixtureDirectory('development', '1');
  assert.equal(fixtureMemberPage(directory, 'employee', undefined).rows.length, 50);
});

test('grant timestamps handle valid boundaries, empty strings and invalid times', () => {
  const grant = { status: 'ACTIVE', validFrom: '2026-01-01T00:00:00.000Z', validUntil: '2026-01-02T00:00:00.000Z' };
  const start = Date.parse(grant.validFrom), end = Date.parse(grant.validUntil);
  assert.equal(fixtureGrantDisplay(grant, start - 1).label, '시작 전');
  assert.equal(fixtureGrantDisplay(grant, start).label, '사용 중');
  assert.equal(fixtureGrantDisplay(grant, end).label, '기간 만료');
  assert.equal(fixtureGrantDisplay({ ...grant, validFrom: '' }, start).label, '확인 필요');
  assert.equal(fixtureGrantDisplay({ ...grant, validUntil: '' }, start).label, '확인 필요');
  assert.equal(fixtureGrantDisplay(grant, NaN).label, '확인 필요');
});

test('the app selector normalizes unknown and prototype-like input before menu lookup', () => {
  for (const value of [undefined, '', 'missing', '__proto__', 'constructor']) {
    const selected = fixtureAppId(value);
    assert.equal(selected, 'portal');
    assert.equal(fixtureMenuPermissions('development', '1', selected)[0].menu, '앱 타일');
  }
  assert.deepEqual(fixtureMenuPermissions('development', '1', 'missing'), []);
});

test('app access returns no members for missing, disabled and invalid time cases', () => {
  const now = Date.parse('2026-11-18T00:00:00Z');
  assert.ok(fixtureAppMembers('development', '1', 'portal', now).length);
  for (const [mode, enabled, app, time] of [['production','1','portal',now], ['development','','portal',now], ['development','1','missing',now], ['development','1','portal',NaN]]) assert.deepEqual(fixtureAppMembers(mode, enabled, app, time), []);
});

test('home fixture rejects an invalid date without retaining changes', () => {
  const now = new Date('2026-11-18T00:00:00Z');
  const rows = getFixtureHome('development', '1', now);
  assert.ok(rows?.length); rows[0].name = 'changed';
  assert.notEqual(getFixtureHome('development', '1', now)[0].name, 'changed');
  assert.equal(getFixtureHome('development', '1', new Date('invalid')), null);
  assert.deepEqual(getFixtureMembers('development', ''), []);
});

test('return URLs, origins and notice codes reject malformed values', () => {
  const env = { NODE_ENV: 'development', VINTAD3E_ADMIN_FIXTURE: '1' };
  assert.equal(fixtureNext('/members'), '/members');
  assert.equal(fixtureCoverNext('/members?type=partner'), '/members?type=partner');
  for (const value of ['', '//example.invalid', '/members\\evil', '/missing']) assert.equal(fixtureCoverNext(value), '/');
  assert.equal(fixtureOrigin(env), 'http://127.0.0.1:3832');
  assert.equal(fixtureOrigin({ ...env, VINTAD3E_ADMIN_FIXTURE_ORIGIN: 'http://localhost:3832' }), null);
  assert.equal(fixtureSignInNotice(''), null);
  assert.deepEqual(fixtureSignInNotice('__proto__'), fixtureSignInNotice('unknown'));
});
