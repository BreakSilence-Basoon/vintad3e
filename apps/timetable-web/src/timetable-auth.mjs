const loginName = '__Host-vintad3e-login';
const sessionName = '__Host-vintad3e-session';
const token = /^[A-Za-z0-9_-]{43}$/;
const headers = { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff' };
const fail = (status, error) => Response.json({ error }, { status, headers });

function loopbackOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && url.hostname === '127.0.0.1' && url.port && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash && value === url.origin ? url.origin : null;
  } catch { return null; }
}

function selectedCookies(header) {
  const found = new Map();
  for (const part of (header ?? '').split(';')) {
    const [name, ...values] = part.trim().split('=');
    if (name !== loginName && name !== sessionName) continue;
    if (found.has(name) || values.length !== 1 || !token.test(values[0])) return null;
    found.set(name, values[0]);
  }
  return [...found].map(([name, value]) => `${name}=${value}`).join('; ');
}

function validResponseCookie(value) {
  const match = /^(__Host-vintad3e-(?:login|session))=([A-Za-z0-9_-]*); Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=(\d+)$/.exec(value);
  return Boolean(match && (token.test(match[2]) && Number(match[3]) > 0 && Number(match[3]) <= 900 || match[2] === '' && match[3] === '0'));
}

// Only the configured loopback service receives the two auth cookies; redirects are never followed server-side.
export async function handleTimetableAuth(request, apiOrigin, action) {
  if (request.method !== 'GET' || !['start', 'callback'].includes(action)) return fail(404, 'not_found');
  const origin = loopbackOrigin(apiOrigin);
  const input = new URL(request.url);
  if (!origin) return fail(503, 'unavailable');
  if (input.search.length > 1900 || action === 'start' && input.search) return fail(400, 'invalid_request');
  const cookie = selectedCookies(request.headers.get('cookie'));
  if (cookie === null) return fail(400, 'invalid_request');
  try {
    const upstream = await fetch(`${origin}/auth/${action}${input.search}`, { method: 'GET', headers: cookie ? { cookie } : {}, redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(5000) });
    const cookies = upstream.headers.getSetCookie();
    if (cookies.length > 2 || cookies.some((value) => !validResponseCookie(value))) return fail(503, 'unavailable');
    const names = cookies.map((value) => value.split('=')[0]);
    if (new Set(names).size !== names.length) return fail(503, 'unavailable');
    const output = new Headers(headers);
    for (const value of cookies) output.append('set-cookie', value);
    if (action === 'start' && upstream.status === 302) {
      const location = new URL(upstream.headers.get('location'));
      if (location.protocol !== 'https:' || location.username || location.password || names.length !== 1 || names[0] !== loginName || cookies[0].startsWith(`${loginName}=;`)) return fail(503, 'unavailable');
      output.set('location', location.href);
      return new Response(null, { status: 302, headers: output });
    }
    if (action === 'callback' && upstream.status === 200 && cookies.length === 2 && cookies.some((value) => value.startsWith(`${loginName}=;`)) && cookies.some((value) => value.startsWith(`${sessionName}=`) && !value.startsWith(`${sessionName}=;`))) {
      output.set('location', '/');
      return new Response(null, { status: 303, headers: output });
    }
    if (action === 'callback' && upstream.status === 401 && cookies.length === 1 && cookies[0].startsWith(`${loginName}=;`)) return Response.json({ error: 'login_failed' }, { status: 401, headers: output });
    return fail(503, 'unavailable');
  } catch { return fail(503, 'unavailable'); }
}

// Logout stays a POST; the authentication service checks the public Origin.
export async function handleTimetableLogout(request, apiOrigin) {
  if (request.method !== 'POST') return fail(404, 'not_found');
  const origin = loopbackOrigin(apiOrigin);
  if (!origin) return fail(503, 'unavailable');
  const url = new URL(request.url);
  if (url.search || request.headers.has('transfer-encoding')) return fail(400, 'invalid_request');
  if (request.body !== null) {
    if (request.headers.get('content-length') !== '0') return fail(400, 'invalid_request');
    const reader = request.body.getReader();
    try { if (!(await reader.read()).done) return fail(400, 'invalid_request'); }
    catch { return fail(400, 'invalid_request'); }
    finally { reader.releaseLock(); }
  }
  const callerOrigin = request.headers.get('origin');
  if (!callerOrigin) return fail(403, 'forbidden');
  const cookie = selectedCookies(request.headers.get('cookie'));
  if (cookie === null) return fail(400, 'invalid_request');
  try {
    const upstream = await fetch(`${origin}/auth/logout`, { method: 'POST', headers: { origin: callerOrigin, ...(cookie ? { cookie } : {}) }, redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (upstream.status === 403) return fail(403, 'forbidden');
    if (upstream.status === 400) return fail(400, 'invalid_request');
    const cookies = upstream.headers.getSetCookie();
    if (upstream.status !== 200 || cookies.length !== 1 || !validResponseCookie(cookies[0]) || !cookies[0].startsWith(`${sessionName}=;`)) return fail(503, 'unavailable');
    const output = new Headers(headers);
    output.append('set-cookie', cookies[0]);
    return Response.json({ ok: true }, { status: 200, headers: output });
  } catch { return fail(503, 'unavailable'); }
}
