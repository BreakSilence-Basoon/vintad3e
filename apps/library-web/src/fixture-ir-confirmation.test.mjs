import test from 'node:test';
import assert from 'node:assert/strict';
import { handleFixtureSession } from './fixture-session.mjs';
import { handleFixtureIrConfirmation, readFixtureIrImport } from './fixture-ir-confirmation.mjs';
import { fixtureIrDocument } from './fixture-ir-examples.mjs';

const origin = 'http://127.0.0.1:3829', host = '127.0.0.1:3829';
const env = { NODE_ENV: 'development', VINTAD3E_LIBRARY_FIXTURE: '1' };
const login = now => handleFixtureSession(new Request(`${origin}/login`, { method: 'POST', headers: { host, origin } }), 'login', env, now).headers.get('set-cookie').split(';')[0];
const post = (cookie, body, extra = {}) => new Request(`${origin}/confirmation`, { method: 'POST', headers: { host, origin, cookie, 'content-type': 'application/json', ...extra }, body: JSON.stringify(body) });
const read = (cookie, id) => new Request(`${origin}/confirmation?proposalId=${id}`, { headers: { host, cookie } });

test('single internal-document confirmation enforces review, authorization and expiry', async () => {
  const cookie = login(1000), other = login(1000);
  const proposal = await (await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'single' }), env, 1001)).json();
  assert.equal(readFixtureIrImport(cookie, host, env, fixtureIrDocument.id, 1002), null);
  assert.equal((await handleFixtureIrConfirmation(read(other, proposal.proposalId), env, 1002)).status, 404);
  assert.equal((await handleFixtureIrConfirmation(post(cookie, { action: 'execute', proposalId: proposal.proposalId }), env, 1002)).status, 409);
  for (const [action, state] of [['review', 'reviewed'], ['confirm', 'approved'], ['execute', 'executed']]) {
    const response = await handleFixtureIrConfirmation(post(cookie, { action, proposalId: proposal.proposalId }), env, 1003);
    assert.equal(response.status, 200); assert.equal((await response.json()).state, state);
  }
  assert.deepEqual(readFixtureIrImport(cookie, host, env, fixtureIrDocument.id, 1004), fixtureIrDocument);
  assert.equal(readFixtureIrImport(other, host, env, fixtureIrDocument.id, 1004), null);
  assert.equal(readFixtureIrImport(cookie, host, env, 'unknown', 1004), null);
  assert.equal((await handleFixtureIrConfirmation(read(cookie, proposal.proposalId), env, 1001 + 15 * 60_000)).status, 404);
  assert.deepEqual(readFixtureIrImport(cookie, host, env, fixtureIrDocument.id, 1001 + 15 * 60_000), fixtureIrDocument);
  assert.equal(readFixtureIrImport(cookie, host, env, fixtureIrDocument.id, 1000 + 30 * 60_000), null);
});

test('batch example is isolated and can be applied only through its own synthetic action', async () => {
  const cookie = login(5000), other = login(5000);
  const proposal = await (await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'batch' }), env, 5001)).json();
  assert.equal(readFixtureIrImport(other, host, env, fixtureIrDocument.id, 5002), null);
  assert.equal((await handleFixtureIrConfirmation(post(cookie, { action: 'confirm', proposalId: proposal.proposalId }), env, 5002)).status, 409);
  assert.equal((await handleFixtureIrConfirmation(post(other, { action: 'apply', proposalId: proposal.proposalId }), env, 5002)).status, 404);
  assert.equal((await handleFixtureIrConfirmation(post(other, { action: 'restore', proposalId: proposal.proposalId, proof: 'A'.repeat(43) }), env, 5002)).status, 404);
  assert.equal((await (await handleFixtureIrConfirmation(post(other, { action: 'restore', proposalId: proposal.proposalId, proof: proposal.proof }), env, 5003)).json()).state, 'loaded');
  assert.equal((await (await handleFixtureIrConfirmation(post(other, { action: 'apply', proposalId: proposal.proposalId }), env, 5004)).json()).state, 'executed');
  assert.deepEqual(readFixtureIrImport(other, host, env, fixtureIrDocument.id, 5004), fixtureIrDocument);
  assert.equal(readFixtureIrImport(cookie, host, env, fixtureIrDocument.id, 5004), null);
  assert.equal((await handleFixtureIrConfirmation(post(other, { action: 'apply', proposalId: proposal.proposalId }), env, 5005)).status, 409);
  assert.equal((await handleFixtureIrConfirmation(post(other, { action: 'prepare', kind: 'batch' }, { origin: 'http://example.invalid' }), env, 5005)).status, 403);
  assert.equal((await handleFixtureIrConfirmation(post(other, { action: 'prepare', kind: 'batch' }), { ...env, NODE_ENV: 'production' }, 5005)).status, 404);
});
