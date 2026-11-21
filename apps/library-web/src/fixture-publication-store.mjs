import { createHash } from 'node:crypto';
import { fixtureOrigin, fixtureSessionKey } from './fixture-session.mjs';

const publicationSymbol = Symbol.for('vintad3e.library.fixture.publications');
const records = globalThis[publicationSymbol] ??= new Map();
const failure = (status, error = 'unavailable') => Response.json({ error }, { status, headers: { 'cache-control': 'no-store' } });

export async function handleFixturePublication(request, env, now = Date.now()) {
  const origin = fixtureOrigin(env), host = request.headers.get('host');
  if (!origin || host !== new URL(origin).host || !['GET', 'POST'].includes(request.method)) return failure(404);
  const session = fixtureSessionKey(request.headers.get('cookie'), host, env, now);
  if (!session) return failure(401, 'sign-in-required');
  if (request.method === 'POST' && request.headers.get('origin') !== origin) return failure(403, 'denied');
  for (const [id, item] of records) if (item.started + 30 * 60_000 <= now) records.delete(id);
  const id = createHash('sha256').update(session).digest('hex');
  let record = records.get(id);
  if (!record) {
    if (records.size >= 128) return failure(503);
    record = { state: 'loaded', started: now, expiresAt: now + 15 * 60_000 };
    records.set(id, record);
  }
  if (request.method === 'POST') {
    if (Number(request.headers.get('content-length') ?? 0) > 512 || !request.body) return failure(400);
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return failure(400);
    const reader = request.body.getReader(), decoder = new TextDecoder();
    let size = 0, body = '';
    try {
      while (true) {
        const part = await reader.read(); if (part.done) break;
        size += part.value.byteLength; if (size > 512) { await reader.cancel(); return failure(413); }
        body += decoder.decode(part.value, { stream: true });
      }
      body += decoder.decode();
    } catch { return failure(400); } finally { reader.releaseLock(); }
    let payload;
    try { payload = JSON.parse(body); } catch { return failure(400); }
    if (!payload || Object.keys(payload).length !== 1 || !['review', 'confirm', 'publish'].includes(payload.action)) return failure(400, 'invalid-request');
    if (now >= record.expiresAt && record.state !== 'published') return failure(409, 'changed');
    const transitions = { review: ['loaded', 'reviewed'], confirm: ['reviewed', 'approved'], publish: ['approved', 'published'] };
    const transition = transitions[payload.action];
    if (payload.action === 'publish' && record.state === 'published') return Response.json(record, { headers: { 'cache-control': 'no-store' } });
    if (record.state !== transition[0]) return failure(409, 'changed');
    record.state = transition[1];
  }
  return Response.json(record, { headers: { 'cache-control': 'no-store' } });
}
