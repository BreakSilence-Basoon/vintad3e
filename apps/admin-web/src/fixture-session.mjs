import { randomBytes } from 'node:crypto';

const cookieName = 'vintad3e-admin-fixture';
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
const key = Symbol.for('vintad3e.admin.fixture.sessions');
const sessions = globalThis[key] ??= new Map();
const ttl = 30 * 60 * 1000;

export function fixtureOrigin(env) {
  if (env.NODE_ENV !== 'development' || env.VINTAD3E_ADMIN_FIXTURE !== '1') return null;
  const value = env.VINTAD3E_ADMIN_FIXTURE_ORIGIN || 'http://127.0.0.1:3832';
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && url.hostname === '127.0.0.1' && url.port && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash && url.origin === value ? value : null;
  } catch { return null; }
}
function readToken(header) {
  if (!header) return null;
  const entries = header.split(';').map(part => part.trim()).filter(part => part.startsWith(`${cookieName}=`));
  if (entries.length !== 1) return null;
  const value = entries[0].slice(cookieName.length + 1);
  return tokenPattern.test(value) ? value : null;
}
function prune(now) { for (const [token, expires] of sessions) if (expires <= now) sessions.delete(token); }
export function fixtureSession(cookie, host, env, now = Date.now()) {
  const origin = fixtureOrigin(env);
  if (!origin || host !== new URL(origin).host) return false;
  const token = readToken(cookie); prune(now);
  return token !== null && sessions.has(token);
}
export function handleFixtureSession(request, action, env, now = Date.now()) {
  const origin = fixtureOrigin(env);
  if (!origin || request.method !== 'POST' || !['login', 'logout'].includes(action)) return new Response(null, { status: 404, headers: { 'cache-control': 'no-store' } });
  // Next can normalize request.url's host; Host and Origin must both match the configured loopback origin.
  if (request.headers.get('host') !== new URL(origin).host || request.headers.get('origin') !== origin) return new Response(null, { status: 403, headers: { 'cache-control': 'no-store' } });
  prune(now);
  const previous = readToken(request.headers.get('cookie'));
  if (previous) sessions.delete(previous);
  let cookie = `${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
  if (action === 'login') {
    if (sessions.size >= 128) return new Response(null, { status: 503, headers: { 'cache-control': 'no-store' } });
    const token = randomBytes(32).toString('base64url');
    sessions.set(token, now + ttl);
    cookie = `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ttl / 1000}`;
  }
  return new Response(null, { status: 303, headers: { location: action === 'login' ? '/' : '/sign-in', 'set-cookie': cookie, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } });
}
