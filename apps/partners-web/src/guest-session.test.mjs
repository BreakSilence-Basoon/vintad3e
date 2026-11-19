import test from 'node:test';
import assert from 'node:assert/strict';
import { guestOrigin, guestSession, guestSessionAction } from './guest-session.mjs';
const origin = 'http://127.0.0.1:3828';
const env = { NODE_ENV: 'development', VINTAD3E_PARTNERS_FIXTURE: '1' };
function post(action, headers = {}) { return new Request(`${origin}/session/${action}`, { method: 'POST', headers: { host: '127.0.0.1:3828', origin, ...headers } }); }
test('guest fixture session stays scoped to its synthetic partner and expires', () => {
  const response = guestSessionAction(post('login'), env, 'partner-01', 'login', 1000);
  assert.equal(response.status, 303);
  const cookie = response.headers.get('set-cookie').split(';')[0];
  assert.equal(guestSession(cookie, '127.0.0.1:3828', env, 'partner-01', 1001), true);
  assert.equal(guestSession(cookie, '127.0.0.1:3828', env, 'partner-02', 1001), false);
  assert.equal(guestSession(cookie, '127.0.0.1:3828', env, 'partner-01', 1801000), false);
  const logout = guestSessionAction(post('logout', { cookie }), env, 'partner-01', 'logout', 1002);
  assert.equal(logout.status, 303);
  assert.equal(guestSession(cookie, '127.0.0.1:3828', env, 'partner-01', 1003), false);
});
test('guest fixture rejects production and cross-origin access', () => {
  assert.equal(guestOrigin({ ...env, NODE_ENV: 'production' }), null);
  assert.equal(guestSessionAction(post('login'), { ...env, NODE_ENV: 'production' }, 'partner-01', 'login').status, 404);
  assert.equal(guestSessionAction(post('login', { origin: 'https://example.invalid' }), env, 'partner-01', 'login').status, 403);
  assert.equal(guestSessionAction(post('login'), env, 'unknown', 'login').status, 404);
});
