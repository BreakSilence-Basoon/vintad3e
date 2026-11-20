import { createHash, randomUUID } from 'node:crypto';
import { fixtureOrigin, fixtureSessionKey } from './fixture-session.mjs';
import { getFixtureUpload } from './fixture-upload.mjs';
import { fixtureUpload } from './fixture-upload-spec.mjs';

const recordsKey = Symbol.for('vintad3e.library.fixture.meeting.confirmations');
const records = globalThis[recordsKey] ??= new Map();
const sha = value => createHash('sha256').update(value).digest('hex');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const text = (value, max) => typeof value === 'string' && value.length > 0 && value.length <= max && value === value.trim() && !/[\u0000-\u001f\u007f\p{Cf}\u2028\u2029]/u.test(value);
function validChange(change) {
  if (!change || typeof change !== 'object' || Array.isArray(change) || change.objectId !== fixtureUpload.id) return false;
  if (change.kind === 'attach') return Object.keys(change).sort().join(',') === 'kind,objectId';
  if (change.kind !== 'stage' || Object.keys(change).sort().join(',') !== 'kind,objectId,parentRevision,sourceDetail,sourceKind,step,title') return false;
  if (!['TRANSCRIPT', 'CORRECTED', 'SUMMARY'].includes(change.step) || !['IMPORTED', 'HUMAN', 'AI'].includes(change.sourceKind) || !text(change.title, 255) || !text(change.sourceDetail, 500)) return false;
  return change.step === 'TRANSCRIPT' ? change.parentRevision === null : Number.isSafeInteger(change.parentRevision) && change.parentRevision > 0 && change.parentRevision <= 30;
}
function view(record) {
  return { proposalId: record.id, meetingId: record.meetingId, change: record.change, canonical: record.canonical, changeDigest: record.changeDigest, permissionDigest: record.permissionDigest, checkedAt: record.checkedAt, expiresAt: record.expiresAt, state: record.state };
}
export async function handleFixtureMeetingConfirmation(request, env, now = Date.now()) {
  const origin = fixtureOrigin(env), host = request.headers.get('host');
  if (!origin || request.method !== 'POST' || host !== new URL(origin).host) return new Response(null, { status: 404 });
  const token = fixtureSessionKey(request.headers.get('cookie'), host, env, now);
  if (!token) return new Response(null, { status: 401 });
  if (request.headers.get('origin') !== origin) return new Response(null, { status: 403 });
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return new Response(null, { status: 400 });
  if (!request.body || Number(request.headers.get('content-length') ?? 0) > 4096) return new Response(null, { status: 413 });
  let body;
  const reader = request.body.getReader(), chunks = []; let size = 0;
  try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 4096) { await reader.cancel(); return new Response(null, { status: 413 }); } chunks.push(part.value); } body = JSON.parse(Buffer.concat(chunks.map(chunk => Buffer.from(chunk))).toString('utf8')); }
  catch { return new Response(null, { status: 400 }); } finally { reader.releaseLock(); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.action !== 'string') return new Response(null, { status: 400 });
  const session = sha(token);
  for (const [id, record] of records) if (record.expiresAt <= now) records.delete(id);
  let record;
  if (body.action === 'prepare') {
    if (Object.keys(body).sort().join(',') !== 'action,change,meetingId' || !uuid.test(body.meetingId) || !validChange(body.change) || !getFixtureUpload(request.headers.get('cookie'), host, env, now)) return new Response(null, { status: 400 });
    if (records.size >= 128) return new Response(null, { status: 503 });
    const canonical = JSON.stringify(body.change), id = randomUUID();
    record = { id, session, meetingId: body.meetingId, change: JSON.parse(canonical), canonical, changeDigest: sha(canonical), permissionDigest: sha(`fixture-session:${session}:allowed`), checkedAt: now, expiresAt: now + 15 * 60_000, state: 'proposal' };
    records.set(id, record);
  } else {
    if (Object.keys(body).sort().join(',') !== 'action,changeDigest,proposalId' || !uuid.test(body.proposalId) || !/^[a-f0-9]{64}$/.test(body.changeDigest)) return new Response(null, { status: 400 });
    record = records.get(body.proposalId);
    if (!record || record.session !== session || record.changeDigest !== body.changeDigest) return new Response(null, { status: 404 });
    const transitions = { load: ['proposal', 'loaded'], review: ['loaded', 'reviewed'], confirm: ['reviewed', 'confirmed'], execute: ['confirmed', 'executed'] };
    const transition = transitions[body.action];
    if (!transition || (record.state !== transition[0] && !(body.action === 'execute' && record.state === 'executed') && !(body.action === 'load' && ['loaded', 'reviewed', 'confirmed', 'executed'].includes(record.state)))) return new Response(null, { status: 409 });
    if (!(body.action === 'load' && record.state !== 'proposal')) record.state = transition[1];
  }
  return Response.json(view(record), { headers: { 'cache-control': 'no-store' } });
}
