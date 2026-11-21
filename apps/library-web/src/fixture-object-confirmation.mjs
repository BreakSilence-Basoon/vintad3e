import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { fixtureOrigin, fixtureSessionKey } from './fixture-session.mjs';
import { fixtureUploads } from './fixture-upload-spec.mjs';

const records = globalThis[Symbol.for('vintad3e.library.fixture.object.confirmations')] ??= new Map();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const fail = status => Response.json({ error: status === 401 ? 'sign-in-required' : 'unavailable' }, { status, headers: { 'cache-control': 'no-store' } });
const view = record => Response.json({ proposalId: record.id, objectId: record.objectId, state: record.state, expiresAt: record.expiresAt }, { headers: { 'cache-control': 'no-store' } });

export async function handleFixtureObjectConfirmation(request, env, now = Date.now()) {
  const origin = fixtureOrigin(env), host = request.headers.get('host');
  if (!origin || host !== new URL(origin).host || !['GET', 'POST'].includes(request.method)) return fail(404);
  const token = fixtureSessionKey(request.headers.get('cookie'), host, env, now);
  if (!token) return fail(401);
  if (request.method === 'POST' && request.headers.get('origin') !== origin) return fail(403);
  const session = createHash('sha256').update(token).digest('hex');
  for (const [id, record] of records) if (record.expiresAt <= now) records.delete(id);
  if (request.method === 'GET') {
    const id = new URL(request.url).searchParams.get('proposalId');
    const record = id && uuid.test(id) && records.get(id);
    return record && record.session === session ? view(record) : fail(404);
  }
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json' || !request.body || Number(request.headers.get('content-length') ?? 0) > 512) return fail(400);
  const reader = request.body.getReader(), chunks = []; let size = 0, body;
  try {
    while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 512) { await reader.cancel(); return fail(413); } chunks.push(part.value); }
    body = JSON.parse(Buffer.concat(chunks.map(chunk => Buffer.from(chunk))).toString('utf8'));
  } catch { return fail(400); } finally { reader.releaseLock(); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(400);
  if (body.action === 'prepare') {
    if (Object.keys(body).sort().join(',') !== 'action,objectId' || !fixtureUploads.some(item => item.id === body.objectId)) return fail(400);
    if (records.size >= 128) return fail(503);
    const proof = randomBytes(32).toString('base64url');
    const record = { id: randomUUID(), session, proofHash: createHash('sha256').update(proof).digest(), objectId: body.objectId, state: 'loaded', expiresAt: now + 15 * 60_000 };
    records.set(record.id, record);
    return Response.json({ proposalId: record.id, objectId: record.objectId, state: record.state, expiresAt: record.expiresAt, proof }, { headers: { 'cache-control': 'no-store' } });
  }
  if (body.action === 'restore') {
    if (Object.keys(body).sort().join(',') !== 'action,proof,proposalId' || !uuid.test(body.proposalId) || typeof body.proof !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(body.proof)) return fail(400);
    const record = records.get(body.proposalId), digest = createHash('sha256').update(body.proof).digest();
    if (!record || !timingSafeEqual(record.proofHash, digest)) return fail(404);
    record.session = session; return view(record);
  }
  if (Object.keys(body).sort().join(',') !== 'action,proposalId' || !uuid.test(body.proposalId)) return fail(400);
  const record = records.get(body.proposalId);
  if (!record || record.session !== session) return fail(404);
  if (body.action === 'load') return view(record);
  const transitions = { load: ['loaded', 'loaded'], review: ['loaded', 'reviewed'], confirm: ['reviewed', 'confirmed'] };
  const next = transitions[body.action];
  if (!next || record.state !== next[0]) return fail(409);
  record.state = next[1]; return view(record);
}
