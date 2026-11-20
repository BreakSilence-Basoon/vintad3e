import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtureCoverNext, fixtureOrigin, fixtureSession, handleFixtureSession, fixtureResumePath } from './fixture-session.mjs';
const origin = 'http://127.0.0.1:3824';
const env = { NODE_ENV: 'development', VINTAD3E_TIMETABLE_FIXTURE: '1' };
test('resume accepts internal paths only', () => {
  assert.equal(fixtureResumePath('/documents?tab=all'), '/documents?tab=all');
  for (const path of ['//example.invalid/', '/\\example.invalid/', '/auth/session-resume', 'https://example.invalid/', undefined]) assert.equal(fixtureResumePath(path), '/');
});
test('cover returns to known screens with their selected month', () => {
  assert.equal(fixtureCoverNext('/?view=schedule&month=2026-05'), '/?view=schedule&month=2026-05');
  for (const path of ['//example.invalid/', '/\\example.invalid/', 'https://example.invalid/', '/sign-in', '/unknown']) assert.equal(fixtureCoverNext(path), '/');
});
function post(action, headers = {}) { return new Request(`${origin}/api/fixture/${action}`, { method: 'POST', headers: { host: '127.0.0.1:3824', origin, ...headers } }); }
function cookie(response) { return response.headers.get('set-cookie').split(';')[0]; }

test('fixture login and logout rotate and revoke only local synthetic sessions', () => {
  assert.equal(fixtureOrigin(env), origin);
  const first = handleFixtureSession(post('login'), 'login', env, 1000);
  assert.equal(first.status, 303); const firstCookie = cookie(first);
  assert.equal(fixtureSession(firstCookie, '127.0.0.1:3824', env, 1001), true);
  assert.equal(fixtureSession(`${firstCookie}; ${firstCookie}`, '127.0.0.1:3824', env, 1001), false);
  assert.equal(fixtureSession(firstCookie, 'example.invalid', env, 1001), false);
  const second = handleFixtureSession(post('login', { cookie: firstCookie }), 'login', env, 1002);
  const secondCookie = cookie(second);
  assert.notEqual(firstCookie, secondCookie);
  assert.equal(fixtureSession(firstCookie, '127.0.0.1:3824', env, 1003), false);
  assert.equal(fixtureSession(secondCookie, '127.0.0.1:3824', env, 1003), true);
  assert.equal(handleFixtureSession(post('logout', { cookie: secondCookie }), 'logout', env, 1004).status, 303);
  assert.equal(fixtureSession(secondCookie, '127.0.0.1:3824', env, 1005), false);
});

test('fixture login only returns to known local paths', () => {
  assert.equal(handleFixtureSession(post('login'), 'login', env, 1000, '/confirmations/proposal-01').headers.get('location'), '/confirmations/proposal-01');
  assert.equal(handleFixtureSession(post('login'), 'login', env, 1000, '/admin/kiosks').headers.get('location'), '/admin/kiosks');
  assert.equal(handleFixtureSession(post('login'), 'login', env, 1000, '/admin/schedule?month=2026-05').headers.get('location'), '/admin/schedule?month=2026-05');
  for (const next of ['/?view=history', '/?view=schedule']) assert.equal(handleFixtureSession(post('login'), 'login', env, 1000, next).headers.get('location'), next);
  for (const next of ['//example.invalid/', '/confirmations/other', 'https://example.invalid/', '/admin/schedule?month=2026-13', '/admin/schedule?month=2026-05&next=//example.invalid']) assert.equal(handleFixtureSession(post('login'), 'login', env, 1000, next).headers.get('location'), '/');
});

test('fixture cannot activate in production or accept nonlocal and cross-origin requests', () => {
  const production = { ...env, NODE_ENV: 'production' };
  assert.equal(fixtureOrigin(production), null);
  assert.equal(handleFixtureSession(post('login'), 'login', production).status, 404);
  assert.equal(handleFixtureSession(post('login', { origin: 'https://other.invalid' }), 'login', env).status, 403);
  assert.equal(handleFixtureSession(post('login', { host: 'example.invalid' }), 'login', env).status, 403);
  const normalized = new Request('http://localhost:3824/api/fixture/login', { method: 'POST', headers: { host: '127.0.0.1:3824', origin } });
  assert.equal(handleFixtureSession(normalized, 'login', env).status, 303);
  assert.equal(fixtureOrigin({ ...env, VINTAD3E_TIMETABLE_FIXTURE_ORIGIN: 'http://example.invalid:3824' }), null);
  const response = handleFixtureSession(post('login'), 'login', env, 1000);
  assert.equal(fixtureSession(cookie(response), '127.0.0.1:3824', env, 1000 + 30 * 60 * 1000), false);
});
