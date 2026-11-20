import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { handleFixtureSession } from './fixture-session.mjs';
import { handleFixtureUpload } from './fixture-upload.mjs';
import { fixtureCorrectedUpload, fixtureUpload } from './fixture-upload-spec.mjs';
import { handleFixtureMeetingConfirmation } from './fixture-meeting-confirmation.mjs';

const origin = 'http://127.0.0.1:3829', host = '127.0.0.1:3829';
const env = { NODE_ENV: 'development', VINTAD3E_LIBRARY_FIXTURE: '1' };
const meetingId = '00000000-0000-4000-8000-000000000004';
function request(path, body, cookie, requestOrigin = origin) { return new Request(`${origin}${path}`, { method: 'POST', headers: { host, origin: requestOrigin, 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) }); }
function login() { return handleFixtureSession(new Request(`${origin}/api/fixture/login`, { method: 'POST', headers: { host, origin } }), 'login', env).headers.get('set-cookie').split(';')[0]; }

test('fixture meeting confirmation enforces session, frozen changes and ordered approval', async () => {
  const cookie = login(), change = { kind: 'attach', objectId: fixtureUpload.id };
  const prepare = { action: 'prepare', meetingId, change };
  assert.equal((await handleFixtureMeetingConfirmation(request('/api/fixture/meeting-confirmation', prepare), env)).status, 401);
  assert.equal((await handleFixtureMeetingConfirmation(request('/api/fixture/meeting-confirmation', prepare, cookie, 'https://else.invalid'), env)).status, 403);
  assert.equal((await handleFixtureMeetingConfirmation(request('/api/fixture/meeting-confirmation', prepare, cookie), env)).status, 400);
  const upload = new Request(`${origin}/api/fixture/upload`, { method: 'POST', headers: { host, origin, cookie, 'content-type': 'application/octet-stream' }, body: fixtureUpload.body });
  assert.equal((await handleFixtureUpload(upload, env)).status, 200);
  const response = await handleFixtureMeetingConfirmation(request('/api/fixture/meeting-confirmation', prepare, cookie), env);
  assert.equal(response.status, 200);
  const proposal = await response.json();
  assert.equal(proposal.canonical, JSON.stringify(change));
  assert.equal(proposal.changeDigest, createHash('sha256').update(proposal.canonical).digest('hex'));
  const send = (action, overrides = {}) => handleFixtureMeetingConfirmation(request('/api/fixture/meeting-confirmation', { action, proposalId: proposal.proposalId, changeDigest: proposal.changeDigest, ...overrides }, cookie), env);
  assert.equal((await send('confirm')).status, 409);
  assert.equal((await send('load', { changeDigest: '0'.repeat(64) })).status, 404);
  assert.equal((await send('load')).status, 200);
  assert.equal((await send('review')).status, 200);
  assert.equal((await (await send('load')).json()).state, 'reviewed');
  assert.equal((await send('confirm')).status, 200);
  assert.equal((await send('execute')).status, 200);
  assert.equal((await send('execute')).status, 200);
  assert.equal((await handleFixtureMeetingConfirmation(request('/api/fixture/meeting-confirmation', { action: 'load', proposalId: proposal.proposalId, changeDigest: proposal.changeDigest }, login()), env)).status, 404);
  assert.equal((await handleFixtureMeetingConfirmation(request('/api/fixture/meeting-confirmation', { action: 'load', proposalId: proposal.proposalId, changeDigest: proposal.changeDigest }, cookie), env, proposal.expiresAt + 1)).status, 404);
  assert.equal((await handleFixtureMeetingConfirmation(request('/api/fixture/meeting-confirmation', { ...prepare, change: { kind: 'stage', objectId: fixtureUpload.id, step: 'TRANSCRIPT', title: '\u202eunsafe', sourceKind: 'IMPORTED', sourceDetail: '회의', parentRevision: null } }, cookie), env)).status, 400);
  assert.equal((await handleFixtureMeetingConfirmation(request('/api/fixture/meeting-confirmation', { action: 'prepare', meetingId, change: 'x'.repeat(5000) }, cookie), env)).status, 413);
});

test('corrected fixture must be uploaded in the same synthetic session', async () => {
  const cookie = login(), other = login();
  const change = { kind: 'stage', objectId: fixtureCorrectedUpload.id, step: 'CORRECTED', title: '회의 보정', sourceKind: 'HUMAN', sourceDetail: '회의 기록', parentRevision: 1 };
  const prepare = { action: 'prepare', meetingId, change };
  assert.equal((await handleFixtureMeetingConfirmation(request('/api/fixture/meeting-confirmation', prepare, cookie), env)).status, 400);
  const upload = new Request(`${origin}/api/fixture/upload`, { method: 'POST', headers: { host, origin, cookie, 'content-type': 'application/octet-stream' }, body: fixtureCorrectedUpload.body });
  assert.equal((await handleFixtureUpload(upload, env)).status, 200);
  assert.equal((await handleFixtureMeetingConfirmation(request('/api/fixture/meeting-confirmation', prepare, other), env)).status, 400);
  assert.equal((await handleFixtureMeetingConfirmation(request('/api/fixture/meeting-confirmation', prepare, cookie), env)).status, 200);
  assert.equal((await handleFixtureMeetingConfirmation(request('/api/fixture/meeting-confirmation', { ...prepare, change: { kind: 'attach', objectId: fixtureCorrectedUpload.id } }, cookie), env)).status, 400);
});
