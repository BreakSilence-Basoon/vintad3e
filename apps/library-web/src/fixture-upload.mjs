import { createHash } from 'node:crypto';
import { fixtureOrigin, fixtureSessionKey } from './fixture-session.mjs';
import { fixtureUpload, fixtureUploads } from './fixture-upload-spec.mjs';

const key = Symbol.for('vintad3e.library.fixture.uploads');
const records = globalThis[key] ??= new Map();
function identity(cookie, host, env, now) {
  const token = fixtureSessionKey(cookie, host, env, now);
  return token ? createHash('sha256').update(token).digest('hex') : null;
}
/** @param {string} objectId */
export function getFixtureUpload(cookie, host, env, now = Date.now(), objectId = fixtureUpload.id) {
  const id = identity(cookie, host, env, now);
  const entry = id && records.get(id);
  const stored = entry instanceof Map ? entry.get(objectId) : objectId === fixtureUpload.id ? entry : null;
  const created = typeof stored === 'number' ? stored : stored?.created;
  return typeof created === 'number' && created + 30 * 60_000 > now ? fixtureUploads.find(item => item.id === objectId) ?? null : null;
}
export function getFixtureUploadContentType(cookie, host, env, now = Date.now(), objectId = fixtureUpload.id) {
  const id = identity(cookie, host, env, now), entry = id && records.get(id);
  const stored = entry instanceof Map ? entry.get(objectId) : null;
  return stored && typeof stored === 'object' && stored.created + 30 * 60_000 > now && typeof stored.contentType === 'string' ? stored.contentType : null;
}
export function listFixtureUploads(cookie, host, env, now = Date.now()) {
  return fixtureUploads.map(item => getFixtureUpload(cookie, host, env, now, item.id)).filter(Boolean);
}
export async function handleFixtureUpload(request, env, now = Date.now()) {
  const origin = fixtureOrigin(env), host = request.headers.get('host');
  if (!origin || host !== new URL(origin).host || request.method !== 'POST') return new Response(null, { status: 404 });
  const id = identity(request.headers.get('cookie'), host, env, now);
  if (!id) return new Response(null, { status: 401 });
  if (request.headers.get('origin') !== origin) return new Response(null, { status: 403 });
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/octet-stream' || !request.body) return new Response(null, { status: 400 });
  const contentType = request.headers.get('x-vintad3e-content-type');
  if (contentType !== null && (contentType.length > 255 || !/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(contentType))) return new Response(null, { status: 400 });
  const maximum = Math.max(...fixtureUploads.map(item => Buffer.byteLength(item.body)));
  if (Number(request.headers.get('content-length') ?? 0) > maximum) return new Response(null, { status: 413 });
  const reader = request.body.getReader(); let count = 0; const chunks = [];
  try { while (true) { const part = await reader.read(); if (part.done) break; count += part.value.byteLength; if (count > maximum) { await reader.cancel(); return new Response(null, { status: 413 }); } chunks.push(part.value); } }
  catch { return new Response(null, { status: 400 }); } finally { reader.releaseLock(); }
  const actual = Buffer.concat(chunks.map(part => Buffer.from(part)));
  const fixture = fixtureUploads.find(item => actual.equals(Buffer.from(item.body)));
  if (!fixture) return new Response(null, { status: 400 });
  for (const [record, value] of records) {
    const entries = value instanceof Map ? value : new Map([[fixtureUpload.id, value]]);
    for (const [objectId, stored] of entries) { const created = typeof stored === 'number' ? stored : stored?.created; if (typeof created !== 'number' || created + 30 * 60_000 <= now) entries.delete(objectId); }
    if (entries.size) records.set(record, entries); else records.delete(record);
  }
  if (!records.has(id) && records.size >= 128) return new Response(null, { status: 503 });
  const entries = records.get(id) ?? new Map();
  entries.set(fixture.id, { created: now, contentType }); records.set(id, entries);
  return Response.json({ id: fixture.id }, { headers: { 'cache-control': 'no-store' } });
}
