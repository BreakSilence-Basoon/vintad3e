import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { fixtureOrigin, fixtureSessionKey } from './fixture-session.mjs';
import { fixtureIrDocument, fixtureIrExample, fixtureIrManifests } from './fixture-ir-examples.mjs';
import { fixtureNotionDocument, fixtureNotionExample } from './fixture-notion-example.mjs';

const records = globalThis[Symbol.for('vintad3e.library.fixture.ir.confirmations')] ??= new Map();
const imports = globalThis[Symbol.for('vintad3e.library.fixture.ir.imports')] ??= new Map();
const deletedImports = globalThis[Symbol.for('vintad3e.library.fixture.ir.deleted')] ??= new Map();
const generations = globalThis[Symbol.for('vintad3e.library.fixture.ir.generations')] ??= new Map();
const reservations = globalThis[Symbol.for('vintad3e.library.fixture.ir.reservations')] ??= new Map();
const notionImports = globalThis[Symbol.for('vintad3e.library.fixture.notion.imports')] ??= new Map();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const sha = value => createHash('sha256').update(value).digest('hex');
const failure = status => Response.json({ error: status === 401 ? 'sign-in-required' : 'unavailable' }, { status, headers: { 'cache-control': 'no-store' } });
const view = record => Response.json({ proposalId: record.id, kind: record.kind, state: record.state, checkedAt: record.checkedAt, expiresAt: record.expiresAt, example: record.example, summary: record.summary, canonical: record.canonical, changeDigest: record.changeDigest, permissionDigest: record.permissionDigest }, { headers: { 'cache-control': 'no-store' } });

export function readFixtureIrImport(cookie, host, env, documentId, now = Date.now()) {
  const token = fixtureSessionKey(cookie, host, env, now);
  if (!token || documentId !== fixtureIrDocument.id) return null;
  const session = sha(token);
  const expiresAt = imports.get(session);
  if (typeof expiresAt !== 'number' || expiresAt <= now) { imports.delete(session); return null; }
  return fixtureIrDocument;
}
export function readFixtureNotionImport(cookie, host, env, documentId, now = Date.now()) {
  const token = fixtureSessionKey(cookie, host, env, now);
  if (!token || documentId !== fixtureNotionDocument.id) return null;
  const session = sha(token), expiresAt = notionImports.get(session);
  if (typeof expiresAt !== 'number' || expiresAt <= now) { notionImports.delete(session); return null; }
  return fixtureNotionDocument;
}
export function readFixtureIrReservation(cookie, host, env, uploadId, now = Date.now()) {
  const token = fixtureSessionKey(cookie, host, env, now);
  if (!token || uploadId !== fixtureIrExample('reserve').change.uploadId) return false;
  const session = sha(token), expiresAt = reservations.get(session);
  if (typeof expiresAt !== 'number' || expiresAt <= now) { reservations.delete(session); return false; }
  return true;
}

export async function handleFixtureIrConfirmation(request, env, now = Date.now()) {
  const origin = fixtureOrigin(env), host = request.headers.get('host');
  if (!origin || host !== new URL(origin).host || !['GET', 'POST'].includes(request.method)) return failure(404);
  const token = fixtureSessionKey(request.headers.get('cookie'), host, env, now);
  if (!token) return failure(401);
  if (request.method === 'POST' && request.headers.get('origin') !== origin) return failure(403);
  const session = sha(token);
  for (const [id, record] of records) if (record.expiresAt <= now) records.delete(id);
  for (const [key] of generations) if (!(imports.get(key) > now) && !(deletedImports.get(key) > now)) generations.delete(key);
  if (request.method === 'GET') {
    const id = new URL(request.url).searchParams.get('proposalId'), record = id && uuid.test(id) && records.get(id);
    return record && record.session === session ? view(record) : failure(404);
  }
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json' || !request.body || Number(request.headers.get('content-length') ?? 0) > 512) return failure(400);
  const reader = request.body.getReader(), chunks = []; let size = 0, body;
  try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 512) { await reader.cancel(); return failure(413); } chunks.push(part.value); } body = JSON.parse(Buffer.concat(chunks.map(chunk => Buffer.from(chunk))).toString('utf8')); }
  catch { return failure(400); } finally { reader.releaseLock(); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return failure(400);
  if (body.action === 'prepare') {
    if (Object.keys(body).sort().join(',') !== 'action,kind' || !['single', 'batch', 'notion', 'delete', 'restore', 'reserve', 'batch-reserve'].includes(body.kind)) return failure(400);
    if (body.kind === 'delete' && !(imports.get(session) > now)) return failure(409);
    if (body.kind === 'restore' && !(deletedImports.get(session) > now)) return failure(409);
    if (records.size >= 128) return failure(503);
    const proof = randomBytes(32).toString('base64url'), example = body.kind === 'notion' ? fixtureNotionExample : fixtureIrExample(body.kind), canonical = JSON.stringify(example.change);
    const file = fixtureIrManifests.attachments.entries[0];
    const summary = body.kind === 'batch' || body.kind === 'batch-reserve' ? { title: '가게 안내 기록', createdAt: '2025-12-30T00:00:00.000Z', sourceSha256: file.pageSha256, ...(body.kind === 'batch-reserve' ? { attachments: [{ attachmentId: file.attachmentId, name: file.filename, size: file.size, sha256: file.sha256 }] } : {}) } : null;
    const record = { id: randomUUID(), session, kind: body.kind, generation: ['delete', 'restore'].includes(body.kind) ? generations.get(session) : null, proofHash: createHash('sha256').update(proof).digest(), state: 'loaded', checkedAt: now, expiresAt: now + 15 * 60_000, example, summary, canonical, changeDigest: sha(canonical), permissionDigest: sha(`fixture-ir:${session}`) };
    records.set(record.id, record);
    return Response.json({ proposalId: record.id, kind: record.kind, proof }, { headers: { 'cache-control': 'no-store' } });
  }
  if (body.action === 'restore') {
    if (Object.keys(body).sort().join(',') !== 'action,proof,proposalId' || !uuid.test(body.proposalId) || typeof body.proof !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(body.proof)) return failure(400);
    const record = records.get(body.proposalId), digest = createHash('sha256').update(body.proof).digest();
    if (!record || !timingSafeEqual(record.proofHash, digest)) return failure(404);
    const maps = record.kind === 'notion' ? [notionImports] : [imports, deletedImports, reservations];
    for (const applied of maps) { const importedUntil = applied.get(record.session); if (typeof importedUntil === 'number' && importedUntil > now) { applied.delete(record.session); applied.set(session, importedUntil); } }
    if (record.kind !== 'notion' && generations.has(record.session)) { const generation = generations.get(record.session); generations.delete(record.session); generations.set(session, generation); }
    record.session = session; record.checkedAt = now; record.permissionDigest = sha(`fixture-ir:${session}`); return view(record);
  }
  if (Object.keys(body).sort().join(',') !== 'action,proposalId' || !uuid.test(body.proposalId)) return failure(400);
  const record = records.get(body.proposalId);
  if (!record || record.session !== session) return failure(404);
  const transitions = ['batch', 'batch-reserve'].includes(record.kind) ? { apply: ['loaded', 'executed'] } : { review: ['loaded', 'reviewed'], confirm: ['reviewed', 'approved'], execute: ['approved', 'executed'] };
  const next = Object.hasOwn(transitions, body.action) ? transitions[body.action] : null;
  if (!next || record.state !== next[0]) return failure(409);
  if (next[1] === 'executed') {
    const applied = record.kind === 'notion' ? notionImports : ['reserve', 'batch-reserve'].includes(record.kind) ? reservations : imports;
    for (const store of [applied, deletedImports]) for (const [key, expiresAt] of store) if (expiresAt <= now) store.delete(key);
    if (record.kind === 'delete' || record.kind === 'restore') {
      const from = record.kind === 'delete' ? imports : deletedImports, to = record.kind === 'delete' ? deletedImports : imports, expiresAt = from.get(session);
      if (typeof expiresAt !== 'number' || expiresAt <= now || !record.generation || record.generation !== generations.get(session)) return failure(409);
      if (!to.has(session) && to.size >= 128) return failure(503);
      from.delete(session); to.set(session, expiresAt);
    } else {
      if (!applied.has(session) && applied.size >= 128) return failure(503);
      applied.set(session, now + 30 * 60_000);
    }
    if (!['notion', 'reserve', 'batch-reserve'].includes(record.kind)) generations.set(session, randomUUID());
  }
  record.state = next[1];
  return view(record);
}
