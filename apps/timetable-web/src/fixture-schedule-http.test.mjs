import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { createServer as createHttpServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function waitFor(fn) {
  for (let i = 0; i < 120; i++) { try { const result = await fn(); if (result) return result; } catch {} await delay(250); }
  throw new Error('Timed out waiting for browser or server');
}

test('development server renders schedule and paginates attendance', { timeout: 120000 }, async () => {
  const binding = 'A'.repeat(43), session = 'B'.repeat(43);
  const auth = createHttpServer((request, response) => {
    if (request.url === '/auth/start') {
      response.writeHead(302, { location: 'https://identity.example.invalid/authorize', 'set-cookie': `__Host-vintad3e-login=${binding}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=300` });
    } else if (request.url === '/auth/callback?code=example&state=example' && request.headers.cookie === `__Host-vintad3e-login=${binding}`) {
      response.writeHead(200, { 'set-cookie': ['__Host-vintad3e-login=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0', `__Host-vintad3e-session=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=900`] });
    } else if (request.url === '/auth/logout' && request.method === 'POST' && request.headers.cookie === `__Host-vintad3e-session=${session}` && request.headers.origin === 'https://app.example.invalid') {
      response.writeHead(200, { 'set-cookie': '__Host-vintad3e-session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0' });
    } else if (request.url === '/v1/me/access' && request.headers.cookie === `__Host-vintad3e-session=${session}`) {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ role: 'VIEWER', privateField: 'omit' })); return;
    } else response.writeHead(400);
    response.end();
  });
  auth.listen(0, '127.0.0.1'); await once(auth, 'listening');
  const authOrigin = `http://127.0.0.1:${auth.address().port}`;
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port; await new Promise(resolve => server.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', VINTAD3E_TIMETABLE_FIXTURE: '1', VINTAD3E_TIMETABLE_API_ORIGIN: authOrigin }, stdio: 'ignore',
  });
  let chrome, profile, socket, closeBrowser;
  try {
    let response;
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error('Development server exited');
      try { response = await fetch(`${origin}/?view=schedule&month=2026-02`); if (response.status === 200) break; } catch {}
      await delay(300);
    }
    assert.equal(response?.status, 200);
    const html = await response.text();
    assert.match(html, /data-schedule-date="2026-02-08"/);
    assert.match(html, /schedule-calendar__shift--draft/);
    assert.match(html, /근무 상세 보기/);
    const returnPath = '/?view=schedule&month=2026-02';
    const authStart = await fetch(`${origin}/auth/start?${new URLSearchParams({ next: returnPath })}`, { redirect: 'manual' });
    assert.equal(authStart.status, 302);
    assert.equal(authStart.headers.get('location'), 'https://identity.example.invalid/authorize');
    const returnCookie = authStart.headers.getSetCookie().find(value => value.startsWith('__Host-vintad3e-return=')).split(';')[0];
    const authCallback = await fetch(`${origin}/auth/callback?code=example&state=example`, { redirect: 'manual', headers: { cookie: `__Host-vintad3e-login=${binding}; ${returnCookie}` } });
    assert.equal(authCallback.status, 303);
    assert.equal(authCallback.headers.get('location'), returnPath);
    assert.ok(authCallback.headers.getSetCookie().some((cookie) => cookie.startsWith(`__Host-vintad3e-session=${session};`)));
    const accessResponse = await fetch(`${origin}/api/timetable/access`, { headers: { cookie: `__Host-vintad3e-session=${session}` } });
    assert.equal(accessResponse.status, 200);
    assert.equal(accessResponse.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(await accessResponse.json(), { role: 'VIEWER' });
    const authLogout = await fetch(`${origin}/auth/logout`, { method: 'POST', headers: { origin: 'https://app.example.invalid', cookie: `__Host-vintad3e-session=${session}` } });
    assert.equal(authLogout.status, 200);
    assert.match(authLogout.headers.getSetCookie()[0], /^__Host-vintad3e-session=; .*Max-Age=0$/);
    const historyRedirect = await fetch(`${origin}/history?range=custom&from=2026-02-01&to=2026-02-28&sort=asc&historyPage=2&employee=00000000-0000-4000-8000-000000000001`, { redirect: 'manual' });
    assert.equal(historyRedirect.status, 307);
    const historyLocation = new URL(historyRedirect.headers.get('location'), origin);
    assert.equal(historyLocation.pathname, '/');
    assert.equal(historyLocation.searchParams.get('view'), 'history');
    assert.equal(historyLocation.searchParams.get('range'), 'custom');
    assert.equal(historyLocation.searchParams.get('from'), '2026-02-01');
    assert.equal(historyLocation.searchParams.get('to'), '2026-02-28');
    assert.equal(historyLocation.searchParams.get('sort'), 'asc');
    assert.equal(historyLocation.searchParams.get('historyPage'), '2');
    assert.equal(historyLocation.searchParams.get('employee'), '00000000-0000-4000-8000-000000000001');
    const scheduleRedirect = await fetch(`${origin}/schedule?month=2026-02&month=2026-03`, { redirect: 'manual' });
    assert.equal(scheduleRedirect.status, 307);
    const scheduleLocation = new URL(scheduleRedirect.headers.get('location'), origin);
    assert.equal(scheduleLocation.searchParams.get('view'), 'schedule');
    assert.equal(scheduleLocation.searchParams.get('month'), '2026-02');
    const invalidMonth = await fetch(`${origin}/schedule?month=2026-13`, { redirect: 'manual' });
    assert.match(new URL(invalidMonth.headers.get('location'), origin).searchParams.get('month'), /^\d{4}-(0[1-9]|1[0-2])$/);
    const historyPage = async page => {
      const result = await fetch(`${origin}/?view=history&range=all&historyPage=${page}`);
      assert.equal(result.status, 200);
      return result.text();
    };
    const first = await historyPage(1);
    assert.equal((first.match(/<article class="attendance-history-card attendance-history-card--checked-out"/g) ?? []).length, 9);
    assert.match(first, /attendance-history-card--checked-in/);
    assert.match(first, /출근 중/);
    assert.match(first, /출근부 더 불러오기/);
    const second = await historyPage(2);
    assert.equal((second.match(/<article class="attendance-history-card attendance-history-card--checked-out"/g) ?? []).length, 19);
    const third = await historyPage(3);
    assert.equal((third.match(/<article class="attendance-history-card attendance-history-card--checked-out"/g) ?? []).length, 20);
    assert.doesNotMatch(third, /aria-label="출근부 더 불러오기"/);

    profile = await mkdtemp(join(tmpdir(), 'vintad3e-timetable-browser-'));
    let chromeError = '', spawnError;
    chrome = spawn('google-chrome', ['--headless=new','--no-sandbox','--disable-dev-shm-usage',`--user-data-dir=${profile}`,'--remote-debugging-port=0','about:blank'], { stdio:['ignore','ignore','pipe'] });
    chrome.on('error', error => { spawnError = error; });
    chrome.stderr.on('data', chunk => { chromeError = (chromeError + chunk.toString()).slice(-4000); });
    let debug;
    for (let i = 0; i < 180; i++) {
      if (spawnError || chrome.exitCode !== null || chrome.signalCode !== null) throw new Error(`Chrome exited before debugging started: ${spawnError?.message ?? chromeError}`);
      try {
        const port = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]);
        if (Number.isInteger(port) && port > 0 && port <= 65535 && (await fetch(`http://127.0.0.1:${port}/json/version`)).ok) { debug = `http://127.0.0.1:${port}`; break; }
      } catch {}
      await delay(250);
    }
    if (!debug) throw new Error(`Chrome debugging endpoint did not start: ${chromeError}`);
    const target = await (await fetch(`${debug}/json/new?about:blank`, { method:'PUT' })).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject) => { socket.addEventListener('open',resolve,{once:true}); socket.addEventListener('error',reject,{once:true}); });
    let sequence = 0; const pending = new Map();
    socket.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { const {resolve,reject} = pending.get(message.id); pending.delete(message.id); message.error ? reject(new Error(message.error.message)) : resolve(message.result); } });
    const send = (method,params={}) => new Promise((resolve,reject) => { const id = ++sequence; pending.set(id,{resolve,reject}); socket.send(JSON.stringify({id,method,params})); });
    closeBrowser = () => send('Browser.close');
    const evaluate = async expression => { const result = await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true}); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; };
    await send('Page.navigate',{url:`${origin}/?view=history`});
    await waitFor(async () => evaluate("Boolean(document.querySelector('.attendance-history-filter [data-hydrated=true]'))"));
    await evaluate("(()=>{const s=document.querySelector('.attendance-history-filter [name=range]');s.value='all';s.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('.attendance-history-filter').requestSubmit();})()");
    await waitFor(async () => evaluate("location.search.includes('range=all') && document.querySelectorAll('article.attendance-history-card').length===10"));
    await waitFor(async () => evaluate("(()=>{const b=document.querySelector('.attendance-history-pager button');if(location.search.includes('historyPage=2')&&document.querySelectorAll('article.attendance-history-card').length===20)return true;b?.click();return false;})()"));
    assert.ok(await evaluate("location.search.includes('range=all')"));
    await waitFor(async () => evaluate("(()=>{const b=document.querySelector('.attendance-history-pager button');if(location.search.includes('historyPage=3')&&document.querySelectorAll('article.attendance-history-card').length===21)return true;b?.click();return false;})()"));
    assert.ok(await evaluate("!document.querySelector('.attendance-history-pager')"));
    await send('Page.navigate',{url:`${origin}/?view=schedule&month=2026-02`});
    await waitFor(async () => evaluate("Boolean(document.querySelector('[aria-label=\"직원별 일정\"]:not(:disabled)'))"));
    assert.equal(await evaluate("document.querySelectorAll('.schedule-calendar__shift').length"), 1);
    assert.ok(await evaluate("document.querySelector('.schedule-calendar__shift').textContent.includes('직원 01')"));
    await evaluate("(()=>{const s=document.querySelector('[aria-label=\"직원별 일정\"]');s.value='employee-2';s.dispatchEvent(new Event('change',{bubbles:true}));})()");
    await waitFor(async () => evaluate("document.querySelectorAll('.schedule-calendar__shift').length===0"));
    await evaluate("(()=>{const s=document.querySelector('[aria-label=\"장소별 일정\"]');s.value='location-2';s.dispatchEvent(new Event('change',{bubbles:true}));})()");
    await waitFor(async () => evaluate("document.querySelector('.schedule-calendar__shift')?.textContent.includes('직원 02')"));
    await evaluate("document.querySelector('.schedule-calendar__shift').click()");
    await waitFor(async () => evaluate("document.querySelector('dialog[open] #schedule-shift-editor-title')?.textContent.includes('직원 02 장소 02 근무')"));
    assert.ok(await evaluate("document.querySelector('dialog[open] input[aria-label=\"예정 시작\"]').value.startsWith('2026-02-18')"));
    await evaluate("document.querySelector('dialog[open] [aria-label=\"일정 입력 창 닫기\"]').click()");
    await waitFor(async () => evaluate("!document.querySelector('dialog[open]')"));
  } finally {
    auth.closeAllConnections();
    await new Promise(resolve => auth.close(resolve));
    if (closeBrowser) await Promise.race([closeBrowser().catch(() => {}), delay(3000)]);
    socket?.close();
    if (chrome) { chrome.kill('SIGTERM'); if (chrome.exitCode === null && chrome.signalCode === null) await Promise.race([once(chrome, 'exit'), delay(5000)]); if (chrome.exitCode === null && chrome.signalCode === null) chrome.kill('SIGKILL'); }
    child.kill('SIGTERM');
    if (child.exitCode === null) await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
    if (profile) await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:250});
  }
});
