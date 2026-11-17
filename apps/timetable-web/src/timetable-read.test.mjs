import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readTimetable } from './timetable-read.mjs';
import { handleTimetableRequest } from './timetable-route.mjs';

const sessionValue = 'x'.repeat(43);
const cookie = `__Host-vintad3e-session=${sessionValue}`;
const request = (query = '', value = cookie) => new Request(`https://example.invalid/api/timetable/history${query}`, { headers: { cookie: value } });

test('untrusted addresses, missing or malformed sessions and malformed queries fail closed', async () => {
  for (const apiOrigin of ['https://example.invalid', 'http://localhost:1234', 'http://127.0.0.1:1234/path', 'http://name@127.0.0.1:1234']) {
    assert.equal((await readTimetable({ apiOrigin, sessionValue, resource: 'history' })).kind, 'unavailable');
  }
  assert.equal((await readTimetable({ apiOrigin: 'http://127.0.0.1:1', sessionValue: 'bad', resource: 'history' })).kind, 'signed-out');
  assert.equal((await handleTimetableRequest(request('?extra=1'), 'history', 'http://127.0.0.1:1')).status, 400);
  assert.equal((await handleTimetableRequest(request('?cursor=a&cursor=b'), 'history', 'http://127.0.0.1:1')).status, 400);
  assert.equal((await handleTimetableRequest(request('', `${cookie}; ${cookie}`), 'history', 'http://127.0.0.1:1')).status, 401);
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
