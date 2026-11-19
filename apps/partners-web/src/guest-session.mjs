import { randomBytes } from 'node:crypto';

const key = Symbol.for('vintad3e.partners.guest.sessions');
const sessions = globalThis[key] ??= new Map();
const cookieName = 'vintad3e-partners-guest';
const lifetime = 30 * 60 * 1000;
const partners = new Set(['partner-01', 'partner-02']);

export function guestOrigin(env) {
  if (env.NODE_ENV !== 'development' || env.VINTAD3E_PARTNERS_FIXTURE !== '1') return null;
  const origin = env.VINTAD3E_PARTNERS_FIXTURE_ORIGIN || 'http://127.0.0.1:3828';
  try { const url = new URL(origin); return url.origin === origin && url.protocol === 'http:' && url.hostname === '127.0.0.1' && !!url.port && !url.username && !url.password ? origin : null; }
  catch { return null; }
}
function tokenFromCookie(cookie) {
  const entries = (cookie ?? '').split(';').map(part => part.trim()).filter(part => part.startsWith(`${cookieName}=`));
  if (entries.length !== 1) return null;
  const value = entries[0].slice(cookieName.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}
function prune(now) { for (const [key, value] of sessions) if (value.expires <= now) sessions.delete(key); }
export function guestSession(cookie, host, env, partner, now = Date.now()) {
  const origin = guestOrigin(env);
  if (!origin || host !== new URL(origin).host || !partners.has(partner)) return false;
  prune(now);
  const token = tokenFromCookie(cookie);
  return token !== null && sessions.get(token)?.partner === partner;
}
export function guestSessionAction(request, env, partner, action, now = Date.now()) {
  const origin = guestOrigin(env);
  if (!origin || !partners.has(partner) || !['login', 'logout'].includes(action) || request.method !== 'POST') return new Response(null, { status: 404 });
  if (request.headers.get('host') !== new URL(origin).host || request.headers.get('origin') !== origin) return new Response(null, { status: 403 });
  prune(now);
  const old = tokenFromCookie(request.headers.get('cookie'));
  if (old) sessions.delete(old);
  let cookie = `${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
  if (action === 'login') {
    if (sessions.size >= 128) return new Response(null, { status: 503 });
    const token = randomBytes(32).toString('base64url');
    sessions.set(token, { partner, expires: now + lifetime });
    cookie = `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${lifetime / 1000}`;
  }
  return new Response(null, { status: 303, headers: { location: `/proj-bedroom/${partner}/${action === 'login' ? 'guest' : 'sign-in'}`, 'set-cookie': cookie, 'cache-control': 'no-store' } });
}
