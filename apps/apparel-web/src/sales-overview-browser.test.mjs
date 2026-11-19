import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

async function freePort() {
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port;
}
async function waitFor(fn) {
  for (let i = 0; i < 120; i++) { try { const result = await fn(); if (result) return result; } catch {} await delay(250); }
  throw new Error('Timed out waiting for browser or server');
}

test('overview is unavailable without the development fixture', { timeout: 60000 }, async () => {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)], { env:{...process.env,NODE_ENV:'development',VINTAD3E_APPAREL_FIXTURE:''}, stdio:'ignore' });
  try {
    const response = await waitFor(async () => { const result = await fetch(`${origin}/admin/stats`); return result.status === 404 ? result : false; });
    assert.equal(response.status, 404);
    assert.equal((await fetch(`${origin}/admin/stats/sales-overview?from=2026-01-01&to=2026-01-02`)).status, 404);
  } finally {
    server.kill('SIGTERM');
    if (server.exitCode === null && server.signalCode === null) await Promise.race([once(server,'exit'),delay(5000)]);
    if (server.exitCode === null && server.signalCode === null) server.kill('SIGKILL');
  }
});

test('synthetic overview updates its original charts and controls', { timeout: 90000 }, async () => {
  const port = await freePort(), debuggerPort = await freePort();
  const origin = `http://127.0.0.1:${port}`, debug = `http://127.0.0.1:${debuggerPort}`;
  const profile = await mkdtemp(join(tmpdir(), 'vintad3e-apparel-stats-'));
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)], { env:{...process.env,NODE_ENV:'development',VINTAD3E_APPAREL_FIXTURE:'1'}, stdio:'ignore' });
  const chrome = spawn('google-chrome', ['--headless=new','--no-sandbox','--disable-dev-shm-usage',`--user-data-dir=${profile}`,`--remote-debugging-port=${debuggerPort}`,'about:blank'], { stdio:'ignore' });
  let socket, closeBrowser;
  try {
    await waitFor(async () => (await fetch(`${origin}/admin/stats`)).ok);
    await waitFor(async () => (await fetch(`${debug}/json/version`)).ok);
    assert.equal((await fetch(`${origin}/admin/stats/sales-overview?from=bad&to=bad`)).status, 400);
    assert.equal((await fetch(`${origin}/admin/stats/sales-overview?from=a&from=b&to=c`)).status, 400);
    const target = await (await fetch(`${debug}/json/new?about:blank`, {method:'PUT'})).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject) => { socket.addEventListener('open',resolve,{once:true}); socket.addEventListener('error',reject,{once:true}); });
    let sequence = 0; const pending = new Map();
    socket.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { const {resolve,reject} = pending.get(message.id); pending.delete(message.id); message.error ? reject(new Error(message.error.message)) : resolve(message.result); } });
    const send = (method,params={}) => new Promise((resolve,reject) => { const id = ++sequence; pending.set(id,{resolve,reject}); socket.send(JSON.stringify({id,method,params})); });
    closeBrowser = () => send('Browser.close');
    const evaluate = async expression => { const result = await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true}); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; };
    await send('Page.navigate',{url:`${origin}/admin/stats`});
    await waitFor(async () => evaluate("Boolean(document.querySelector('.console-section[data-hydrated=true]'))"));
    const revenue = "[...document.querySelectorAll('span')].find(x=>x.textContent==='매장 매출 (Toss)')?.parentElement.querySelector('strong')?.textContent";
    assert.equal(await evaluate(revenue), '₩50,000');
    assert.ok(await evaluate("Boolean(document.querySelector('[aria-label=\"그래픽별 매출 파이 (조각에 마우스를 올리면 SKU별로 펼쳐 보임)\"]'))"));
    await evaluate("document.querySelector('[title=\"확대 — 짧은 기간(최대 일별)\"]').click()");
    await waitFor(async () => evaluate(`${revenue} === '₩8,000'`));
    await evaluate("[...document.querySelectorAll('[aria-label=지표] button')].find(x=>x.textContent==='수량').click()");
    assert.equal(await evaluate("[...document.querySelectorAll('[aria-label=지표] button')].find(x=>x.textContent==='수량').getAttribute('aria-selected')"), 'true');
  } finally {
    if (closeBrowser) await Promise.race([closeBrowser().catch(() => {}), delay(3000)]);
    socket?.close();
    for (const process of [chrome,server]) process.kill('SIGTERM');
    await Promise.all([chrome,server].map(async process => { if (process.exitCode === null && process.signalCode === null) await Promise.race([once(process,'exit'),delay(5000)]); if (process.exitCode === null && process.signalCode === null) process.kill('SIGKILL'); }));
    await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:250});
  }
});
