import assert from 'node:assert/strict';
import test from 'node:test';
import { handleTimetableAuth, handleTimetableLogout } from './timetable-auth.mjs';

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
  assert.equal((await handleTimetableAuth(request('https://app.example.invalid/auth/start?other=1'), base, 'start')).status, 400);
  assert.equal((await handleTimetableAuth(request('https://app.example.invalid/auth/start?next=%2F&next=%2F'), base, 'start')).status, 400);
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
  assert.deepEqual(response.headers.getSetCookie(), [cleared, signedIn, '__Host-vintad3e-return=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0']);
  assert.equal(requests[1].init.headers.cookie, `__Host-vintad3e-login=${binding}`);
  assert.equal(requests[1].init.redirect, 'manual');
});

test('login returns only to a safe internal path bound to the current login cookie', async (t) => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    requests.push({ url, init });
    if (url.endsWith('/auth/start')) return new Response(null, { status: 302, headers: { location: 'https://identity.example.invalid/authorize', 'set-cookie': login } });
    const headers = new Headers(); headers.append('set-cookie', cleared); headers.append('set-cookie', signedIn);
    return new Response('{}', { status: 200, headers });
  });
  const startFor = async path => handleTimetableAuth(new Request(`https://app.example.invalid/auth/start?${new URLSearchParams({ next: path })}`), base, 'start');
  const callbackFor = async (started, loginValue = binding) => {
    const destination = started.headers.getSetCookie().find(value => value.startsWith('__Host-vintad3e-return=')).split(';')[0];
    return handleTimetableAuth(new Request('https://app.example.invalid/auth/callback?code=example&state=example', { headers: { cookie: `__Host-vintad3e-login=${loginValue}; ${destination}` } }), base, 'callback');
  };
  const safe = '/?view=schedule&month=2026-02';
  const started = await startFor(safe);
  assert.equal(started.status, 302);
  assert.equal(requests[0].url, `${base}/auth/start`);
  assert.equal((await callbackFor(started)).headers.get('location'), safe);
  assert.equal(requests.at(-1).init.headers.cookie, `__Host-vintad3e-login=${binding}`);
  assert.equal((await callbackFor(started, 'C'.repeat(43))).headers.get('location'), '/');
  for (const unsafe of ['https://other.example.invalid/', '//other.example.invalid/', '/%2f%2fother.example.invalid', '/%255cother', '/x/..//other.example.invalid', '/%2e%2e//other.example.invalid', '/bad\npath']) {
    assert.equal((await callbackFor(await startFor(unsafe))).headers.get('location'), '/', unsafe);
  }
  const duplicate = `__Host-vintad3e-login=${binding}; __Host-vintad3e-return=bad; __Host-vintad3e-return=bad`;
  const response = await handleTimetableAuth(new Request('https://app.example.invalid/auth/callback?code=example&state=example', { headers: { cookie: duplicate } }), base, 'callback');
  assert.equal(response.headers.get('location'), '/');
  assert.ok(response.headers.getSetCookie().some(value => value.startsWith('__Host-vintad3e-return=;')));
});

test('unsafe upstream redirects and cookies fail closed', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 302, headers: { location: 'http://identity.example.invalid/authorize', 'set-cookie': login } }));
  assert.equal((await handleTimetableAuth(new Request('https://app.example.invalid/auth/start'), base, 'start')).status, 503);
  mock.mock.mockImplementation(async () => new Response(null, { status: 302, headers: { location: 'https://identity.example.invalid/', 'set-cookie': 'other=value; Path=/' } }));
  assert.equal((await handleTimetableAuth(new Request('https://app.example.invalid/auth/start'), base, 'start')).status, 503);
});

test('logout forwards only authentication cookies and requires an Origin and an empty POST', async (t) => {
  const clearedSession = '__Host-vintad3e-session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 200, headers: { 'set-cookie': clearedSession } }));
  const origin = 'https://app.example.invalid';
  const url = `${origin}/auth/logout`;
  assert.equal((await handleTimetableLogout(new Request(url), base)).status, 404);
  assert.equal((await handleTimetableLogout(new Request(url, { method: 'POST' }), base)).status, 403);
  assert.equal((await handleTimetableLogout(new Request(url, { method: 'POST', headers: { origin }, body: 'x' }), base)).status, 400);
  assert.equal((await handleTimetableLogout(new Request(url, { method: 'POST', headers: { origin, 'content-length': '0' }, body: 'x' }), base)).status, 400);
  const duplicate = `__Host-vintad3e-session=${session}; __Host-vintad3e-session=${session}`;
  assert.equal((await handleTimetableLogout(new Request(url, { method: 'POST', headers: { origin, cookie: duplicate } }), base)).status, 400);
  assert.equal(fetch.mock.callCount(), 0);
  const response = await handleTimetableLogout(new Request(url, { method: 'POST', headers: { origin, cookie: `unrelated=omit; __Host-vintad3e-session=${session}` } }), base);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(response.headers.getSetCookie(), [clearedSession]);
  assert.equal(fetch.mock.calls[0].arguments[1].headers.cookie, `__Host-vintad3e-session=${session}`);
  assert.equal(fetch.mock.calls[0].arguments[1].headers.origin, origin);
  fetch.mock.mockImplementation(async () => new Response('{}', { status: 200 }));
  assert.equal((await handleTimetableLogout(new Request(url, { method: 'POST', headers: { origin } }), base)).status, 503);
});
