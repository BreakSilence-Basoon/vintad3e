import test from 'node:test';
import assert from 'node:assert/strict';
import { handleFixtureSession } from './fixture-session.mjs';
import { handleFixturePublication } from './fixture-publication-store.mjs';

const origin = 'http://127.0.0.1:3829', host = '127.0.0.1:3829';
const env = { NODE_ENV: 'development', VINTAD3E_LIBRARY_FIXTURE: '1' };
const login = now => handleFixtureSession(new Request(`${origin}/api/fixture/login`, { method: 'POST', headers: { host, origin } }), 'login', env, now).headers.get('set-cookie').split(';')[0];
const request = (cookie, action, override = {}) => new Request(`${origin}/api/fixture/publication-confirmation`, { method: action ? 'POST' : 'GET', headers: { host, origin, cookie, ...(action ? { 'content-type': 'application/json' } : {}), ...override }, ...(action ? { body: JSON.stringify({ action }) } : {}) });

test('publication follows review and confirmation, recovers once and isolates sessions', async () => {
  const cookie = login(1000), other = login(1000);
  assert.equal((await handleFixturePublication(request(cookie, 'publish'), env, 1001)).status, 409);
  for (const [action, state] of [['review', 'reviewed'], ['confirm', 'approved'], ['publish', 'published']]) {
    const response = await handleFixturePublication(request(cookie, action), env, 1002);
    assert.equal(response.status, 200); assert.equal((await response.json()).state, state);
  }
  assert.equal((await (await handleFixturePublication(request(cookie), env, 1003)).json()).state, 'published');
  assert.equal((await (await handleFixturePublication(request(other), env, 1003)).json()).state, 'loaded');
  assert.equal((await handleFixturePublication(request(cookie, 'publish'), env, 1003)).status, 200);
  assert.equal((await handleFixturePublication(request(cookie, 'review'), env, 1003)).status, 409);
});

test('publication rejects expiry, other origins, production and invalid actions', async () => {
  const cookie = login(5000);
  const denied = await handleFixturePublication(request(cookie, 'review', { origin: 'http://example.invalid' }), env, 5001);
  assert.equal(denied.status, 403); assert.equal((await denied.json()).error, 'denied');
  const invalid = await handleFixturePublication(request(cookie, 'unknown'), env, 5001);
  assert.equal(invalid.status, 400); assert.equal((await invalid.json()).error, 'invalid-request');
  assert.equal((await handleFixturePublication(request(cookie, 'x'.repeat(600)), env, 5001)).status, 413);
  assert.equal((await handleFixturePublication(request(cookie, 'review', { 'content-type': 'text/plain' }), env, 5001)).status, 400);
  const signedOut = await handleFixturePublication(request('', null), env, 5001);
  assert.equal(signedOut.status, 401); assert.equal((await signedOut.json()).error, 'sign-in-required');
  assert.equal((await handleFixturePublication(request(cookie), { ...env, NODE_ENV: 'production' }, 5001)).status, 404);
  const expired = await handleFixturePublication(request(cookie, 'review'), env, 5001 + 15 * 60_000);
  assert.equal(expired.status, 409); assert.equal((await expired.json()).error, 'changed');
  assert.equal((await handleFixturePublication(request(cookie), env, 5000 + 30 * 60_000)).status, 401);
});
