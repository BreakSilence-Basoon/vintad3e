import { createHash } from 'node:crypto';
import { fixtureOrigin, fixtureSessionKey } from './fixture-session.mjs';
import { confirmationAvailable, nextConfirmationState } from './fixture-confirmation.mjs';

const key = Symbol.for('vintad3e.portal.fixture.confirmations');
const records = globalThis[key] ??= new Map();

export async function handleFixtureConfirmation(request, env, now = Date.now()) {
  const origin = fixtureOrigin(env), host = request.headers.get('host');
  if (!origin || host !== new URL(origin).host || !['GET', 'POST'].includes(request.method)) return new Response(null, { status: 404 });
  const token = fixtureSessionKey(request.headers.get('cookie'), host, env, now);
  if (!token) return new Response(null, { status: 401 });
  if (request.method === 'POST' && request.headers.get('origin') !== origin) return new Response(null, { status: 403 });
  for (const [id, item] of records) if (item.started + 30 * 60_000 <= now) records.delete(id);
  const id = createHash('sha256').update(token).digest('hex');
  let record = records.get(id);
  if (!record) {
    if (records.size >= 128) return new Response(null, { status: 503 });
    record = { state: 'idle', started: now, proposalExpiry: now + 15 * 60_000, presentationExpiry: now + 15 * 60_000 };
    records.set(id, record);
  }
  if (request.method === 'POST') {
    if (Number(request.headers.get('content-length') ?? 0) > 512) return new Response(null, { status: 413 });
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json' || !request.body) return new Response(null, { status: 400 });
    const reader = request.body.getReader();
    let size = 0, body = '';
    const decoder = new TextDecoder();
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > 512) { await reader.cancel(); return new Response(null, { status: 413 }); }
        body += decoder.decode(part.value, { stream: true });
      }
      body += decoder.decode();
    } catch { return new Response(null, { status: 400 }); }
    finally { reader.releaseLock(); }
    let payload;
    try { payload = JSON.parse(body); } catch { return new Response(null, { status: 400 }); }
    if (!payload || Object.keys(payload).length !== 1 || !['load', 'review', 'confirm'].includes(payload.action)) return new Response(null, { status: 400 });
    if (payload.action === 'review' && !confirmationAvailable(now, record.proposalExpiry)) return new Response(null, { status: 409 });
    if (payload.action === 'confirm' && !confirmationAvailable(now, record.proposalExpiry, record.presentationExpiry)) return new Response(null, { status: 409 });
    const next = nextConfirmationState(record.state, payload.action);
    if (next === record.state && !(payload.action === 'load' && ['loaded', 'approved'].includes(record.state))) return new Response(null, { status: 409 });
    if (payload.action === 'review') record.presentationExpiry = Math.min(now + 5 * 60_000, record.proposalExpiry);
    record.state = next;
  }
  return Response.json(record, { headers: { 'cache-control': 'no-store' } });
}
