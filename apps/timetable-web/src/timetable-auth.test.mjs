import assert from 'node:assert/strict';
import test from 'node:test';
import { handleTimetableAuth } from './timetable-auth.mjs';

const base = 'http://127.0.0.1:3825';
const binding = 'A'.repeat(43);
const session = 'B'.repeat(43);
const login = `__Host-vintad3e-login=${binding}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=300`;
const signedIn = `__Host-vintad3e-session=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=900`;
const cleared = '__Host-vintad3e-login=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';

test('only configured loopback and unique valid cookies reach the auth service', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('should not run'); });
  const request = (url, cookie) => new Request(url, { headers: cookie ? { cookie } : {} });
  assert.equal((await handleTimetableAuth(request('https://app.example.invalid/auth/start'), 'http://localhost:3825', 'start')).status, 503);
  assert.equal((await handleTimetableAuth(request('https://app.example.invalid/auth/start?next=https://other.example.invalid'), base, 'start')).status, 400);
  const duplicate = `__Host-vintad3e-login=${binding}; __Host-vintad3e-login=${binding}`;
  assert.equal((await handleTimetableAuth(request('https://app.example.invalid/auth/callback?code=x', duplicate), base, 'callback')).status, 400);
  assert.equal((await handleTimetableAuth(request('https://app.example.invalid/auth/callback?code=x', '__Host-vintad3e-login=invalid'), base, 'callback')).status, 400);
  assert.equal(fetch.mock.callCount(), 0);
});

test('only expected cookies are forwarded and successful callback returns to the app', async (t) => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    requests.push({ url, init });
    if (url.endsWith('/auth/start')) return new Response(null, { status: 302, headers: { location: 'https://identity.example.invalid/authorize', 'set-cookie': login } });
    const headers = new Headers(); headers.append('set-cookie', cleared); headers.append('set-cookie', signedIn);
    return new Response('{}', { status: 200, headers });
  });
  const start = await handleTimetableAuth(new Request('https://app.example.invalid/auth/start'), base, 'start');
  assert.equal(start.status, 302);
  assert.equal(start.headers.get('location'), 'https://identity.example.invalid/authorize');
  const response = await handleTimetableAuth(new Request('https://app.example.invalid/auth/callback?code=example&state=example', { headers: { cookie: `unrelated=private; __Host-vintad3e-login=${binding}` } }), base, 'callback');
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(response.headers.getSetCookie(), [cleared, signedIn]);
  assert.equal(requests[1].init.headers.cookie, `__Host-vintad3e-login=${binding}`);
  assert.equal(requests[1].init.redirect, 'manual');
});

test('unsafe upstream redirects and cookies fail closed', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 302, headers: { location: 'http://identity.example.invalid/authorize', 'set-cookie': login } }));
  assert.equal((await handleTimetableAuth(new Request('https://app.example.invalid/auth/start'), base, 'start')).status, 503);
  mock.mock.mockImplementation(async () => new Response(null, { status: 302, headers: { location: 'https://identity.example.invalid/', 'set-cookie': 'other=value; Path=/' } }));
  assert.equal((await handleTimetableAuth(new Request('https://app.example.invalid/auth/start'), base, 'start')).status, 503);
});
