import test from 'node:test';
import assert from 'node:assert/strict';
import { handleFixtureSession } from './fixture-session.mjs';
import { handleFixtureMeetingConfirmation } from './fixture-meeting-confirmation.mjs';
import { fixtureIrExclusive, handleFixtureIrExclusiveUpload, readFixtureIrExclusive, softDeleteFixtureIrExclusive } from './fixture-ir-exclusive.mjs';

const origin = 'http://127.0.0.1:3829', host = '127.0.0.1:3829';
const env = { NODE_ENV: 'development', VINTAD3E_LIBRARY_FIXTURE: '1' };
const login = now => handleFixtureSession(new Request(`${origin}/login`, { method: 'POST', headers: { host, origin } }), 'login', env, now).headers.get('set-cookie').split(';')[0];
const upload = (cookie, body, extra = {}) => new Request(`${origin}/upload`, { method: 'POST', headers: { host, origin, cookie, 'content-type': 'text/plain', ...extra }, body });

test('exclusive synthetic file requires reservation, exact bytes and its own session', async () => {
  const cookie = login(1000), other = login(1000);
  assert.equal((await handleFixtureIrExclusiveUpload(upload(cookie, fixtureIrExclusive.body), env, false, 1001)).status, 409);
  assert.equal((await handleFixtureIrExclusiveUpload(upload(cookie, '다른 내용'), env, true, 1001)).status, 400);
  assert.equal((await handleFixtureIrExclusiveUpload(upload(cookie, fixtureIrExclusive.body, { origin: 'http://example.invalid' }), env, true, 1001)).status, 403);
  assert.equal((await handleFixtureIrExclusiveUpload(upload(cookie, fixtureIrExclusive.body), { ...env, NODE_ENV: 'production' }, true, 1001)).status, 404);
  assert.equal((await handleFixtureIrExclusiveUpload(upload(cookie, fixtureIrExclusive.body), env, true, 1001)).status, 200);
  assert.deepEqual(readFixtureIrExclusive(cookie, host, env, 1002), fixtureIrExclusive);
  assert.equal(readFixtureIrExclusive(other, host, env, 1002), null);
  const meeting = new Request(`${origin}/meeting`, { method: 'POST', headers: { host, origin, cookie, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'prepare', meetingId: '00000000-0000-4000-8000-000000000004', change: { kind: 'attach', objectId: fixtureIrExclusive.id } }) });
  assert.equal((await handleFixtureMeetingConfirmation(meeting, env, 1002)).status, 400);
  assert.equal(softDeleteFixtureIrExclusive(cookie, host, env, 2, 1003), false);
  assert.equal(softDeleteFixtureIrExclusive(cookie, host, env, 1, 1003), true);
  assert.equal(readFixtureIrExclusive(cookie, host, env, 1004), null);
  assert.equal(fixtureIrExclusive.body, '업무를 시작하기 전에 필요한 사항을 확인합니다.');
  assert.equal((await handleFixtureIrExclusiveUpload(upload(cookie, fixtureIrExclusive.body), env, true, 1004)).status, 409);
});
