import { createHash } from 'node:crypto';
import { fixtureOrigin, fixtureSessionKey } from './fixture-session.mjs';

export const fixtureIrExclusive = Object.freeze({ id: '00000000-0000-4000-8000-000000000108', filename: '가게 안내.txt', body: '업무를 시작하기 전에 필요한 사항을 확인합니다.' });
const records = globalThis[Symbol.for('vintad3e.library.fixture.ir.exclusive')] ??= new Map();
const sha = value => createHash('sha256').update(value).digest('hex');
function session(cookie, host, env, now) { const token = fixtureSessionKey(cookie, host, env, now); return token ? sha(token) : null; }

export function readFixtureIrExclusive(cookie, host, env, now = Date.now()) {
  const key = session(cookie, host, env, now), entry = key && records.get(key);
  return entry && entry.expiresAt > now && !entry.deleted ? fixtureIrExclusive : null;
}
export function softDeleteFixtureIrExclusive(cookie, host, env, expectedRevision, now = Date.now()) {
  const key = session(cookie, host, env, now), entry = key && records.get(key);
  if (!entry || entry.expiresAt <= now || entry.deleted || entry.revision !== expectedRevision) return false;
  entry.deleted = true; entry.revision += 1; return true;
}
export function moveFixtureIrExclusive(oldSession, newSession, now = Date.now()) {
  const entry = records.get(oldSession);
  if (entry && entry.expiresAt > now) { records.delete(oldSession); records.set(newSession, entry); }
}
export async function handleFixtureIrExclusiveUpload(request, env, reserved, now = Date.now()) {
  const origin = fixtureOrigin(env), host = request.headers.get('host');
  if (!origin || request.method !== 'POST' || host !== new URL(origin).host) return new Response(null, { status: 404 });
  const key = session(request.headers.get('cookie'), host, env, now);
  if (!key) return new Response(null, { status: 401 });
  if (request.headers.get('origin') !== origin) return new Response(null, { status: 403 });
  if (!reserved) return new Response(null, { status: 409 });
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'text/plain' || !request.body || Number(request.headers.get('content-length') ?? 0) > 256) return new Response(null, { status: 400 });
  const reader = request.body.getReader(), chunks = []; let size = 0;
  try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 256) { await reader.cancel(); return new Response(null, { status: 413 }); } chunks.push(part.value); } }
  catch { return new Response(null, { status: 400 }); } finally { reader.releaseLock(); }
  if (!Buffer.concat(chunks.map(chunk => Buffer.from(chunk))).equals(Buffer.from(fixtureIrExclusive.body))) return new Response(null, { status: 400 });
  for (const [id, entry] of records) if (entry.expiresAt <= now) records.delete(id);
  if (!records.has(key) && records.size >= 128) return new Response(null, { status: 503 });
  const existing = records.get(key);
  if (existing?.deleted) return new Response(null, { status: 409 });
  records.set(key, { expiresAt: now + 30 * 60_000, revision: 1, deleted: false });
  return Response.json({ id: fixtureIrExclusive.id }, { headers: { 'cache-control': 'no-store' } });
}
