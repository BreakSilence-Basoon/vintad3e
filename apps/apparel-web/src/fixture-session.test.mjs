import test from 'node:test';
import assert from 'node:assert/strict';
import './admin-return-path.test.mjs';
import './fixture-sign-in-notice.test.mjs';
import { fixtureOrigin, fixtureSession, handleFixtureSession, handleFixtureConfirmationReauth, fixtureResumePath } from './fixture-session.mjs';
const origin = 'http://127.0.0.1:3826';
const env = { NODE_ENV: 'development', VINTAD3E_APPAREL_FIXTURE: '1' };
test('resume accepts internal paths only', () => {
  assert.equal(fixtureResumePath('/documents?tab=all'), '/documents?tab=all');
  for (const path of ['//example.invalid/', '/\\example.invalid/', '/auth/session-resume', 'https://example.invalid/', undefined]) assert.equal(fixtureResumePath(path), '/');
});
function post(action, headers = {}) { return new Request(`${origin}/api/fixture/${action}`, { method: 'POST', headers: { host: '127.0.0.1:3826', origin, ...headers } }); }
function cookie(response) { return response.headers.get('set-cookie').split(';')[0]; }

test('confirmation reauthentication revokes only the local session and keeps its destination', () => {
  const own = cookie(handleFixtureSession(post('login'), 'login', env, 2000));
  const other = cookie(handleFixtureSession(post('login'), 'login', env, 2001));
  const result = handleFixtureConfirmationReauth(post('logout', { cookie: own }), env, 2002);
  assert.equal(result.headers.get('location'), '/sign-in?next=%2Fconfirmations%2Fproposal-01');
  assert.equal(fixtureSession(own, '127.0.0.1:3826', env, 2003), false);
  assert.equal(fixtureSession(other, '127.0.0.1:3826', env, 2003), true);
  assert.equal(handleFixtureConfirmationReauth(post('logout', { cookie: other, origin: 'https://other.invalid' }), env, 2004).status, 403);
  assert.equal(fixtureSession(other, '127.0.0.1:3826', env, 2005), true);
});

test('fixture login and logout rotate and revoke only local synthetic sessions', () => {
  assert.equal(fixtureOrigin(env), origin);
  const first = handleFixtureSession(post('login'), 'login', env, 1000);
  assert.equal(first.status, 303); const firstCookie = cookie(first);
  assert.equal(fixtureSession(firstCookie, '127.0.0.1:3826', env, 1001), true);
  assert.equal(fixtureSession(`${firstCookie}; ${firstCookie}`, '127.0.0.1:3826', env, 1001), false);
  assert.equal(fixtureSession(firstCookie, 'example.invalid', env, 1001), false);
  const second = handleFixtureSession(post('login', { cookie: firstCookie }), 'login', env, 1002);
  const secondCookie = cookie(second);
  assert.notEqual(firstCookie, secondCookie);
  assert.equal(fixtureSession(firstCookie, '127.0.0.1:3826', env, 1003), false);
  assert.equal(fixtureSession(secondCookie, '127.0.0.1:3826', env, 1003), true);
  assert.equal(handleFixtureSession(post('logout', { cookie: secondCookie }), 'logout', env, 1004).status, 303);
  assert.equal(fixtureSession(secondCookie, '127.0.0.1:3826', env, 1005), false);
});

test('fixture login only returns to known local paths', () => {
  assert.equal(handleFixtureSession(post('login'), 'login', env, 1000, '/confirmations/proposal-01').headers.get('location'), '/confirmations/proposal-01');
  assert.equal(handleFixtureSession(post('login'), 'login', env, 1000, '/admin/products').headers.get('location'), '/admin/products');
  assert.equal(handleFixtureSession(post('login'), 'login', env, 1000, '/admin/sales?range=all').headers.get('location'), '/admin/sales?range=all');
  for (const next of ['//example.invalid/', '/confirmations/other', 'https://example.invalid/']) assert.equal(handleFixtureSession(post('login'), 'login', env, 1000, next).headers.get('location'), '/');
});

test('fixture cannot activate in production or accept nonlocal and cross-origin requests', () => {
  const production = { ...env, NODE_ENV: 'production' };
  assert.equal(fixtureOrigin(production), null);
  assert.equal(handleFixtureSession(post('login'), 'login', production).status, 404);
  assert.equal(handleFixtureSession(post('login', { origin: 'https://other.invalid' }), 'login', env).status, 403);
  assert.equal(handleFixtureSession(post('login', { host: 'example.invalid' }), 'login', env).status, 403);
  const normalized = new Request('http://localhost:3826/api/fixture/login', { method: 'POST', headers: { host: '127.0.0.1:3826', origin } });
  assert.equal(handleFixtureSession(normalized, 'login', env).status, 303);
  assert.equal(fixtureOrigin({ ...env, VINTAD3E_APPAREL_FIXTURE_ORIGIN: 'http://example.invalid:3826' }), null);
  const response = handleFixtureSession(post('login'), 'login', env, 1000);
  assert.equal(fixtureSession(cookie(response), '127.0.0.1:3826', env, 1000 + 30 * 60 * 1000), false);
});
