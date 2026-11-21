import { createHash } from 'node:crypto';
import { fixtureOrigin, fixtureSessionKey } from './fixture-session.mjs';
import { confirmationAvailable, nextConfirmationState } from './fixture-confirmation.mjs';

const confirmationSymbol = Symbol.for('vintad3e.timetable.fixture.confirmations');
const records = globalThis[confirmationSymbol] ??= new Map();
const failure = (status, error) => Response.json({ error }, { status, headers: { 'cache-control': 'no-store' } });

export async function handleFixtureConfirmation(request, env, now = Date.now()) {
  const origin = fixtureOrigin(env), host = request.headers.get('host');
  if (!origin || host !== new URL(origin).host || !['GET', 'POST'].includes(request.method)) return failure(404, 'unavailable');
  const token = fixtureSessionKey(request.headers.get('cookie'), host, env, now);
  if (!token) return failure(401, 'sign-in-required');
  if (request.method === 'POST' && request.headers.get('origin') !== origin) return failure(403, 'denied');
  for (const [id, item] of records) if (item.started + 30 * 60_000 <= now) records.delete(id);
  const id = createHash('sha256').update(token).digest('hex');
  let record = records.get(id);
  if (!record) {
    if (records.size >= 128) return failure(503, 'unavailable');
    record = { state: 'idle', started: now, proposalExpiry: now + 15 * 60_000, presentationExpiry: now + 15 * 60_000 };
    records.set(id, record);
  }
  if (request.method === 'POST') {
    if (Number(request.headers.get('content-length') ?? 0) > 512) return failure(413, 'invalid-request');
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json' || !request.body) return failure(400, 'invalid-request');
    const reader = request.body.getReader();
    let size = 0, body = '';
    const decoder = new TextDecoder();
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > 512) { await reader.cancel(); return failure(413, 'invalid-request'); }
        body += decoder.decode(part.value, { stream: true });
      }
      body += decoder.decode();
    } catch { return failure(400, 'invalid-request'); }
    finally { reader.releaseLock(); }
    let payload;
    try { payload = JSON.parse(body); } catch { return failure(400, 'invalid-request'); }
    if (!payload || Object.keys(payload).length !== 1 || !['load', 'review', 'confirm'].includes(payload.action)) return failure(400, 'invalid-request');
    if (payload.action === 'review' && !confirmationAvailable(now, record.proposalExpiry)) return failure(409, 'changed');
    if (payload.action === 'confirm' && !confirmationAvailable(now, record.proposalExpiry, record.presentationExpiry)) return failure(409, 'changed');
    const next = nextConfirmationState(record.state, payload.action);
    if (next === record.state && !(payload.action === 'load' && ['loaded', 'approved'].includes(record.state))) return failure(409, 'changed');
    if (payload.action === 'review') record.presentationExpiry = Math.min(now + 5 * 60_000, record.proposalExpiry);
    record.state = next;
  }
  return Response.json(record, { headers: { 'cache-control': 'no-store' } });
}
