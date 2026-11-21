import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as login } from './app/api/fixture/login/route.ts';
import { POST as logout } from './app/api/fixture/logout/route.ts';
import { GET as readConfirmation, POST as changeConfirmation } from './app/api/fixture/confirmation/route.ts';

const origin = 'http://127.0.0.1:3825';
const host = '127.0.0.1:3825';

test('fixture routes validate requests and keep login, confirmation and logout in one session', async () => {
  const previous = Object.fromEntries(['NODE_ENV', 'VINTAD3E_PORTAL_FIXTURE', 'VINTAD3E_PORTAL_FIXTURE_ORIGIN'].map(name => [name, process.env[name]]));
  process.env.NODE_ENV = 'development';
  process.env.VINTAD3E_PORTAL_FIXTURE = '1';
  delete process.env.VINTAD3E_PORTAL_FIXTURE_ORIGIN;
  try {
    const make = (path, { method = 'POST', headers = {}, body } = {}) => new Request(`${origin}${path}`, {
      method, headers: { host, origin, ...headers }, ...(body === undefined ? {} : { body }),
    });
    assert.equal((await login(make('/api/fixture/login', { headers: { origin: 'http://example.invalid' } }))).status, 403);
    assert.equal((await login(make('/api/fixture/login', { headers: { 'content-length': '4097' } }))).status, 413);
    assert.equal((await readConfirmation(make('/api/fixture/confirmation', { method: 'GET' }))).status, 401);
    assert.equal((await logout(make('/api/fixture/logout', { headers: { origin: 'http://example.invalid' } }))).status, 403);
    assert.equal((await logout(make('/api/fixture/logout'))).status, 303);
    const empty = await login(make('/api/fixture/login'));
    assert.equal(empty.status, 303);
    assert.equal(empty.headers.get('location'), '/');
    const signedIn = await login(make('/api/fixture/login', { body: new URLSearchParams({ next: '/about' }) }));
    assert.equal(signedIn.status, 303);
    assert.equal(signedIn.headers.get('location'), '/about');
    const cookie = signedIn.headers.get('set-cookie').split(';')[0];
    assert.equal((await changeConfirmation(make('/api/fixture/confirmation', { headers: { cookie, 'content-type': 'application/json' } }))).status, 400);
    const loaded = await changeConfirmation(make('/api/fixture/confirmation', { headers: { cookie, 'content-type': 'application/json' }, body: '{"action":"load"}' }));
    assert.equal((await loaded.json()).state, 'loaded');
    assert.equal((await logout(make('/api/fixture/logout', { headers: { cookie } }))).status, 303);
    assert.equal((await readConfirmation(make('/api/fixture/confirmation', { method: 'GET', headers: { cookie } }))).status, 401);
    process.env.VINTAD3E_PORTAL_FIXTURE = '0';
    assert.equal((await login(make('/api/fixture/login'))).status, 404);
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
