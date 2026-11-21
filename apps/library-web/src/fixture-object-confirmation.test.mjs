import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { handleFixtureObjectConfirmation } from './fixture-object-confirmation.mjs';
import { handleFixtureSession } from './fixture-session.mjs';
import { fixtureUpload } from './fixture-upload-spec.mjs';

const origin = 'http://127.0.0.1:3829', host = '127.0.0.1:3829';
const env = { NODE_ENV: 'development', VINTAD3E_LIBRARY_FIXTURE: '1' };
const login = now => handleFixtureSession(new Request(`${origin}/login`, { method: 'POST', headers: { host, origin } }), 'login', env, now).headers.get('set-cookie').split(';')[0];
const post = (cookie, body, extra = {}) => new Request(`${origin}/confirmation`, { method: 'POST', headers: { host, origin, cookie, 'content-type': 'application/json', ...extra }, body: JSON.stringify(body) });
const read = (cookie, id) => new Request(`${origin}/confirmation?proposalId=${id}`, { headers: { host, cookie } });

test('synthetic upload proposals recover only in their own session and require ordered review', async () => {
  const cookie = login(1000), other = login(1000);
  const created = await handleFixtureObjectConfirmation(post(cookie, { action: 'prepare', objectId: fixtureUpload.id }), env, 1001);
  assert.equal(created.status, 200);
  const proposal = await created.json(), id = proposal.proposalId;
  assert.equal((await handleFixtureObjectConfirmation(read(other, id), env, 1002)).status, 404);
  assert.equal((await handleFixtureObjectConfirmation(post(other, { action: 'restore', proposalId: id, proof: 'A'.repeat(43) }), env, 1002)).status, 404);
  assert.equal((await handleFixtureObjectConfirmation(post(cookie, { action: 'confirm', proposalId: id }), env, 1002)).status, 409);
  const initial = await (await handleFixtureObjectConfirmation(read(cookie, id), env, 1002)).json();
  assert.equal(initial.state, 'loaded');
  assert.equal(initial.changeDigest, createHash('sha256').update(initial.canonical).digest('hex'));
  assert.equal(initial.change.filename, fixtureUpload.filename);
  for (const [action, state] of [['load', 'loaded'], ['review', 'reviewed'], ['confirm', 'confirmed']]) {
    const response = await handleFixtureObjectConfirmation(post(cookie, { action, proposalId: id }), env, 1003);
    assert.equal(response.status, 200); assert.equal((await response.json()).state, state);
  }
  assert.equal((await (await handleFixtureObjectConfirmation(read(cookie, id), env, 1004)).json()).state, 'confirmed');
  assert.equal((await (await handleFixtureObjectConfirmation(post(cookie, { action: 'load', proposalId: id }), env, 1004)).json()).state, 'confirmed');
  const restored = await (await handleFixtureObjectConfirmation(post(other, { action: 'restore', proposalId: id, proof: proposal.proof }), env, 1005)).json();
  assert.equal(restored.state, 'confirmed'); assert.equal(restored.changeDigest, initial.changeDigest); assert.notEqual(restored.permissionDigest, initial.permissionDigest);
  assert.equal((await handleFixtureObjectConfirmation(read(cookie, id), env, 1006)).status, 404);
  assert.equal((await (await handleFixtureObjectConfirmation(read(other, id), env, 1006)).json()).state, 'confirmed');
  assert.equal((await handleFixtureObjectConfirmation(read(other, id), env, 1001 + 15 * 60_000)).status, 404);
});

test('synthetic upload proposals reject wrong origin, unknown data and production', async () => {
  const cookie = login(5000);
  assert.equal((await handleFixtureObjectConfirmation(post(cookie, { action: 'prepare', objectId: fixtureUpload.id }, { origin: 'http://example.invalid' }), env, 5001)).status, 403);
  assert.equal((await handleFixtureObjectConfirmation(post(cookie, { action: 'prepare', objectId: 'unknown' }), env, 5001)).status, 400);
  assert.equal((await handleFixtureObjectConfirmation(post(cookie, { action: 'prepare', objectId: fixtureUpload.id }), { ...env, NODE_ENV: 'production' }, 5001)).status, 404);
});
