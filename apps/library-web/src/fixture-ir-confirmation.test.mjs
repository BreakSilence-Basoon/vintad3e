import test from 'node:test';
import assert from 'node:assert/strict';
import { handleFixtureSession } from './fixture-session.mjs';
import { handleFixtureIrConfirmation, readFixtureIrAttachment, readFixtureIrImport, readFixtureNotionImport, readFixtureIrReservation } from './fixture-ir-confirmation.mjs';
import { fixtureIrDocument } from './fixture-ir-examples.mjs';
import { fixtureNotionDocument } from './fixture-notion-example.mjs';
import { fixtureUpload } from './fixture-upload-spec.mjs';
import { handleFixtureUpload } from './fixture-upload.mjs';

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

test('Notion example publishes only its own synthetic document after explicit confirmation', async () => {
  const cookie = login(8000), other = login(8000);
  const proposal = await (await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'notion' }), env, 8001)).json();
  assert.equal(readFixtureNotionImport(cookie, host, env, fixtureNotionDocument.id, 8002), null);
  assert.equal((await handleFixtureIrConfirmation(post(cookie, { action: 'execute', proposalId: proposal.proposalId }), env, 8002)).status, 409);
  for (const action of ['review', 'confirm', 'execute']) assert.equal((await handleFixtureIrConfirmation(post(cookie, { action, proposalId: proposal.proposalId }), env, 8003)).status, 200);
  assert.deepEqual(readFixtureNotionImport(cookie, host, env, fixtureNotionDocument.id, 8004), fixtureNotionDocument);
  assert.equal(readFixtureNotionImport(other, host, env, fixtureNotionDocument.id, 8004), null);
  assert.equal(readFixtureIrImport(cookie, host, env, fixtureIrDocument.id, 8004), null);
});

test('Notion confirmation resumes after synthetic login rotation only with its recovery proof', async () => {
  const old = login(12000);
  const proposal = await (await handleFixtureIrConfirmation(post(old, { action: 'prepare', kind: 'notion' }), env, 12001)).json();
  assert.equal((await handleFixtureIrConfirmation(post(old, { action: 'review', proposalId: proposal.proposalId }), env, 12002)).status, 200);
  const replacement = handleFixtureSession(new Request(`${origin}/login`, { method: 'POST', headers: { host, origin, cookie: old } }), 'login', env, 12003).headers.get('set-cookie').split(';')[0];
  assert.equal((await handleFixtureIrConfirmation(read(old, proposal.proposalId), env, 12004)).status, 401);
  assert.equal((await handleFixtureIrConfirmation(read(replacement, proposal.proposalId), env, 12004)).status, 404);
  const response = await handleFixtureIrConfirmation(post(replacement, { action: 'restore', proposalId: proposal.proposalId, proof: proposal.proof }), env, 12005);
  assert.equal((await response.json()).state, 'reviewed');
  assert.equal((await handleFixtureIrConfirmation(post(replacement, { action: 'confirm', proposalId: proposal.proposalId }), env, 12006)).status, 200);
});

test('an applied synthetic document follows a verified login recovery', async () => {
  const old = login(16000);
  const proposal = await (await handleFixtureIrConfirmation(post(old, { action: 'prepare', kind: 'single' }), env, 16001)).json();
  for (const action of ['review', 'confirm', 'execute']) assert.equal((await handleFixtureIrConfirmation(post(old, { action, proposalId: proposal.proposalId }), env, 16002)).status, 200);
  const replacement = handleFixtureSession(new Request(`${origin}/login`, { method: 'POST', headers: { host, origin, cookie: old } }), 'login', env, 16003).headers.get('set-cookie').split(';')[0];
  assert.equal(readFixtureIrImport(replacement, host, env, fixtureIrDocument.id, 16004), null);
  assert.equal((await handleFixtureIrConfirmation(post(replacement, { action: 'restore', proposalId: proposal.proposalId, proof: proposal.proof }), env, 16005)).status, 200);
  assert.deepEqual(readFixtureIrImport(replacement, host, env, fixtureIrDocument.id, 16006), fixtureIrDocument);
  assert.equal(readFixtureIrImport(old, host, env, fixtureIrDocument.id, 16006), null);
});

test('synthetic lifecycle delete and restore preserve session isolation and reject stale proposals', async () => {
  const cookie = login(20000), other = login(20000);
  assert.equal((await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'delete' }), env, 20001)).status, 409);
  assert.equal((await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'restore' }), env, 20001)).status, 409);
  const imported = await (await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'single' }), env, 20002)).json();
  for (const action of ['review', 'confirm', 'execute']) assert.equal((await handleFixtureIrConfirmation(post(cookie, { action, proposalId: imported.proposalId }), env, 20003)).status, 200);
  const removed = await (await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'delete' }), env, 20004)).json();
  const stale = await (await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'delete' }), env, 20004)).json();
  for (const action of ['review', 'confirm', 'execute']) assert.equal((await handleFixtureIrConfirmation(post(cookie, { action, proposalId: removed.proposalId }), env, 20005)).status, 200);
  assert.equal(readFixtureIrImport(cookie, host, env, fixtureIrDocument.id, 20006), null);
  assert.equal((await handleFixtureIrConfirmation(post(other, { action: 'prepare', kind: 'restore' }), env, 20006)).status, 409);
  const restored = await (await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'restore' }), env, 20007)).json();
  for (const action of ['review', 'confirm', 'execute']) assert.equal((await handleFixtureIrConfirmation(post(cookie, { action, proposalId: restored.proposalId }), env, 20008)).status, 200);
  assert.deepEqual(readFixtureIrImport(cookie, host, env, fixtureIrDocument.id, 20009), fixtureIrDocument);
  const repeated = await (await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'single' }), env, 20009)).json();
  for (const action of ['review', 'confirm', 'execute']) assert.equal((await handleFixtureIrConfirmation(post(cookie, { action, proposalId: repeated.proposalId }), env, 20009)).status, 200);
  const current = await (await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'delete' }), env, 20009)).json();
  assert.equal((await (await handleFixtureIrConfirmation(read(cookie, current.proposalId), env, 20009)).json()).example.change.revision, 3);
  for (const action of ['review', 'confirm']) assert.equal((await handleFixtureIrConfirmation(post(cookie, { action, proposalId: stale.proposalId }), env, 20010)).status, 200);
  assert.equal((await handleFixtureIrConfirmation(post(cookie, { action: 'execute', proposalId: stale.proposalId }), env, 20010)).status, 409);
});

test('synthetic single and batch attachment reservations require confirmation and stay session scoped', async () => {
  const cookie = login(25000), other = login(25000), uploadId = '00000000-0000-4000-8000-000000000106';
  const proposal = await (await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'reserve' }), env, 25001)).json();
  assert.equal(readFixtureIrReservation(cookie, host, env, uploadId, 25002), false);
  assert.equal((await handleFixtureIrConfirmation(post(cookie, { action: 'execute', proposalId: proposal.proposalId }), env, 25002)).status, 409);
  for (const action of ['review', 'confirm', 'execute']) assert.equal((await handleFixtureIrConfirmation(post(cookie, { action, proposalId: proposal.proposalId }), env, 25003)).status, 200);
  assert.equal(readFixtureIrReservation(cookie, host, env, uploadId, 25004), true);
  assert.equal(readFixtureIrReservation(other, host, env, uploadId, 25004), false);
  const imported = await (await handleFixtureIrConfirmation(post(other, { action: 'prepare', kind: 'single' }), env, 25005)).json();
  for (const action of ['review', 'confirm', 'execute']) assert.equal((await handleFixtureIrConfirmation(post(other, { action, proposalId: imported.proposalId }), env, 25005)).status, 200);
  const batch = await (await handleFixtureIrConfirmation(post(other, { action: 'prepare', kind: 'batch-reserve' }), env, 25005)).json();
  const view = await (await handleFixtureIrConfirmation(read(other, batch.proposalId), env, 25006)).json();
  assert.equal(view.summary.attachments[0].name, '가게 안내.txt');
  assert.equal((await handleFixtureIrConfirmation(post(other, { action: 'apply', proposalId: batch.proposalId }), env, 25007)).status, 200);
  assert.equal(readFixtureIrReservation(other, host, env, uploadId, 25008), true);
});

test('synthetic attachment requires the reserved matching upload and current document revision', async () => {
  const cookie = login(30000), other = login(30000);
  assert.equal((await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'attach' }), env, 30001)).status, 409);
  const imported = await (await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'single' }), env, 30002)).json();
  for (const action of ['review', 'confirm', 'execute']) assert.equal((await handleFixtureIrConfirmation(post(cookie, { action, proposalId: imported.proposalId }), env, 30003)).status, 200);
  const reserved = await (await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'reserve' }), env, 30004)).json();
  for (const action of ['review', 'confirm', 'execute']) assert.equal((await handleFixtureIrConfirmation(post(cookie, { action, proposalId: reserved.proposalId }), env, 30005)).status, 200);
  assert.equal((await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'attach' }), env, 30006)).status, 409);
  const wrongType = new Request(`${origin}/upload`, { method: 'POST', headers: { host, origin, cookie, 'content-type': 'application/octet-stream', 'x-vintad3e-content-type': 'image/png' }, body: fixtureUpload.body });
  assert.equal((await handleFixtureUpload(wrongType, env, 30006)).status, 200);
  assert.equal((await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'attach' }), env, 30006)).status, 409);
  const upload = new Request(`${origin}/upload`, { method: 'POST', headers: { host, origin, cookie, 'content-type': 'application/octet-stream', 'x-vintad3e-content-type': 'text/plain' }, body: fixtureUpload.body });
  assert.equal((await handleFixtureUpload(upload, env, 30007)).status, 200);
  const attached = await (await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'attach' }), env, 30008)).json();
  for (const action of ['review', 'confirm', 'execute']) assert.equal((await handleFixtureIrConfirmation(post(cookie, { action, proposalId: attached.proposalId }), env, 30009)).status, 200);
  assert.deepEqual(readFixtureIrAttachment(cookie, host, env, fixtureIrDocument.id, 30010), fixtureUpload);
  assert.equal(readFixtureIrAttachment(other, host, env, fixtureIrDocument.id, 30010), null);
  assert.equal((await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'attach' }), env, 30010)).status, 409);
});

test('attachment recovery requires a fresh synthetic upload after login rotation', async () => {
  const old = login(35000);
  for (const kind of ['single', 'reserve']) {
    const proposal = await (await handleFixtureIrConfirmation(post(old, { action: 'prepare', kind }), env, 35001)).json();
    for (const action of ['review', 'confirm', 'execute']) assert.equal((await handleFixtureIrConfirmation(post(old, { action, proposalId: proposal.proposalId }), env, 35002)).status, 200);
  }
  const upload = cookie => new Request(`${origin}/upload`, { method: 'POST', headers: { host, origin, cookie, 'content-type': 'application/octet-stream', 'x-vintad3e-content-type': 'text/plain' }, body: fixtureUpload.body });
  assert.equal((await handleFixtureUpload(upload(old), env, 35003)).status, 200);
  const proposal = await (await handleFixtureIrConfirmation(post(old, { action: 'prepare', kind: 'attach' }), env, 35004)).json();
  for (const action of ['review', 'confirm']) assert.equal((await handleFixtureIrConfirmation(post(old, { action, proposalId: proposal.proposalId }), env, 35005)).status, 200);
  const replacement = handleFixtureSession(new Request(`${origin}/login`, { method: 'POST', headers: { host, origin, cookie: old } }), 'login', env, 35006).headers.get('set-cookie').split(';')[0];
  assert.equal((await handleFixtureIrConfirmation(post(replacement, { action: 'restore', proposalId: proposal.proposalId, proof: proposal.proof }), env, 35007)).status, 200);
  assert.equal((await handleFixtureIrConfirmation(post(replacement, { action: 'execute', proposalId: proposal.proposalId }), env, 35008)).status, 409);
  assert.equal((await handleFixtureUpload(upload(replacement), env, 35009)).status, 200);
  assert.equal((await handleFixtureIrConfirmation(post(replacement, { action: 'execute', proposalId: proposal.proposalId }), env, 35010)).status, 200);
  assert.deepEqual(readFixtureIrAttachment(replacement, host, env, fixtureIrDocument.id, 35011), fixtureUpload);
});
