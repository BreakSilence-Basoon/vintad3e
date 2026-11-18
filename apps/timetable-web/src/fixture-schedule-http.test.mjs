import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
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

test('development server renders schedule and paginates attendance', { timeout: 90000 }, async () => {
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port; await new Promise(resolve => server.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', VINTAD3E_TIMETABLE_FIXTURE: '1' }, stdio: 'ignore',
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
    const historyPage = async page => {
      const result = await fetch(`${origin}/?view=history&range=all&historyPage=${page}`);
      assert.equal(result.status, 200);
      return result.text();
    };
    const first = await historyPage(1);
    assert.equal((first.match(/<article class="attendance-history-card attendance-history-card--checked-out"/g) ?? []).length, 10);
    assert.match(first, /출근부 더 불러오기/);
    const second = await historyPage(2);
    assert.equal((second.match(/<article class="attendance-history-card attendance-history-card--checked-out"/g) ?? []).length, 20);
    const third = await historyPage(3);
    assert.equal((third.match(/<article class="attendance-history-card attendance-history-card--checked-out"/g) ?? []).length, 21);
    assert.doesNotMatch(third, /aria-label="출근부 더 불러오기"/);

    const debugServer = createServer(); debugServer.listen(0, '127.0.0.1'); await once(debugServer, 'listening');
    const debugPort = debugServer.address().port; await new Promise(resolve => debugServer.close(resolve));
    const debug = `http://127.0.0.1:${debugPort}`;
    profile = await mkdtemp(join(tmpdir(), 'vintad3e-timetable-browser-'));
    chrome = spawn('google-chrome', ['--headless=new','--no-sandbox','--disable-dev-shm-usage',`--user-data-dir=${profile}`,`--remote-debugging-port=${debugPort}`,'about:blank'], { stdio:'ignore' });
    await waitFor(async () => (await fetch(`${debug}/json/version`)).ok);
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
  } finally {
    if (closeBrowser) await Promise.race([closeBrowser().catch(() => {}), delay(3000)]);
    socket?.close();
    if (chrome) { chrome.kill('SIGTERM'); if (chrome.exitCode === null && chrome.signalCode === null) await Promise.race([once(chrome, 'exit'), delay(5000)]); if (chrome.exitCode === null && chrome.signalCode === null) chrome.kill('SIGKILL'); }
    child.kill('SIGTERM');
    if (child.exitCode === null) await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
    if (profile) await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:250});
  }
});
