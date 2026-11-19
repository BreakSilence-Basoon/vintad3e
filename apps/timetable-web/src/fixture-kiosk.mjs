import { randomBytes, randomUUID } from 'node:crypto';

const key = Symbol.for('vintad3e.timetable.fixture.kiosk');
const state = globalThis[key] ??= { devices: new Map(), challenges: new Map(), events: [], nextEvent: 'CHECK_IN' };

export function fixtureKioskOrigin(env) {
  if (env.NODE_ENV !== 'development' || env.VINTAD3E_TIMETABLE_FIXTURE !== '1') return null;
  const origin = env.VINTAD3E_TIMETABLE_FIXTURE_ORIGIN || 'http://127.0.0.1:3824';
  try { const url = new URL(origin); return url.origin === origin && url.protocol === 'http:' && url.hostname === '127.0.0.1' && !!url.port && !url.username && !url.password ? origin : null; } catch { return null; }
}

export async function handleFixtureKiosk(request, env, action, now = Date.now()) {
  const origin = fixtureKioskOrigin(env);
  const noStore = { 'cache-control': 'no-store' };
  if (!origin || request.headers.get('host') !== new URL(origin).host) return new Response(null, { status: 404, headers: noStore });
  if ((action === 'list' || action === 'events') && request.method === 'GET') {
    if (env.VINTAD3E_TIMETABLE_FIXTURE_ADMIN !== '1') return new Response(null, { status: 404, headers: noStore });
    return Response.json(action === 'list' ? { devices: [...state.devices.values()], limit: 5 } : { events: state.events }, { headers: noStore });
  }
  if (request.method !== 'POST' || request.headers.get('origin') !== origin) return new Response(null, { status: 403, headers: noStore });
  if (!['register', 'revoke', 'challenge', 'scan', 'correct', 'void'].includes(action)) return new Response(null, { status: 404, headers: noStore });
  if (['register', 'revoke', 'correct', 'void'].includes(action) && env.VINTAD3E_TIMETABLE_FIXTURE_ADMIN !== '1') return new Response(null, { status: 404, headers: noStore });
  if (Number(request.headers.get('content-length') || 0) > 4096) return new Response(null, { status: 413, headers: noStore });
  let data; try { data = await request.json(); } catch { return new Response(null, { status: 400, headers: noStore }); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return new Response(null, { status: 400, headers: noStore });
  if (action === 'correct' || action === 'void') {
    const event = typeof data.id === 'string' ? state.events.find(item => item.id === data.id) : null;
    const reason = typeof data.reason === 'string' ? data.reason.trim() : '';
    if (!event || reason.length < 3 || reason.length > 500 || /[\u0000-\u001f\u007f]/.test(reason)) return new Response(null, { status: 400, headers: noStore });
    if (action === 'void') { state.events = state.events.filter(item => item.id !== event.id); return new Response(null, { status: 204, headers: noStore }); }
    const recordedAt = typeof data.recordedAt === 'string' ? Date.parse(data.recordedAt) : NaN;
    if (!Number.isFinite(recordedAt) || new Date(recordedAt).toISOString() !== data.recordedAt || recordedAt > now) return new Response(null, { status: 400, headers: noStore });
    event.recordedAt = new Date(recordedAt).toISOString(); event.reason = reason;
    return Response.json(event, { headers: noStore });
  }
  if (action === 'register') {
    const label = typeof data.label === 'string' ? data.label.trim() : '';
    if (!label || label.length > 100 || /[\u0000-\u001f\u007f]/.test(label)) return new Response(null, { status: 400, headers: noStore });
    if (state.devices.size >= 5) return new Response(null, { status: 409, headers: noStore });
    const device = { id: randomUUID(), label };
    state.devices.set(device.id, device);
    return Response.json(device, { status: 201, headers: noStore });
  }
  if (action === 'revoke') {
    if (typeof data.id !== 'string' || !state.devices.delete(data.id)) return new Response(null, { status: 404, headers: noStore });
    for (const [token, challenge] of state.challenges) if (challenge.deviceId === data.id) state.challenges.delete(token);
    return new Response(null, { status: 204, headers: noStore });
  }
  for (const [token, challenge] of state.challenges) if (challenge.expiresAt <= now) state.challenges.delete(token);
  if (action === 'challenge') {
    const device = typeof data.id === 'string' ? state.devices.get(data.id) : null;
    if (!device) return new Response(null, { status: 404, headers: noStore });
    for (const [token, challenge] of state.challenges) if (challenge.deviceId === device.id) state.challenges.delete(token);
    const token = randomBytes(24).toString('base64url'), expiresAt = now + 30000;
    state.challenges.set(token, { deviceId: device.id, expiresAt });
    return Response.json({ token, expiresAt, device }, { headers: noStore });
  }
  const token = typeof data.token === 'string' && /^[\w-]{32}$/.test(data.token) ? data.token : null;
  const challenge = token ? state.challenges.get(token) : null;
  if (!challenge || !state.devices.has(challenge.deviceId)) return new Response(null, { status: 404, headers: noStore });
  state.challenges.delete(token);
  const eventType = state.nextEvent;
  state.nextEvent = eventType === 'CHECK_IN' ? 'CHECK_OUT' : 'CHECK_IN';
  const event = { id: randomUUID(), eventType, recordedAt: new Date(now).toISOString(), deviceLabel: state.devices.get(challenge.deviceId).label };
  state.events.unshift(event);
  if (state.events.length > 200) state.events.length = 200;
  return Response.json({ eventType }, { headers: noStore });
}
