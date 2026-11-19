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

test('shortage entry is unavailable without the development fixture', { timeout: 60000 }, async () => {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)], { env:{...process.env,NODE_ENV:'development',VINTAD3E_APPAREL_FIXTURE:''}, stdio:'ignore' });
  try {
    const response = await waitFor(async () => { const result = await fetch(`${origin}/admin/inventory/shortages`); return result.status === 404 ? result : false; });
    assert.equal(response.status, 404);
  } finally {
    server.kill('SIGTERM');
    if (server.exitCode === null && server.signalCode === null) await Promise.race([once(server,'exit'),delay(5000)]);
    if (server.exitCode === null && server.signalCode === null) server.kill('SIGKILL');
  }
});

test('shortage edits persist only in fixture stock and appear in product detail', { timeout: 90000 }, async () => {
  const port = await freePort(), debuggerPort = await freePort();
  const origin = `http://127.0.0.1:${port}`, debug = `http://127.0.0.1:${debuggerPort}`;
  const profile = await mkdtemp(join(tmpdir(), 'vintad3e-apparel-shortage-'));
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)], { env:{...process.env,NODE_ENV:'development',VINTAD3E_APPAREL_FIXTURE:'1'}, stdio:'ignore' });
  const chrome = spawn('google-chrome', ['--headless=new','--no-sandbox','--disable-dev-shm-usage',`--user-data-dir=${profile}`,`--remote-debugging-port=${debuggerPort}`,'about:blank'], { stdio:'ignore' });
  let socket, closeBrowser;
  try {
    await waitFor(async () => (await fetch(`${origin}/admin/inventory/shortages`)).ok);
    await waitFor(async () => (await fetch(`${debug}/json/version`)).ok);
    const target = await (await fetch(`${debug}/json/new?about:blank`, {method:'PUT'})).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject) => { socket.addEventListener('open',resolve,{once:true}); socket.addEventListener('error',reject,{once:true}); });
    let sequence = 0; const pending = new Map();
    socket.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { const {resolve,reject} = pending.get(message.id); pending.delete(message.id); message.error ? reject(new Error(message.error.message)) : resolve(message.result); } });
    const send = (method,params={}) => new Promise((resolve,reject) => { const id = ++sequence; pending.set(id,{resolve,reject}); socket.send(JSON.stringify({id,method,params})); });
    closeBrowser = () => send('Browser.close');
    const evaluate = async expression => { const result = await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true}); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; };
    await send('Page.navigate',{url:`${origin}/admin/inventory/shortages`});
    await waitFor(async () => evaluate("Boolean(document.querySelector('[data-hydrated=true] .shortage-editor'))"));
    await evaluate("window.stockWrites=0;window.originalFetch=window.fetch.bind(window);window.fetch=(input,init)=>{const path=new URL(typeof input==='string'?input:input.url,location.href).pathname;if(path.startsWith('/api/admin/')){window.stockWrites++;return Promise.reject(new Error('unexpected request'));}return window.originalFetch(input,init)}");
    await evaluate("document.querySelector('[aria-label=\"부족 재고 탭\"] button:nth-child(2)').click()");
    await waitFor(async () => evaluate("document.querySelectorAll('.shortage-table__row').length === 6"));
    const setNumber = async (index, value) => evaluate(`(()=>{const x=document.querySelector('.shortage-table__row').querySelectorAll('input[type=number]')[${index}];Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(x,${JSON.stringify(value)});x.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await setNumber(1, '10'); await setNumber(0, '3');
    await waitFor(async () => evaluate("document.querySelector('.shortage-table__row').querySelectorAll('input[type=number]')[2].value === '7'"));
    await evaluate("document.querySelector('.shortage-table__row .shortage-save-button').click()");
    await waitFor(async () => evaluate("document.querySelector('.admin-toast--success')?.textContent.includes('저장했습니다.') && document.querySelector('[aria-label=\"부족 재고 탭\"] button:first-child').getAttribute('aria-selected') === 'true'"));
    assert.equal(await evaluate('window.stockWrites'), 0);
    await evaluate('window.__beforeShortageReload = true');
    await send('Page.reload');
    await waitFor(async () => evaluate("window.__beforeShortageReload !== true && document.querySelector('[data-hydrated=true] .shortage-table__row input[type=number]')?.value === '3'"));
    assert.equal(await evaluate("document.querySelector('.shortage-table__row').querySelectorAll('input[type=number]')[1].value"), '10');
    assert.equal(await evaluate("document.querySelector('.shortage-table__row').querySelectorAll('input[type=number]')[2].value"), '7');
    await send('Page.navigate',{url:`${origin}/admin/products`});
    await waitFor(async () => evaluate("(()=>{if(document.querySelector('.shortage-table__row'))return true;document.querySelector('.product-card__view-button')?.click();return false;})()"));
    await waitFor(async () => evaluate("document.querySelector('.shortage-table__row input[type=number]')?.value === '3'"));
    assert.equal(await evaluate("document.querySelector('.shortage-table__row').querySelectorAll('input[type=number]')[2].value"), '7');
  } finally {
    if (closeBrowser) await Promise.race([closeBrowser().catch(() => {}), delay(3000)]);
    socket?.close();
    for (const process of [chrome,server]) process.kill('SIGTERM');
    await Promise.all([chrome,server].map(async process => { if (process.exitCode === null && process.signalCode === null) await Promise.race([once(process,'exit'),delay(5000)]); if (process.exitCode === null && process.signalCode === null) process.kill('SIGKILL'); }));
    await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:250});
  }
});
