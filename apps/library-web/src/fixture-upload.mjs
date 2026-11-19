import { createHash } from 'node:crypto';
import { fixtureOrigin, fixtureSessionKey } from './fixture-session.mjs';
import { fixtureUpload } from './fixture-upload-spec.mjs';

const key = Symbol.for('vintad3e.library.fixture.uploads');
const records = globalThis[key] ??= new Map();
function identity(cookie, host, env, now) {
  const token = fixtureSessionKey(cookie, host, env, now);
  return token ? createHash('sha256').update(token).digest('hex') : null;
}
export function getFixtureUpload(cookie, host, env, now = Date.now()) {
  const id = identity(cookie, host, env, now);
  return id && records.has(id) ? fixtureUpload : null;
}
export async function handleFixtureUpload(request, env, now = Date.now()) {
  const origin = fixtureOrigin(env), host = request.headers.get('host');
  if (!origin || host !== new URL(origin).host || request.method !== 'POST') return new Response(null, { status: 404 });
  const id = identity(request.headers.get('cookie'), host, env, now);
  if (!id) return new Response(null, { status: 401 });
  if (request.headers.get('origin') !== origin) return new Response(null, { status: 403 });
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/octet-stream' || !request.body) return new Response(null, { status: 400 });
  const expected = new TextEncoder().encode(fixtureUpload.body);
  if (Number(request.headers.get('content-length') ?? 0) > expected.length) return new Response(null, { status: 413 });
  const reader = request.body.getReader(); let count = 0; const chunks = [];
  try { while (true) { const part = await reader.read(); if (part.done) break; count += part.value.byteLength; if (count > expected.length) { await reader.cancel(); return new Response(null, { status: 413 }); } chunks.push(part.value); } }
  catch { return new Response(null, { status: 400 }); } finally { reader.releaseLock(); }
  const actual = Buffer.concat(chunks.map(part => Buffer.from(part)));
  if (!actual.equals(Buffer.from(expected))) return new Response(null, { status: 400 });
  for (const [record, created] of records) if (created + 30 * 60_000 <= now) records.delete(record);
  if (!records.has(id) && records.size >= 128) return new Response(null, { status: 503 });
  records.set(id, now);
  return Response.json({ id: fixtureUpload.id }, { headers: { 'cache-control': 'no-store' } });
}
