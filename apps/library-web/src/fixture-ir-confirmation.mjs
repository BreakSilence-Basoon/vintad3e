import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { fixtureOrigin, fixtureSessionKey } from './fixture-session.mjs';
import { fixtureIrDocument, fixtureIrExample, fixtureIrManifests } from './fixture-ir-examples.mjs';
import { fixtureNotionDocument, fixtureNotionExample } from './fixture-notion-example.mjs';
import { getFixtureUpload, getFixtureUploadContentType } from './fixture-upload.mjs';
import { fixtureIrExclusive, moveFixtureIrExclusive, readFixtureIrExclusive, softDeleteFixtureIrExclusive } from './fixture-ir-exclusive.mjs';

const records = globalThis[Symbol.for('vintad3e.library.fixture.ir.confirmations')] ??= new Map();
const imports = globalThis[Symbol.for('vintad3e.library.fixture.ir.imports')] ??= new Map();
const deletedImports = globalThis[Symbol.for('vintad3e.library.fixture.ir.deleted')] ??= new Map();
const generations = globalThis[Symbol.for('vintad3e.library.fixture.ir.generations')] ??= new Map();
const reservations = globalThis[Symbol.for('vintad3e.library.fixture.ir.reservations')] ??= new Map();
const attachments = globalThis[Symbol.for('vintad3e.library.fixture.ir.attachments')] ??= new Map();
const revisions = globalThis[Symbol.for('vintad3e.library.fixture.ir.revisions')] ??= new Map();
const isolatedAttachments = globalThis[Symbol.for('vintad3e.library.fixture.ir.isolated-attachments')] ??= new Map();
const audits = globalThis[Symbol.for('vintad3e.library.fixture.ir.audits')] ??= new Map();
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
export function readFixtureIrAttachment(cookie, host, env, documentId, now = Date.now()) {
  const token = fixtureSessionKey(cookie, host, env, now), file = fixtureIrManifests.attachments.entries[0];
  if (!token || documentId !== fixtureIrDocument.id) return null;
  const session = sha(token), objectId = fixtureIrExample('attach').change.objectId;
  if (!(imports.get(session) > now) || !(attachments.get(session) > now)) return null;
  const object = getFixtureUpload(cookie, host, env, now, objectId);
  return object && object.filename === file.filename && Buffer.byteLength(object.body) === file.size && sha(object.body) === file.sha256 && getFixtureUploadContentType(cookie, host, env, now, objectId) === file.contentType ? object : null;
}
export function readFixtureIrIsolatedAttachment(cookie, host, env, documentId, now = Date.now()) {
  const token = fixtureSessionKey(cookie, host, env, now);
  if (!token || documentId !== fixtureIrDocument.id) return null;
  const session = sha(token);
  return imports.get(session) > now && isolatedAttachments.get(session) > now ? readFixtureIrExclusive(cookie, host, env, now) : null;
}
export function readFixtureIrIsolatedObject(cookie, host, env, now = Date.now()) {
  const token = fixtureSessionKey(cookie, host, env, now);
  if (!token) return null;
  const session = sha(token);
  return (imports.get(session) > now || deletedImports.get(session) > now) && isolatedAttachments.get(session) > now ? readFixtureIrExclusive(cookie, host, env, now) : null;
}

export async function handleFixtureIrConfirmation(request, env, now = Date.now()) {
  const origin = fixtureOrigin(env), host = request.headers.get('host');
  if (!origin || host !== new URL(origin).host || !['GET', 'POST'].includes(request.method)) return failure(404);
  const token = fixtureSessionKey(request.headers.get('cookie'), host, env, now);
  if (!token) return failure(401);
  if (request.method === 'POST' && request.headers.get('origin') !== origin) return failure(403);
  const session = sha(token);
  for (const [id, record] of records) if (record.expiresAt <= now) records.delete(id);
  for (const [key] of generations) if (!(imports.get(key) > now) && !(deletedImports.get(key) > now)) { generations.delete(key); revisions.delete(key); attachments.delete(key); isolatedAttachments.delete(key); audits.delete(key); }
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
    if (Object.keys(body).sort().join(',') !== 'action,kind' || !['single', 'batch', 'notion', 'delete', 'restore', 'reserve', 'batch-reserve', 'attach', 'isolated-attach', 'cleanup'].includes(body.kind)) return failure(400);
    if (body.kind === 'delete' && (!(imports.get(session) > now) || !Number.isSafeInteger(revisions.get(session)))) return failure(409);
    if (body.kind === 'restore' && (!(deletedImports.get(session) > now) || !Number.isSafeInteger(revisions.get(session)))) return failure(409);
    if (body.kind === 'batch-reserve' && (!(imports.get(session) > now) || !Number.isSafeInteger(revisions.get(session)))) return failure(409);
    if (body.kind === 'attach' && (!(imports.get(session) > now) || !Number.isSafeInteger(revisions.get(session)) || !(reservations.get(session) > now) || attachments.get(session) > now || !getFixtureUpload(request.headers.get('cookie'), host, env, now, fixtureIrExample('attach').change.objectId) || getFixtureUploadContentType(request.headers.get('cookie'), host, env, now, fixtureIrExample('attach').change.objectId) !== fixtureIrManifests.attachments.entries[0].contentType)) return failure(409);
    if (body.kind === 'isolated-attach' && (!(imports.get(session) > now) || !(reservations.get(session) > now) || isolatedAttachments.get(session) > now || !readFixtureIrExclusive(request.headers.get('cookie'), host, env, now))) return failure(409);
    const audit = audits.get(session);
    if (body.kind === 'cleanup' && (!(deletedImports.get(session) > now) || !(isolatedAttachments.get(session) > now) || !audit?.importProposalId || !audit?.deletionProposalId || audit.aclRevisionAfter !== revisions.get(session) || !readFixtureIrExclusive(request.headers.get('cookie'), host, env, now))) return failure(409);
    if (['delete', 'restore', 'attach', 'isolated-attach', 'cleanup', 'batch-reserve'].includes(body.kind) && (!Number.isSafeInteger(revisions.get(session)) || revisions.get(session) < 1 || revisions.get(session) > (body.kind === 'batch-reserve' ? 2147483146 : 2147483646))) return failure(409);
    if (records.size >= 128) return failure(503);
    const proof = randomBytes(32).toString('base64url'), template = body.kind === 'notion' ? fixtureNotionExample : body.kind === 'cleanup' ? { operation: 'library.ir.object-cleanup', target: 'ir-object-cleanup', change: {} } : fixtureIrExample(body.kind);
    const revision = revisions.get(session);
    const example = ['delete', 'restore'].includes(body.kind) ? { ...template, change: { ...template.change, revision } } : ['attach', 'isolated-attach'].includes(body.kind) ? { ...template, change: { ...template.change, expectedRevision: revision } } : body.kind === 'batch-reserve' ? { ...template, change: { ...template.change, entries: template.change.entries.map(entry => ({ ...entry, expectedRevision: revision })) } } : body.kind === 'cleanup' ? { ...template, change: { attachmentId: '00000000-0000-4000-8000-000000000105', importProposalId: audit.importProposalId, objectId: fixtureIrExclusive.id, pageId: fixtureIrDocument.id, revision: 1, rollbackDocuments: [{ documentId: fixtureIrDocument.id, deletionProposalId: audit.deletionProposalId, aclRevisionAfter: audit.aclRevisionAfter }] } } : template;
    const canonical = JSON.stringify(example.change);
    const file = fixtureIrManifests.attachments.entries[0];
    const summary = body.kind === 'batch' || body.kind === 'batch-reserve' ? { title: '가게 안내 기록', createdAt: '2025-12-30T00:00:00.000Z', sourceSha256: file.pageSha256, ...(body.kind === 'batch-reserve' ? { attachments: [{ attachmentId: file.attachmentId, name: file.filename, size: file.size, sha256: file.sha256 }] } : {}) } : null;
    const record = { id: randomUUID(), session, kind: body.kind, generation: ['delete', 'restore', 'attach', 'isolated-attach', 'cleanup', 'batch-reserve'].includes(body.kind) ? generations.get(session) : null, proofHash: createHash('sha256').update(proof).digest(), state: 'loaded', checkedAt: now, expiresAt: now + 15 * 60_000, example, summary, canonical, changeDigest: sha(canonical), permissionDigest: sha(`fixture-ir:${session}`) };
    records.set(record.id, record);
    return Response.json({ proposalId: record.id, kind: record.kind, proof }, { headers: { 'cache-control': 'no-store' } });
  }
  if (body.action === 'restore') {
    if (Object.keys(body).sort().join(',') !== 'action,proof,proposalId' || !uuid.test(body.proposalId) || typeof body.proof !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(body.proof)) return failure(400);
    const record = records.get(body.proposalId), digest = createHash('sha256').update(body.proof).digest();
    if (!record || !timingSafeEqual(record.proofHash, digest)) return failure(404);
    const maps = record.kind === 'notion' ? [notionImports] : [imports, deletedImports, reservations, attachments, isolatedAttachments];
    for (const applied of maps) { const importedUntil = applied.get(record.session); if (typeof importedUntil === 'number' && importedUntil > now) { applied.delete(record.session); applied.set(session, importedUntil); } }
    if (record.kind !== 'notion' && generations.has(record.session)) { const generation = generations.get(record.session); generations.delete(record.session); generations.set(session, generation); }
    if (record.kind !== 'notion' && revisions.has(record.session)) { const revision = revisions.get(record.session); revisions.delete(record.session); revisions.set(session, revision); }
    if (record.kind !== 'notion') { if (audits.has(record.session)) { const audit = audits.get(record.session); audits.delete(record.session); audits.set(session, audit); } moveFixtureIrExclusive(record.session, session, now); }
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
    for (const store of [imports, deletedImports, reservations, attachments, isolatedAttachments, notionImports]) for (const [key, expiresAt] of store) if (expiresAt <= now) store.delete(key);
    let bumpGeneration = false;
    if (record.kind === 'cleanup') {
      const audit = audits.get(session), proof = record.example.change, rollback = proof.rollbackDocuments[0];
      if (!(deletedImports.get(session) > now) || !(isolatedAttachments.get(session) > now) || record.generation !== generations.get(session) || !audit || audit.importProposalId !== proof.importProposalId || audit.deletionProposalId !== rollback.deletionProposalId || audit.aclRevisionAfter !== rollback.aclRevisionAfter || revisions.get(session) !== rollback.aclRevisionAfter || !softDeleteFixtureIrExclusive(request.headers.get('cookie'), host, env, proof.revision, now)) return failure(409);
      isolatedAttachments.delete(session);
    } else
    if (record.kind === 'isolated-attach') {
      const file = fixtureIrManifests.attachments.entries[0], object = readFixtureIrExclusive(request.headers.get('cookie'), host, env, now);
      if (!(imports.get(session) > now) || revisions.get(session) !== record.example.change.expectedRevision || !(reservations.get(session) > now) || isolatedAttachments.get(session) > now || record.generation !== generations.get(session) || !object || object.filename !== file.filename || Buffer.byteLength(object.body) !== file.size || sha(object.body) !== file.sha256) return failure(409);
      if (!isolatedAttachments.has(session) && isolatedAttachments.size >= 128) return failure(503);
      isolatedAttachments.set(session, imports.get(session)); revisions.set(session, record.example.change.expectedRevision + 1); bumpGeneration = true;
    } else if (record.kind === 'attach') {
      const file = fixtureIrManifests.attachments.entries[0], object = getFixtureUpload(request.headers.get('cookie'), host, env, now, record.example.change.objectId);
      if (!(imports.get(session) > now) || revisions.get(session) !== record.example.change.expectedRevision || !(reservations.get(session) > now) || attachments.get(session) > now || record.generation !== generations.get(session) || !object || object.filename !== file.filename || Buffer.byteLength(object.body) !== file.size || sha(object.body) !== file.sha256 || getFixtureUploadContentType(request.headers.get('cookie'), host, env, now, record.example.change.objectId) !== file.contentType) return failure(409);
      if (!attachments.has(session) && attachments.size >= 128) return failure(503);
      attachments.set(session, imports.get(session)); revisions.set(session, record.example.change.expectedRevision + 1); bumpGeneration = true;
    } else if (record.kind === 'delete' || record.kind === 'restore') {
      const from = record.kind === 'delete' ? imports : deletedImports, to = record.kind === 'delete' ? deletedImports : imports, expiresAt = from.get(session);
      if (typeof expiresAt !== 'number' || expiresAt <= now || !record.generation || record.generation !== generations.get(session) || revisions.get(session) !== record.example.change.revision) return failure(409);
      if (!to.has(session) && to.size >= 128) return failure(503);
      from.delete(session); to.set(session, expiresAt); revisions.set(session, record.example.change.revision + 1); bumpGeneration = true;
      if (record.kind === 'delete') audits.set(session, { ...audits.get(session), deletionProposalId: record.id, aclRevisionAfter: record.example.change.revision + 1 });
      else if (audits.has(session)) audits.set(session, { importProposalId: audits.get(session).importProposalId });
    } else {
      if (record.kind === 'batch-reserve' && (!(imports.get(session) > now) || record.generation !== generations.get(session) || revisions.get(session) !== record.example.change.entries[0].expectedRevision)) return failure(409);
      if (!applied.has(session) && applied.size >= 128) return failure(503);
      if (['single', 'batch'].includes(record.kind) && deletedImports.get(session) > now) return failure(409);
      const alreadyImported = ['single', 'batch'].includes(record.kind) && imports.get(session) > now;
      if (!alreadyImported) applied.set(session, now + 30 * 60_000);
      if (['single', 'batch'].includes(record.kind) && !alreadyImported) { revisions.set(session, 1); audits.set(session, { importProposalId: record.id }); bumpGeneration = true; }
    }
    if (bumpGeneration) generations.set(session, randomUUID());
  }
  record.state = next[1];
  return view(record);
}
