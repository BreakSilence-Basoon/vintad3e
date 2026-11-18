import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createServer as createPortProbe } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

test('history page renders only the current session and shows the original error on denial', { timeout: 90000 }, async () => {
  const a = 'A'.repeat(43), b = 'B'.repeat(43), denied = 'C'.repeat(43);
  let calls = 0;
  const api = createServer((request, response) => {
    calls++;
    const cookie = request.headers.cookie;
    if (cookie === `__Host-vintad3e-session=${denied}`) { response.writeHead(404); response.end(); return; }
    const id = cookie === `__Host-vintad3e-session=${a}` ? 'alpha' : cookie === `__Host-vintad3e-session=${b}` ? 'beta' : null;
    if (!id) { response.writeHead(401); response.end(); return; }
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ records: [{ id, startsAt: id === 'alpha' ? '2026-01-01T00:00:00.000Z' : '2026-02-02T00:00:00.000Z', endsAt: null }], nextCursor: null }));
  });
  api.listen(0, '127.0.0.1'); await once(api, 'listening');
  const apiOrigin = `http://127.0.0.1:${api.address().port}`;
  const probe = createPortProbe(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', VINTAD3E_TIMETABLE_FIXTURE: '', VINTAD3E_TIMETABLE_API_ORIGIN: apiOrigin }, stdio: 'ignore',
  });
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error('Development server exited');
      try { if ((await fetch(`${origin}/?view=history&range=all`)).ok) { ready = true; break; } } catch {}
      await delay(300);
    }
    assert.ok(ready);
    assert.equal(calls, 0);
    const page = async value => fetch(`${origin}/?view=history&range=all`, { headers: { cookie: `__Host-vintad3e-session=${value}` } });
    const firstResponse = await page(a);
    const first = await firstResponse.text();
    assert.match(first, /2026\. 1\. 1\./);
    assert.doesNotMatch(first, /2026\. 2\. 2\./);
    assert.match(first, /출근 중/);
    const second = await (await page(b)).text();
    assert.match(second, /2026\. 2\. 2\./);
    assert.doesNotMatch(second, /2026\. 1\. 1\./);
    const failure = await (await page(denied)).text();
    assert.match(failure, /출근부를 불러오지 못했습니다\./);
    assert.doesNotMatch(failure, /아직 표시할 출퇴근 기록이 없습니다\./);
    const beforeDuplicate = calls;
    const duplicate = await (await fetch(`${origin}/?view=history&range=all`, { headers: { cookie: `__Host-vintad3e-session=${a}; __Host-vintad3e-session=${b}` } })).text();
    assert.match(duplicate, /출근부를 불러오지 못했습니다\./);
    assert.equal(calls, beforeDuplicate);
    assert.match(firstResponse.headers.get('cache-control'), /no-store|private/);
  } finally {
    child.kill('SIGTERM');
    if (child.exitCode === null && child.signalCode === null) await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    api.closeAllConnections();
    await new Promise(resolve => api.close(resolve));
  }
});
