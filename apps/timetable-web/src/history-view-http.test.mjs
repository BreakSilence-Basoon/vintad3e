import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createServer as createPortProbe } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function waitFor(fn) {
  for (let i = 0; i < 120; i++) { try { const result = await fn(); if (result) return result; } catch {} await delay(250); }
  throw new Error('Timed out waiting for browser or server');
}

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
    if (request.url.startsWith('/v1/me/shifts?')) {
      const query = new URL(request.url, 'http://127.0.0.1').searchParams;
      if (query.get('include') !== 'attendance') { response.end('{}'); return; }
      const location = { id: id === 'alpha' ? 'location-a' : 'location-b', label: id === 'alpha' ? '장소 01' : '장소 02' };
      const shifts = id === 'alpha' ? [
        { id: 'shift-a', location, startsAt: '2026-02-08T00:00:00.000Z', endsAt: '2026-02-08T04:00:00.000Z', graceMinutes: 0, attendance: { startsAt: '2026-02-08T00:05:00.000Z', endsAt: '2026-02-08T04:00:00.000Z' } },
        { id: 'shift-b', location, startsAt: '2026-02-08T05:00:00.000Z', endsAt: '2026-02-08T08:00:00.000Z', graceMinutes: 0, attendance: null },
        { id: 'shift-d', location, startsAt: '2026-02-08T11:00:00.000Z', endsAt: '2026-02-08T13:00:00.000Z', graceMinutes: 0, attendance: { startsAt: '2026-02-08T11:03:00.000Z', endsAt: null } },
      ] : [{ id: 'shift-c', location, startsAt: '2026-02-09T00:00:00.000Z', endsAt: '2026-02-09T04:00:00.000Z', graceMinutes: 0, attendance: null }];
      response.end(JSON.stringify({ shifts, nextCursor: null })); return;
    }
    response.end(JSON.stringify({ records: [{ id, startsAt: id === 'alpha' ? '2026-01-01T00:00:00.000Z' : '2026-02-02T00:00:00.000Z', endsAt: null }], nextCursor: null }));
  });
  api.listen(0, '127.0.0.1'); await once(api, 'listening');
  const apiOrigin = `http://127.0.0.1:${api.address().port}`;
  const probe = createPortProbe(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'production', VINTAD3E_TIMETABLE_FIXTURE: '', VINTAD3E_TIMETABLE_API_ORIGIN: apiOrigin }, stdio: 'ignore',
  });
  let chrome, profile, socket, closeBrowser;
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error('Production server exited');
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
    assert.match(firstResponse.headers.get('cache-control'), /no-store/);
    assert.match(firstResponse.headers.get('cache-control'), /private/);

    const schedule = async value => fetch(`${origin}/?view=schedule&month=2026-02`, { headers: { cookie: `__Host-vintad3e-session=${value}` } });
    const scheduleA = await (await schedule(a)).text();
    assert.match(scheduleA, /schedule-calendar__shift--checked-out/);
    assert.match(scheduleA, /schedule-calendar__shift--draft/);
    assert.match(scheduleA, /schedule-calendar__shift--checked-in/);
    assert.match(scheduleA, /09:00부터/);
    assert.match(scheduleA, /14:00부터/);
    assert.doesNotMatch(scheduleA, /장소 02/);
    const scheduleB = await (await schedule(b)).text();
    assert.match(scheduleB, /장소 02/);
    assert.doesNotMatch(scheduleB, /장소 01/);
    assert.match(await (await schedule(denied)).text(), /근무시간표를 불러오지 못했습니다\./);

    const debugProbe = createPortProbe(); debugProbe.listen(0, '127.0.0.1'); await once(debugProbe, 'listening');
    const debugPort = debugProbe.address().port; await new Promise(resolve => debugProbe.close(resolve));
    const debug = `http://127.0.0.1:${debugPort}`;
    profile = await mkdtemp(join(tmpdir(), 'vintad3e-timetable-schedule-'));
    chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', `--user-data-dir=${profile}`, `--remote-debugging-port=${debugPort}`, 'about:blank'], { stdio: 'ignore' });
    await waitFor(async () => (await fetch(`${debug}/json/version`)).ok);
    const target = await (await fetch(`${debug}/json/new?about:blank`, { method: 'PUT' })).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    let sequence = 0; const pending = new Map();
    socket.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { const { resolve, reject } = pending.get(message.id); pending.delete(message.id); message.error ? reject(new Error(message.error.message)) : resolve(message.result); } });
    const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
    closeBrowser = () => send('Browser.close');
    const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; };
    await send('Network.enable');
    assert.equal((await send('Network.setCookie', { name: '__Host-vintad3e-session', value: a, url: origin, path: '/', secure: true, httpOnly: true, sameSite: 'Lax' })).success, true);
    await send('Page.navigate', { url: `${origin}/?view=schedule&month=2026-02` });
    await waitFor(async () => evaluate("(()=>{if(document.querySelector('dialog[open]'))return true;document.querySelector('.schedule-calendar__shift--checked-out')?.click();return false;})()"));
    assert.equal(await evaluate("document.querySelector('dialog[open] input[aria-label=\"예정 시작\"]').value"), '2026-02-08T09:00');
    assert.ok(await evaluate("document.querySelectorAll('dialog[open] .schedule-dialog__fields label input[type=text]')[0].value.includes('09:05')"));
    assert.ok(await evaluate("document.querySelectorAll('dialog[open] .schedule-dialog__fields label input[type=text]')[1].value.includes('13:00')"));
    await evaluate("document.querySelector('dialog[open] .schedule-dialog__close').click()");
    await waitFor(async () => evaluate("!document.querySelector('dialog[open]')"));
    await waitFor(async () => evaluate("(()=>{if(document.querySelector('dialog[open]'))return true;document.querySelector('.schedule-calendar__shift--draft')?.click();return false;})()"));
    assert.equal(await evaluate("document.querySelector('dialog[open] input[aria-label=\"예정 시작\"]').value"), '2026-02-08T14:00');
    assert.equal(await evaluate("document.querySelectorAll('dialog[open] .schedule-dialog__fields label input[type=text]')[0].value"), '기록 없음');
    await evaluate("document.querySelector('dialog[open] .schedule-dialog__close').click()");
    await waitFor(async () => evaluate("!document.querySelector('dialog[open]')"));
    await waitFor(async () => evaluate("(()=>{if(document.querySelector('dialog[open]'))return true;document.querySelector('.schedule-calendar__shift--checked-in')?.click();return false;})()"));
    assert.ok(await evaluate("document.querySelectorAll('dialog[open] .schedule-dialog__fields label input[type=text]')[0].value.includes('20:03')"));
    assert.equal(await evaluate("document.querySelectorAll('dialog[open] .schedule-dialog__fields label input[type=text]')[1].value"), '기록 없음');
  } finally {
    if (closeBrowser) await Promise.race([closeBrowser().catch(() => {}), delay(3000)]);
    socket?.close();
    if (chrome) { chrome.kill('SIGTERM'); if (chrome.exitCode === null && chrome.signalCode === null) await Promise.race([once(chrome, 'exit'), delay(5000)]); if (chrome.exitCode === null && chrome.signalCode === null) chrome.kill('SIGKILL'); }
    if (profile) await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
    child.kill('SIGTERM');
    if (child.exitCode === null && child.signalCode === null) await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    api.closeAllConnections();
    await new Promise(resolve => api.close(resolve));
  }
});
