import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtureCorrectedUpload, fixtureUpload } from './fixture-upload-spec.mjs';
import { getFixtureUpload, getFixtureUploadContentType, handleFixtureUpload, listFixtureUploads } from './fixture-upload.mjs';
import { handleFixtureSession } from './fixture-session.mjs';

const origin = 'http://127.0.0.1:3829', host = '127.0.0.1:3829';
const env = { NODE_ENV: 'development', VINTAD3E_LIBRARY_FIXTURE: '1' };
function login(now) { return handleFixtureSession(new Request(`${origin}/api/fixture/login`, { method: 'POST', headers: { host, origin } }), 'login', env, now).headers.get('set-cookie').split(';')[0]; }
function upload(cookie, body, headers = {}) { return new Request(`${origin}/api/fixture/upload`, { method: 'POST', headers: { host, origin, cookie, 'content-type': 'application/octet-stream', ...headers }, body }); }

test('only the fixed synthetic content can be uploaded to the same local session', async () => {
  const cookie = login(1000), other = login(1000);
  assert.equal(getFixtureUpload(cookie, host, env, 1001), null);
  assert.equal((await handleFixtureUpload(upload(cookie, '다른 내용'), env, 1001)).status, 400);
  assert.equal((await handleFixtureUpload(upload(cookie, 'x'.repeat(500)), env, 1001)).status, 413);
  assert.equal((await handleFixtureUpload(upload(cookie, fixtureUpload.body, { origin: 'http://example.invalid' }), env, 1001)).status, 403);
  assert.equal((await handleFixtureUpload(upload(cookie, fixtureUpload.body, { 'x-vintad3e-content-type': 'not a type' }), env, 1001)).status, 400);
  assert.equal((await handleFixtureUpload(upload(cookie, fixtureUpload.body), { ...env, NODE_ENV: 'production' }, 1001)).status, 404);
  const response = await handleFixtureUpload(upload(cookie, fixtureUpload.body), env, 1001);
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { id: fixtureUpload.id });
  assert.deepEqual(getFixtureUpload(`${cookie}; other=1`, host, env, 1002), fixtureUpload);
  assert.equal(getFixtureUploadContentType(cookie, host, env, 1002), null);
  assert.equal((await handleFixtureUpload(upload(cookie, fixtureUpload.body, { 'x-vintad3e-content-type': 'text/plain' }), env, 1002)).status, 200);
  assert.equal(getFixtureUploadContentType(cookie, host, env, 1002), 'text/plain');
  assert.equal(getFixtureUploadContentType(other, host, env, 1002), null);
  assert.equal(getFixtureUpload(cookie, host, env, 1002, fixtureCorrectedUpload.id), null);
  const corrected = await handleFixtureUpload(upload(cookie, fixtureCorrectedUpload.body), env, 1002);
  assert.equal(corrected.status, 200); assert.deepEqual(await corrected.json(), { id: fixtureCorrectedUpload.id });
  assert.deepEqual(listFixtureUploads(cookie, host, env, 1003), [fixtureUpload, fixtureCorrectedUpload]);
  assert.equal(getFixtureUpload(other, host, env, 1003, fixtureCorrectedUpload.id), null);
  assert.equal(getFixtureUpload(cookie, host, env, 1003, 'unknown'), null);
  assert.equal(getFixtureUpload(other, host, env, 1002), null);
  assert.equal(getFixtureUpload(cookie, host, env, 1000 + 30 * 60_000), null);
});
