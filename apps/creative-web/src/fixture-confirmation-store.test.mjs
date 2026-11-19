import test from 'node:test';
import assert from 'node:assert/strict';
import { handleFixtureSession } from './fixture-session.mjs';
import { handleFixtureConfirmation } from './fixture-confirmation-store.mjs';

const origin = 'http://127.0.0.1:3831', host = '127.0.0.1:3831';
const env = { NODE_ENV: 'development', VINTAD3E_CREATIVE_FIXTURE: '1' };
const login = now => handleFixtureSession(new Request(`${origin}/api/fixture/login`, { method: 'POST', headers: { host, origin } }), 'login', env, now).headers.get('set-cookie').split(';')[0];
const request = (cookie, action, override = {}) => new Request(`${origin}/api/fixture/confirmation`, { method: action ? 'POST' : 'GET', headers: { host, origin, cookie, ...(action ? { 'content-type': 'application/json' } : {}), ...override }, ...(action ? { body: JSON.stringify({ action }) } : {}) });

test('server recovers only the same session and checks the full sequence', async () => {
  const cookie = login(1000), other = login(1000);
  assert.equal((await handleFixtureConfirmation(request(cookie, 'confirm'), env, 1001)).status, 409);
  for (const [action, state] of [['load', 'loaded'], ['review', 'reviewed'], ['confirm', 'approved']]) {
    const response = await handleFixtureConfirmation(request(cookie, action), env, 1002);
    assert.equal(response.status, 200); assert.equal((await response.json()).state, state);
  }
  assert.equal((await (await handleFixtureConfirmation(request(`${cookie}; other=1`), env, 1003)).json()).state, 'approved');
  assert.equal((await (await handleFixtureConfirmation(request(other), env, 1003)).json()).state, 'idle');
  assert.equal((await handleFixtureConfirmation(request(cookie, 'confirm', { origin: 'http://example.invalid' }), env, 1003)).status, 403);
  assert.equal((await handleFixtureConfirmation(request(cookie, 'confirm', { 'content-type': 'text/plain' }), env, 1003)).status, 400);
  assert.equal((await handleFixtureConfirmation(request(cookie, 'x'.repeat(600)), env, 1003)).status, 413);
  assert.equal((await handleFixtureConfirmation(request(cookie), { ...env, NODE_ENV: 'production' }, 1003)).status, 404);
  assert.equal((await handleFixtureConfirmation(request(cookie), env, 1000 + 30 * 60_000)).status, 401);
});

test('expired review cannot be confirmed on the server', async () => {
  const cookie = login(5000);
  await handleFixtureConfirmation(request(cookie, 'load'), env, 5001);
  await handleFixtureConfirmation(request(cookie, 'review'), env, 5002);
  assert.equal((await handleFixtureConfirmation(request(cookie, 'confirm'), env, 5002 + 5 * 60_000)).status, 409);
});
