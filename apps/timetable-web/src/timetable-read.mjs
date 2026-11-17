const COOKIE = '__Host-vintad3e-session';
const sessionPattern = /^[A-Za-z0-9_-]{43}$/;
const cursorPattern = /^[A-Za-z0-9_-]{1,1024}$/;
const idPattern = /^[A-Za-z0-9_-]{1,128}$/;
const id = (value) => typeof value === 'string' && idPattern.test(value);
const instant = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;

function origin(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port || url.username || url.password || url.pathname !== '/' || url.search || url.hash || value !== url.origin) return null;
    return url.origin;
  } catch { return null; }
}
function cursor(value) { return value === null || typeof value === 'string' && cursorPattern.test(value); }
function history(value) {
  return value && Array.isArray(value.records) && value.records.length <= 100 && cursor(value.nextCursor) && value.records.every((row) => row && id(row.id) && instant(row.startsAt) && (row.endsAt === null || instant(row.endsAt) && row.endsAt >= row.startsAt));
}
function shifts(value) {
  return value && Array.isArray(value.shifts) && value.shifts.length <= 100 && cursor(value.nextCursor) && value.shifts.every((row) => row && id(row.id) && row.location && id(row.location.id) && typeof row.location.label === 'string' && row.location.label === row.location.label.trim() && row.location.label.length > 0 && row.location.label.length <= 100 && !/[\p{Cc}]/u.test(row.location.label) && instant(row.startsAt) && instant(row.endsAt) && row.endsAt > row.startsAt && Number.isInteger(row.graceMinutes) && row.graceMinutes >= 0 && row.graceMinutes <= 180);
}

async function readBoundedJson(response) {
  if (!response.body) throw new Error('Missing response');
  const reader = response.body.getReader();
  const chunks = []; let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 262144) throw new Error('Response too large');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

// Call only on the server with configuration and the one session cookie, never with a user-supplied URL.
export async function readTimetable({ apiOrigin, sessionValue, resource, from, to, nextCursor }) {
  const base = origin(apiOrigin);
  if (sessionValue === undefined || sessionValue === null || sessionValue === '') return { kind: 'signed-out' };
  if (typeof sessionValue !== 'string' || !sessionPattern.test(sessionValue)) return { kind: 'signed-out' };
  if (!base || !['history', 'shifts'].includes(resource)) return { kind: 'unavailable' };
  if (nextCursor !== undefined && (typeof nextCursor !== 'string' || !cursorPattern.test(nextCursor))) return { kind: 'unavailable' };
  const url = new URL(resource === 'history' ? '/v1/me/history' : '/v1/me/shifts', base);
  url.searchParams.set('limit', '100');
  if (nextCursor !== undefined) url.searchParams.set('cursor', nextCursor);
  if (resource === 'shifts') {
    if (!instant(from) || !instant(to) || from >= to || Date.parse(to) - Date.parse(from) > 62 * 86400000) return { kind: 'unavailable' };
    url.searchParams.set('from', from); url.searchParams.set('to', to);
  }
  try {
    const response = await fetch(url, { method: 'GET', headers: { cookie: `${COOKIE}=${sessionValue}` }, redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (response.status === 401) return { kind: 'signed-out' };
    if (response.status === 404 || response.status === 403) return { kind: 'denied' };
    if (response.status !== 200) return { kind: 'unavailable' };
    const length = response.headers.get('content-length');
    if (length !== null && (!/^\d+$/.test(length) || Number(length) > 262144)) return { kind: 'unavailable' };
    const data = await readBoundedJson(response);
    if (!(resource === 'history' ? history(data) : shifts(data))) return { kind: 'unavailable' };
    const projected = resource === 'history'
      ? { records: data.records.map(({ id, startsAt, endsAt }) => ({ id, startsAt, endsAt })), nextCursor: data.nextCursor }
      : { shifts: data.shifts.map(({ id, location, startsAt, endsAt, graceMinutes }) => ({ id, location: { id: location.id, label: location.label }, startsAt, endsAt, graceMinutes })), nextCursor: data.nextCursor };
    return { kind: 'ready', data: projected };
  } catch { return { kind: 'unavailable' }; }
}
