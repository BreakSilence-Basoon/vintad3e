import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readTimetable } from './timetable-read.mjs';
import { handleTimetableRequest } from './timetable-route.mjs';
import { historySessionCookie, loadTimetableHistory } from './timetable-history-view.mjs';

const sessionValue = 'x'.repeat(43);
const cookie = `__Host-vintad3e-session=${sessionValue}`;
const request = (query = '', value = cookie) => new Request(`https://example.invalid/api/timetable/history${query}`, { headers: { cookie: value } });

test('untrusted addresses, missing or malformed sessions and malformed queries fail closed', async () => {
  assert.equal(historySessionCookie(null), undefined);
  assert.equal(historySessionCookie(cookie), sessionValue);
  assert.equal(historySessionCookie(`${cookie}; ${cookie}`), null);
  assert.equal(historySessionCookie('__Host-vintad3e-session=bad'), null);
  for (const apiOrigin of ['https://example.invalid', 'http://localhost:1234', 'http://127.0.0.1:1234/path', 'http://name@127.0.0.1:1234']) {
    assert.equal((await readTimetable({ apiOrigin, sessionValue, resource: 'history' })).kind, 'unavailable');
  }
  assert.equal((await readTimetable({ apiOrigin: 'http://127.0.0.1:1', sessionValue: 'bad', resource: 'history' })).kind, 'signed-out');
  assert.equal((await handleTimetableRequest(request('?extra=1'), 'history', 'http://127.0.0.1:1')).status, 400);
  assert.equal((await handleTimetableRequest(request('?cursor=a&cursor=b'), 'history', 'http://127.0.0.1:1')).status, 400);
  assert.equal((await handleTimetableRequest(request('', `${cookie}; ${cookie}`), 'history', 'http://127.0.0.1:1')).status, 401);
});

test('history view loads all pages, filters Seoul dates, and never presents partial or denied data', async () => {
  let mode = 'ok';
  const server = createServer((req, res) => {
    assert.equal(req.headers.cookie, cookie);
    if (mode === 'denied') { res.writeHead(404); res.end(); return; }
    const cursor = new URL(req.url, 'http://127.0.0.1').searchParams.get('cursor');
    const item = cursor ? { id: 'old', startsAt: '2026-11-16T00:00:00.000Z', endsAt: null } : { id: 'new', startsAt: '2026-11-18T00:00:00.000Z', endsAt: null };
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ records: [item], nextCursor: mode === 'cycle' ? 'repeat' : cursor ? null : 'next' }));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const apiOrigin = `http://127.0.0.1:${server.address().port}`;
  const filters = { range: 'last7', from: '', to: '', sort: 'desc' };
  const options = { apiOrigin, sessionValue, filters, now: Date.parse('2026-11-18T02:00:00.000Z') };
  try {
    const all = await loadTimetableHistory(options);
    assert.deepEqual(all.records.map((row) => row.id), ['new', 'old']);
    const today = await loadTimetableHistory({ ...options, filters: { ...filters, range: 'today' } });
    assert.deepEqual(today.records.map((row) => row.id), ['new']);
    const asc = await loadTimetableHistory({ ...options, filters: { ...filters, sort: 'asc' } });
    assert.deepEqual(asc.records.map((row) => row.id), ['old', 'new']);
    mode = 'cycle'; assert.deepEqual(await loadTimetableHistory(options), { kind: 'unavailable' });
    mode = 'denied'; assert.deepEqual(await loadTimetableHistory(options), { kind: 'denied' });
  } finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
});

test('schedule attendance requires explicit opt-in and rejects missing or malformed attendance', async () => {
  let attendance = { startsAt: '2026-01-01T09:05:00.000Z', endsAt: null, privateField: 'omit' };
  const server = createServer((req, res) => {
    assert.equal(req.headers.cookie, cookie);
    assert.equal(new URL(req.url, 'http://127.0.0.1').searchParams.get('include'), 'attendance');
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ shifts: [{ id: 's1', location: { id: 'l1', label: '장소' }, startsAt: '2026-01-01T09:00:00.000Z', endsAt: '2026-01-01T17:00:00.000Z', graceMinutes: 0, attendance }], nextCursor: null }));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const apiOrigin = `http://127.0.0.1:${server.address().port}`;
  const from = '2026-01-01T00:00:00.000Z', to = '2026-01-02T00:00:00.000Z';
  try {
    const options = { apiOrigin, sessionValue, resource: 'shifts', from, to, includeAttendance: true };
    const result = await readTimetable(options);
    assert.equal(result.kind, 'ready');
    assert.deepEqual(result.data.shifts[0].attendance, { startsAt: attendance.startsAt, endsAt: null });
    const params = new URLSearchParams({ from, to, include: 'attendance' });
    const response = await handleTimetableRequest(new Request(`https://example.invalid/api/timetable/shifts?${params}`, { headers: { cookie } }), 'shifts', apiOrigin);
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).shifts[0].attendance, { startsAt: attendance.startsAt, endsAt: null });
    attendance = undefined;
    assert.equal((await readTimetable(options)).kind, 'unavailable');
    attendance = { startsAt: 'invalid', endsAt: null };
    assert.equal((await readTimetable(options)).kind, 'unavailable');
    assert.equal((await handleTimetableRequest(new Request('https://example.invalid/api/timetable/shifts?include=unknown', { headers: { cookie } }), 'shifts', apiOrigin)).status, 400);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('only valid, bounded response fields reach the caller and redirects are not followed', async () => {
  let seen = 0;
  const server = createServer((req, res) => {
    seen++;
    if (req.url.includes('cursor=redirect')) { res.writeHead(302, { location: '/followed' }); res.end(); return; }
    if (req.url.includes('cursor=oversize')) { res.writeHead(200, { 'content-type': 'application/json' }); res.end('x'.repeat(262145)); return; }
    if (req.url.includes('cursor=invalid')) { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ records: [{ startsAt: '2026-01-01T00:00:00.000Z', endsAt: null }], nextCursor: null })); return; }
    assert.equal(req.headers.cookie, cookie);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ records: [{ id: 'r1', startsAt: '2026-01-01T00:00:00.000Z', endsAt: null, privateField: 'omit' }], nextCursor: null, privateField: 'omit' }));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const apiOrigin = `http://127.0.0.1:${server.address().port}`;
  try {
    const result = await readTimetable({ apiOrigin, sessionValue, resource: 'history' });
    assert.deepEqual(result, { kind: 'ready', data: { records: [{ id: 'r1', startsAt: '2026-01-01T00:00:00.000Z', endsAt: null }], nextCursor: null } });
    for (const nextCursor of ['redirect', 'oversize', 'invalid']) assert.equal((await readTimetable({ apiOrigin, sessionValue, resource: 'history', nextCursor })).kind, 'unavailable');
    assert.equal(seen, 4);
    const response = await handleTimetableRequest(request(), 'history', apiOrigin);
    assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'private, no-store');
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
