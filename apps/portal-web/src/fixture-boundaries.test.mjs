import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtureAppIds, fixturePortalLinks } from './fixture-links.mjs';
import { fixtureSignInNotice } from './fixture-sign-in-notice.mjs';
import { fixtureNext, fixtureOrigin, fixtureResumePath, fixtureSession, handleFixtureSession } from './fixture-session.mjs';
import { confirmationAvailable, nextConfirmationState } from './fixture-confirmation.mjs';
import { handleFixtureConfirmation } from './fixture-confirmation-store.mjs';

const origin = 'http://127.0.0.1:3825';
const host = '127.0.0.1:3825';
const env = { NODE_ENV: 'development', VINTAD3E_PORTAL_FIXTURE: '1' };
const request = (path, options = {}) => new Request(`${origin}${path}`, options);
const localHeaders = { host, origin };

test('fixture link selection ignores invalid grants and does not retain caller changes', () => {
  const settings = { nodeEnv: 'development', enabled: '1', grants: ['library', null, 4, 'library', '__proto__', 'admin'] };
  const first = fixturePortalLinks(settings);
  assert.deepEqual(Object.keys(first), ['library', 'admin']);
  first.library = 'changed';
  assert.equal(fixturePortalLinks(settings).library, 'http://127.0.0.1:3829/');
  assert.deepEqual(fixturePortalLinks({ ...settings, grants: [] }), {});
  assert.deepEqual(fixturePortalLinks({ ...settings, grants: 'library' }), {});
  assert.equal(fixtureAppIds.length, 8);
});

test('sign-in notices handle empty, wrong types and unknown categories', () => {
  for (const value of [null, undefined, '', 0, [], {}]) assert.equal(fixtureSignInNotice(value), null);
  const unknown = fixtureSignInNotice('unknown-error');
  assert.equal(unknown.title, '로그인을 완료하지 못했습니다.');
  assert.equal(unknown.message, '로그인을 완료하지 못했습니다. 다시 시도해주세요.');
  assert.deepEqual(fixtureSignInNotice('constructor'), unknown);
});

test('fixture destinations and configured origins reject unsafe or malformed values', () => {
  assert.equal(fixtureNext('/about'), '/about');
  assert.equal(fixtureNext(''), '/');
  assert.equal(fixtureNext('/about?extra=1'), '/');
  assert.equal(fixtureResumePath('/about?tab=one#section'), '/about?tab=one#section');
  for (const value of ['', null, '/auth/session-resume?next=%2F', '/a\nother', '/\\bad', '//example.invalid']) {
    assert.equal(fixtureResumePath(value), '/');
  }
  assert.equal(fixtureOrigin({ ...env, VINTAD3E_PORTAL_FIXTURE_ORIGIN: 'http://127.0.0.1:4000' }), 'http://127.0.0.1:4000');
  for (const value of ['https://127.0.0.1:3825', 'http://localhost:3825', 'http://127.0.0.1:3825/', 'http://127.0.0.1:3825/path', 'not a URL']) {
    assert.equal(fixtureOrigin({ ...env, VINTAD3E_PORTAL_FIXTURE_ORIGIN: value }), null);
  }
  assert.equal(fixtureOrigin({ ...env, VINTAD3E_PORTAL_FIXTURE: '0' }), null);
});

test('fixture sessions reject invalid requests and expire at the documented boundary', () => {
  const get = request('/api/fixture/login', { headers: localHeaders });
  assert.equal(handleFixtureSession(get, 'login', env, 20000).status, 404);
  const post = request('/api/fixture/login', { method: 'POST', headers: localHeaders });
  assert.equal(handleFixtureSession(post, 'other', env, 20000).status, 404);
  assert.equal(handleFixtureSession(post, 'login', { ...env, NODE_ENV: 'production' }, 20000).status, 404);
  const login = handleFixtureSession(post, 'login', env, 20000, '/about');
  const setCookie = login.headers.get('set-cookie');
  const cookie = setCookie.split(';')[0];
  assert.equal(login.headers.get('location'), '/about');
  assert.match(setCookie, /HttpOnly; SameSite=Strict; Max-Age=1800/);
  assert.equal(fixtureSession(cookie, host, env, 20000 + 30 * 60000 - 1), true);
  assert.equal(fixtureSession(cookie, host, env, 20000 + 30 * 60000), false);
  assert.equal(fixtureSession('vintad3e-portal-fixture=bad', host, env, 20001), false);
});

test('confirmation transitions reject out-of-order actions and preserve approved state', () => {
  assert.equal(nextConfirmationState('loaded', 'load'), 'loaded');
  assert.equal(nextConfirmationState('reviewed', 'load'), 'loaded');
  assert.equal(nextConfirmationState('approved', 'confirm'), 'approved');
  assert.equal(nextConfirmationState('missing', 'load'), 'missing');
  assert.equal(nextConfirmationState('loaded', 'unknown'), 'loaded');
  assert.equal(confirmationAvailable(1, 2), true);
  assert.equal(confirmationAvailable(2, 2), false);
  assert.equal(confirmationAvailable(1, undefined), false);
});

test('confirmation rejects empty and malformed payloads without a local server', async () => {
  const now = 2000000;
  const login = handleFixtureSession(request('/api/fixture/login', { method: 'POST', headers: localHeaders }), 'login', env, now);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const post = (body, headers = {}) => request('/api/fixture/confirmation', {
    method: 'POST', headers: { ...localHeaders, cookie, 'content-type': 'application/json', ...headers }, ...(body === undefined ? {} : { body }),
  });
  assert.equal((await handleFixtureConfirmation(request('/api/fixture/confirmation', { headers: { host } }), env, now + 1)).status, 401);
  assert.equal((await handleFixtureConfirmation(post(undefined), env, now + 1)).status, 400);
  assert.equal((await handleFixtureConfirmation(post('{'), env, now + 1)).status, 400);
  assert.equal((await handleFixtureConfirmation(post('{}'), env, now + 1)).status, 400);
  assert.equal((await handleFixtureConfirmation(post('{"action":"load","extra":1}'), env, now + 1)).status, 400);
  assert.equal((await handleFixtureConfirmation(post('{"action":"load"}', { 'content-length': '513' }), env, now + 1)).status, 413);
  assert.equal((await handleFixtureConfirmation(post('{"action":"load"}', { origin: 'http://example.invalid' }), env, now + 1)).status, 403);
  const result = await handleFixtureConfirmation(request('/api/fixture/confirmation', { headers: { host, cookie } }), env, now + 1);
  assert.equal((await result.json()).state, 'idle');
});
