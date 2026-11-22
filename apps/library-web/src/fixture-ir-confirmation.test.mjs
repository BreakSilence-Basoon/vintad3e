import test from 'node:test';
import assert from 'node:assert/strict';
import { handleFixtureSession } from './fixture-session.mjs';
import { handleFixtureIrConfirmation, readFixtureIrAttachment, readFixtureIrImport, readFixtureIrIsolatedAttachment, readFixtureIrIsolatedObject, readFixtureNotionImport, readFixtureIrReservation } from './fixture-ir-confirmation.mjs';
import { fixtureIrDocument } from './fixture-ir-examples.mjs';
import { fixtureNotionDocument } from './fixture-notion-example.mjs';
import { fixtureUpload } from './fixture-upload-spec.mjs';
import { getFixtureUpload, handleFixtureUpload } from './fixture-upload.mjs';
import { fixtureIrExclusive, handleFixtureIrExclusiveUpload } from './fixture-ir-exclusive.mjs';
import { handleFixtureMeetingConfirmation } from './fixture-meeting-confirmation.mjs';
import { applyFixtureMeetingChange, readFixtureMeetingContent } from './fixture-meeting-content.ts';

const origin = 'http://127.0.0.1:3829', host = '127.0.0.1:3829';
const env = { NODE_ENV: 'development', VINTAD3E_LIBRARY_FIXTURE: '1' };
const login = now => handleFixtureSession(new Request(`${origin}/login`, { method: 'POST', headers: { host, origin } }), 'login', env, now).headers.get('set-cookie').split(';')[0];
const post = (cookie, body, extra = {}) => new Request(`${origin}/confirmation`, { method: 'POST', headers: { host, origin, cookie, 'content-type': 'application/json', ...extra }, body: JSON.stringify(body) });
const read = (cookie, id) => new Request(`${origin}/confirmation?proposalId=${id}`, { headers: { host, cookie } });

test('invalid synthetic IR batch preparations return a 400 invalid_request without executing', async () => {
  const cookie = login(500), now = 501;
  for (const body of [{}, { action: 'prepare' }, { action: 'prepare', kind: 'batch', entries: [] }, { action: 'prepare', kind: 'batch-reserve', entries: [] }]) {
    const response = await handleFixtureIrConfirmation(post(cookie, body), env, now);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'invalid_request' });
  }
  assert.equal(readFixtureIrImport(cookie, host, env, fixtureIrDocument.id, now), null);
  assert.equal((await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'batch' }), env, now)).status, 200);
  const unavailable = await handleFixtureIrConfirmation(read(cookie, 'unknown'), env, now);
  assert.equal(unavailable.status, 404);
  assert.deepEqual(await unavailable.json(), { error: 'unavailable' });
});

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
  const stale = await (await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'delete' }), env, 30007)).json();
  const attached = await (await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'attach' }), env, 30008)).json();
  for (const action of ['review', 'confirm', 'execute']) assert.equal((await handleFixtureIrConfirmation(post(cookie, { action, proposalId: attached.proposalId }), env, 30009)).status, 200);
  assert.deepEqual(readFixtureIrAttachment(cookie, host, env, fixtureIrDocument.id, 30010), fixtureUpload);
  assert.equal(readFixtureIrAttachment(other, host, env, fixtureIrDocument.id, 30010), null);
  assert.equal((await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'attach' }), env, 30010)).status, 409);
  for (const action of ['review', 'confirm']) assert.equal((await handleFixtureIrConfirmation(post(cookie, { action, proposalId: stale.proposalId }), env, 30010)).status, 200);
  assert.equal((await handleFixtureIrConfirmation(post(cookie, { action: 'execute', proposalId: stale.proposalId }), env, 30010)).status, 409);
  const deleted = await (await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'delete' }), env, 30011)).json();
  for (const action of ['review', 'confirm', 'execute']) assert.equal((await handleFixtureIrConfirmation(post(cookie, { action, proposalId: deleted.proposalId }), env, 30012)).status, 200);
  assert.equal((await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'cleanup' }), env, 30013)).status, 409);
  assert.deepEqual(getFixtureUpload(cookie, host, env, 30013), fixtureUpload);
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

test('isolated cleanup requires deletion proof, rejects stale state and preserves shared synthetic files', async () => {
  const cookie = login(40000), other = login(40000);
  async function prepare(kind) {
    const response = await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind }), env, 40001);
    assert.equal(response.status, 200); return response.json();
  }
  async function apply(proposal) {
    for (const action of ['review', 'confirm', 'execute']) assert.equal((await handleFixtureIrConfirmation(post(cookie, { action, proposalId: proposal.proposalId }), env, 40002)).status, 200);
  }
  await apply(await prepare('single')); await apply(await prepare('reserve'));
  const isolated = new Request(`${origin}/upload`, { method: 'POST', headers: { host, origin, cookie, 'content-type': 'text/plain' }, body: fixtureIrExclusive.body });
  assert.equal((await handleFixtureIrExclusiveUpload(isolated, env, readFixtureIrReservation(cookie, host, env, '00000000-0000-4000-8000-000000000106', 40003), 40003)).status, 200);
  const shared = new Request(`${origin}/upload`, { method: 'POST', headers: { host, origin, cookie, 'content-type': 'application/octet-stream', 'x-vintad3e-content-type': 'text/plain' }, body: fixtureUpload.body });
  assert.equal((await handleFixtureUpload(shared, env, 40003)).status, 200);
  const meeting = await (await handleFixtureMeetingConfirmation(post(cookie, { action: 'prepare', meetingId: '00000000-0000-4000-8000-000000000004', change: { kind: 'attach', objectId: fixtureUpload.id } }), env, 40003)).json();
  for (const action of ['load', 'review', 'confirm', 'execute']) assert.equal((await handleFixtureMeetingConfirmation(post(cookie, { action, proposalId: meeting.proposalId, changeDigest: meeting.changeDigest }), env, 40003)).status, 200);
  const saved = new Map(), store = { getItem: name => saved.get(name) ?? null, setItem: (name, value) => { saved.set(name, value); } };
  const meetingId = '00000000-0000-4000-8000-000000000004';
  assert.equal(applyFixtureMeetingChange(store, meetingId, { kind: 'attach', objectId: fixtureUpload.id }, new Date('2026-01-02T03:00:00.000Z'))?.attached, true);
  await apply(await prepare('isolated-attach'));
  assert.deepEqual(readFixtureIrIsolatedAttachment(cookie, host, env, fixtureIrDocument.id, 40004), fixtureIrExclusive);
  assert.equal((await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'cleanup' }), env, 40004)).status, 409);
  await apply(await prepare('delete'));
  assert.equal(readFixtureIrIsolatedAttachment(cookie, host, env, fixtureIrDocument.id, 40005), null);
  assert.deepEqual(readFixtureIrIsolatedObject(cookie, host, env, 40005), fixtureIrExclusive);
  const stale = await prepare('cleanup'); await apply(await prepare('restore'));
  for (const action of ['review', 'confirm']) assert.equal((await handleFixtureIrConfirmation(post(cookie, { action, proposalId: stale.proposalId }), env, 40006)).status, 200);
  assert.equal((await handleFixtureIrConfirmation(post(cookie, { action: 'execute', proposalId: stale.proposalId }), env, 40006)).status, 409);
  await apply(await prepare('delete'));
  const cleanup = await prepare('cleanup');
  assert.equal((await handleFixtureIrConfirmation(post(other, { action: 'execute', proposalId: cleanup.proposalId }), env, 40007)).status, 404);
  await apply(cleanup);
  assert.equal(readFixtureIrIsolatedObject(cookie, host, env, 40008), null);
  assert.deepEqual(getFixtureUpload(cookie, host, env, 40008), fixtureUpload);
  assert.equal(readFixtureMeetingContent(store, meetingId)?.attached, true);
  assert.equal((await (await handleFixtureMeetingConfirmation(post(cookie, { action: 'load', proposalId: meeting.proposalId, changeDigest: meeting.changeDigest }), env, 40008)).json()).state, 'executed');
  assert.equal(fixtureIrExclusive.body, '업무를 시작하기 전에 필요한 사항을 확인합니다.');
});

test('Notion lifecycle uses synthetic import and deletion proofs and rejects stale changes', async () => {
  const cookie = login(50000), other = login(50000);
  assert.equal((await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'notion-delete' }), env, 50001)).status, 409);
  assert.equal((await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind: 'notion-restore' }), env, 50001)).status, 409);
  async function prepare(kind) { const response = await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind }), env, 50002); assert.equal(response.status, 200); return response.json(); }
  async function apply(proposal) { for (const action of ['review', 'confirm', 'execute']) assert.equal((await handleFixtureIrConfirmation(post(cookie, { action, proposalId: proposal.proposalId }), env, 50003)).status, 200); }
  const imported = await prepare('notion'); await apply(imported);
  const deleted = await prepare('notion-delete'), stale = await prepare('notion-delete');
  const deleteView = await (await handleFixtureIrConfirmation(read(cookie, deleted.proposalId), env, 50004)).json();
  assert.equal(deleteView.example.change.notionProof.importProposalId, imported.proposalId);
  assert.equal((await handleFixtureIrConfirmation(post(cookie, { action: 'execute', proposalId: deleted.proposalId, proof: 'forged' }), env, 50004)).status, 400);
  await apply(deleted); assert.equal(readFixtureNotionImport(cookie, host, env, fixtureNotionDocument.id, 50005), null);
  assert.equal((await handleFixtureIrConfirmation(post(other, { action: 'prepare', kind: 'notion-restore' }), env, 50005)).status, 409);
  const restored = await prepare('notion-restore');
  const restoreView = await (await handleFixtureIrConfirmation(read(cookie, restored.proposalId), env, 50006)).json();
  assert.equal(restoreView.example.change.notionProof.deletionProposalId, deleted.proposalId);
  assert.equal(restoreView.example.change.notionProof.aclRevisionAfter, 2);
  await apply(restored); assert.deepEqual(readFixtureNotionImport(cookie, host, env, fixtureNotionDocument.id, 50007), fixtureNotionDocument);
  for (const action of ['review', 'confirm']) assert.equal((await handleFixtureIrConfirmation(post(cookie, { action, proposalId: stale.proposalId }), env, 50008)).status, 200);
  assert.equal((await handleFixtureIrConfirmation(post(cookie, { action: 'execute', proposalId: stale.proposalId }), env, 50008)).status, 409);
});

test('Notion lifecycle proof and document state survive verified synthetic login recovery', async () => {
  const old = login(55000);
  const imported = await (await handleFixtureIrConfirmation(post(old, { action: 'prepare', kind: 'notion' }), env, 55001)).json();
  for (const action of ['review', 'confirm', 'execute']) assert.equal((await handleFixtureIrConfirmation(post(old, { action, proposalId: imported.proposalId }), env, 55002)).status, 200);
  const deletion = await (await handleFixtureIrConfirmation(post(old, { action: 'prepare', kind: 'notion-delete' }), env, 55003)).json();
  assert.equal((await handleFixtureIrConfirmation(post(old, { action: 'review', proposalId: deletion.proposalId }), env, 55004)).status, 200);
  const replacement = handleFixtureSession(new Request(`${origin}/login`, { method: 'POST', headers: { host, origin, cookie: old } }), 'login', env, 55005).headers.get('set-cookie').split(';')[0];
  assert.equal(readFixtureNotionImport(replacement, host, env, fixtureNotionDocument.id, 55006), null);
  assert.equal((await handleFixtureIrConfirmation(post(replacement, { action: 'restore', proposalId: deletion.proposalId, proof: deletion.proof }), env, 55006)).status, 200);
  assert.deepEqual(readFixtureNotionImport(replacement, host, env, fixtureNotionDocument.id, 55007), fixtureNotionDocument);
  for (const action of ['confirm', 'execute']) assert.equal((await handleFixtureIrConfirmation(post(replacement, { action, proposalId: deletion.proposalId }), env, 55008)).status, 200);
  assert.equal(readFixtureNotionImport(replacement, host, env, fixtureNotionDocument.id, 55009), null);
});

test('expired synthetic Notion deletion can be reissued once with a new review', async () => {
  const start = 2_000_000, cookie = login(start), other = login(start);
  const call = (who, body, now) => handleFixtureIrConfirmation(post(who, body), env, now);
  const imported = await (await call(cookie, { action: 'prepare', kind: 'notion' }, start + 1)).json();
  for (const action of ['review', 'confirm', 'execute']) assert.equal((await call(cookie, { action, proposalId: imported.proposalId }, start + 2)).status, 200);
  const original = await (await call(cookie, { action: 'prepare', kind: 'notion-delete' }, start + 3)).json();
  const before = await (await handleFixtureIrConfirmation(read(cookie, original.proposalId), env, start + 4)).json();
  const reissue = { action: 'reissue', proposalId: original.proposalId, proof: original.proof };
  assert.equal((await call(cookie, reissue, start + 4)).status, 409);
  const expired = start + 3 + 15 * 60_000;
  assert.equal((await handleFixtureIrConfirmation(read(cookie, original.proposalId), env, expired)).status, 404);
  assert.equal((await call(cookie, { action: 'review', proposalId: original.proposalId }, expired)).status, 404);
  assert.equal((await call(other, reissue, expired)).status, 404);
  assert.equal((await call(cookie, { ...reissue, proof: 'A'.repeat(43) }, expired)).status, 404);
  const responses = await Promise.all([call(cookie, reissue, expired), call(cookie, reissue, expired)]);
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
  const replacement = await responses.find(response => response.status === 200).json();
  assert.notEqual(replacement.proposalId, original.proposalId);
  const after = await (await handleFixtureIrConfirmation(read(cookie, replacement.proposalId), env, expired + 1)).json();
  assert.equal(after.canonical, before.canonical);
  assert.equal(after.state, 'loaded');
  assert.equal((await call(cookie, { action: 'execute', proposalId: replacement.proposalId }, expired + 1)).status, 409);
  for (const action of ['review', 'confirm', 'execute']) assert.equal((await call(cookie, { action, proposalId: replacement.proposalId }, expired + 2)).status, 200);
  assert.equal(readFixtureNotionImport(cookie, host, env, fixtureNotionDocument.id, expired + 3), null);
});

test('expired synthetic Notion proposals cannot reissue after source state changes or execution', async () => {
  const start = 4_000_000, cookie = login(start);
  const call = (body, now) => handleFixtureIrConfirmation(post(cookie, body), env, now);
  const prepare = async kind => (await call({ action: 'prepare', kind }, start + 1)).json();
  const apply = async proposal => { for (const action of ['review', 'confirm', 'execute']) assert.equal((await call({ action, proposalId: proposal.proposalId }, start + 2)).status, 200); };
  const imported = await prepare('notion'); await apply(imported);
  const stale = await prepare('notion-delete');
  const deletion = await prepare('notion-delete'); await apply(deletion);
  const restoration = await prepare('notion-restore'); await apply(restoration);
  const expired = start + 1 + 15 * 60_000;
  for (const proposal of [stale, deletion, imported]) assert.equal((await call({ action: 'reissue', proposalId: proposal.proposalId, proof: proposal.proof }, expired)).status, 409);
  assert.deepEqual(readFixtureNotionImport(cookie, host, env, fixtureNotionDocument.id, expired), fixtureNotionDocument);
  assert.equal((await call({ action: 'reissue', proposalId: stale.proposalId, proof: stale.proof }, start + 1 + 30 * 60_000)).status, 401);
});

test('expired synthetic Notion import and restoration each require a fresh approval', async () => {
  const start = 6_000_000, cookie = login(start);
  const call = (body, now) => handleFixtureIrConfirmation(post(cookie, body), env, now);
  const original = await (await call({ action: 'prepare', kind: 'notion' }, start + 1)).json();
  const firstExpiry = start + 1 + 15 * 60_000;
  const replacement = await (await call({ action: 'reissue', proposalId: original.proposalId, proof: original.proof }, firstExpiry)).json();
  for (const action of ['review', 'confirm', 'execute']) assert.equal((await call({ action, proposalId: replacement.proposalId }, firstExpiry + 1)).status, 200);
  const deletion = await (await call({ action: 'prepare', kind: 'notion-delete' }, firstExpiry + 2)).json();
  for (const action of ['review', 'confirm', 'execute']) assert.equal((await call({ action, proposalId: deletion.proposalId }, firstExpiry + 3)).status, 200);
  const restoration = await (await call({ action: 'prepare', kind: 'notion-restore' }, firstExpiry + 4)).json();
  const renewed = handleFixtureSession(new Request(`${origin}/login`, { method: 'POST', headers: { host, origin, cookie } }), 'login', env, firstExpiry + 5).headers.get('set-cookie').split(';')[0];
  const renewedCall = (body, now) => handleFixtureIrConfirmation(post(renewed, body), env, now);
  assert.equal((await renewedCall({ action: 'restore', proposalId: restoration.proposalId, proof: restoration.proof }, firstExpiry + 6)).status, 200);
  const restoreExpiry = firstExpiry + 4 + 15 * 60_000;
  const renewedProposal = await (await renewedCall({ action: 'reissue', proposalId: restoration.proposalId, proof: restoration.proof }, restoreExpiry)).json();
  assert.notEqual(renewedProposal.proposalId, restoration.proposalId);
  assert.equal((await renewedCall({ action: 'execute', proposalId: renewedProposal.proposalId }, restoreExpiry + 1)).status, 409);
  for (const action of ['review', 'confirm', 'execute']) assert.equal((await renewedCall({ action, proposalId: renewedProposal.proposalId }, restoreExpiry + 2)).status, 200);
  assert.deepEqual(readFixtureNotionImport(renewed, host, env, fixtureNotionDocument.id, restoreExpiry + 3), fixtureNotionDocument);
});

test('isolated cleanup keeps its deletion proof through synthetic login recovery', async () => {
  const old = login(60000);
  async function prepare(cookie, kind) { const response = await handleFixtureIrConfirmation(post(cookie, { action: 'prepare', kind }), env, 60001); assert.equal(response.status, 200); return response.json(); }
  async function apply(cookie, proposal) { for (const action of ['review', 'confirm', 'execute']) assert.equal((await handleFixtureIrConfirmation(post(cookie, { action, proposalId: proposal.proposalId }), env, 60002)).status, 200); }
  await apply(old, await prepare(old, 'single')); await apply(old, await prepare(old, 'reserve'));
  const file = new Request(`${origin}/upload`, { method: 'POST', headers: { host, origin, cookie: old, 'content-type': 'text/plain' }, body: fixtureIrExclusive.body });
  assert.equal((await handleFixtureIrExclusiveUpload(file, env, readFixtureIrReservation(old, host, env, '00000000-0000-4000-8000-000000000106', 60003), 60003)).status, 200);
  await apply(old, await prepare(old, 'isolated-attach')); await apply(old, await prepare(old, 'delete'));
  const cleanup = await prepare(old, 'cleanup');
  const replacement = handleFixtureSession(new Request(`${origin}/login`, { method: 'POST', headers: { host, origin, cookie: old } }), 'login', env, 60004).headers.get('set-cookie').split(';')[0];
  assert.equal((await handleFixtureIrConfirmation(post(replacement, { action: 'restore', proposalId: cleanup.proposalId, proof: cleanup.proof }), env, 60005)).status, 200);
  assert.deepEqual(readFixtureIrIsolatedObject(replacement, host, env, 60006), fixtureIrExclusive);
  await apply(replacement, cleanup);
  assert.equal(readFixtureIrIsolatedObject(replacement, host, env, 60007), null);
});
