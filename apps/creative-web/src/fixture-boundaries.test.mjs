import test from 'node:test';
import assert from 'node:assert/strict';
import { formatKstDateTime, getCreativeFixtures } from './creative-fixture.ts';
import { fixtureNext, fixtureOrigin, fixtureSession, handleFixtureSession } from './fixture-session.mjs';
import { fixtureSignInNotice } from './fixture-sign-in-notice.mjs';
import { handleFixtureConfirmation } from './fixture-confirmation-store.mjs';

const origin = 'http://127.0.0.1:3831', host = '127.0.0.1:3831';
const env = { NODE_ENV: 'development', VINTAD3E_CREATIVE_FIXTURE: '1' };
const login = now => handleFixtureSession(new Request(`${origin}/login`, { method: 'POST', headers: { host, origin } }), 'login', env, now).headers.get('set-cookie').split(';')[0];

test('project fixtures handle empty state and isolate returned copies', () => {
  const items = getCreativeFixtures('development', '1');
  assert.equal(items.length, 2); items[0].title = 'changed';
  assert.notEqual(getCreativeFixtures('development', '1')[0].title, 'changed');
  for (const [mode, enabled, state] of [['development','1','empty'], ['production','1',''], ['development','','']]) assert.deepEqual(getCreativeFixtures(mode, enabled, state), []);
});

test('dates handle valid, empty and malformed text', () => {
  assert.match(formatKstDateTime('2026-01-01T15:00:00.000Z'), /2026년 1월 2일.*00:00/);
  assert.equal(formatKstDateTime(''), null);
  assert.equal(formatKstDateTime('not-a-date'), null);
});

test('return destinations and fixture origins reject unsafe input', () => {
  assert.equal(fixtureNext('/confirmations/proposal-01'), '/confirmations/proposal-01');
  for (const path of ['', '//example.invalid', '/confirmations/proposal-01?x=1', null]) assert.equal(fixtureNext(path), '/');
  assert.equal(fixtureOrigin(env), origin);
  for (const url of ['https://127.0.0.1:3831', 'http://localhost:3831', 'http://127.0.0.1:3831/a', 'http://user@127.0.0.1:3831']) assert.equal(fixtureOrigin({ ...env, VINTAD3E_CREATIVE_FIXTURE_ORIGIN: url }), null);
});

test('session expires exactly at the limit and rejects duplicate cookies', () => {
  const now = 4_000_000, cookie = login(now);
  assert.equal(fixtureSession(cookie, host, env, now + 30 * 60_000 - 1), true);
  assert.equal(fixtureSession(`${cookie}; ${cookie}`, host, env, now + 1), false);
  assert.equal(fixtureSession(cookie, host, env, now + 30 * 60_000), false);
});

test('sign-in notice rejects empty and non-string codes', () => {
  assert.equal(fixtureSignInNotice(''), null); assert.equal(fixtureSignInNotice(null), null);
  assert.ok(fixtureSignInNotice('AccessDenied')?.title);
  assert.deepEqual(fixtureSignInNotice('__proto__'), fixtureSignInNotice('unknown'));
});

test('confirmation rejects empty, malformed and oversized request bodies', async () => {
  const now = 8_000_000, cookie = login(now);
  const request = (body, extra = {}) => new Request(`${origin}/confirmation`, { method: 'POST', headers: { host, origin, cookie, 'content-type': 'application/json', ...extra }, body });
  for (const body of ['', '{', '{}', '[]', '{"action":"load","extra":true}']) assert.equal((await handleFixtureConfirmation(request(body), env, now + 1)).status, 400);
  assert.equal((await handleFixtureConfirmation(request(' '.repeat(513)), env, now + 1)).status, 413);
  assert.equal((await handleFixtureConfirmation(request('{"action":"load"}', { origin: 'http://example.invalid' }), env, now + 1)).status, 403);
  const good = await handleFixtureConfirmation(request('{"action":"load"}'), env, now + 1);
  assert.equal(good.status, 200); assert.equal((await good.json()).state, 'loaded');
});
