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

test('fixture calendar links to rental ledger and detail in Chrome', { timeout: 90000 }, async () => {
  const port = await freePort(), debuggerPort = await freePort();
  const origin = `http://127.0.0.1:${port}`, debug = `http://127.0.0.1:${debuggerPort}`;
  const profile = await mkdtemp(join(tmpdir(), 'vintad3e-partners-browser-'));
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)], { env:{...process.env,NODE_ENV:'development',VINTAD3E_PARTNERS_FIXTURE:'1'}, stdio:'ignore' });
  const chrome = spawn('google-chrome', ['--headless=new','--no-sandbox','--disable-dev-shm-usage',`--user-data-dir=${profile}`,`--remote-debugging-port=${debuggerPort}`,'about:blank'], { stdio:'ignore' });
  let socket, closeBrowser;
  try {
    await waitFor(async () => (await fetch(origin)).ok);
    await waitFor(async () => (await fetch(`${debug}/json/version`)).ok);
    const target = await (await fetch(`${debug}/json/new?about:blank`, {method:'PUT'})).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject) => { socket.addEventListener('open',resolve,{once:true}); socket.addEventListener('error',reject,{once:true}); });
    let sequence = 0; const pending = new Map();
    socket.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { const {resolve,reject} = pending.get(message.id); pending.delete(message.id); message.error ? reject(new Error(message.error.message)) : resolve(message.result); } });
    const send = (method,params={}) => new Promise((resolve,reject) => { const id = ++sequence; pending.set(id,{resolve,reject}); socket.send(JSON.stringify({id,method,params})); });
    closeBrowser = () => send('Browser.close');
    const evaluate = async expression => { const result = await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true}); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; };
    await send('Page.navigate',{url:origin});
    await waitFor(async () => evaluate("Boolean(document.querySelector('.partners-calendar__chip'))"));
    assert.equal(await evaluate("document.querySelector('.partners-calendar__chip').getAttribute('href')"),'/rental');
    await evaluate("document.querySelector('.partners-calendar__chip').click()");
    await waitFor(async () => evaluate("Boolean(document.querySelector('.partners-ledger'))"));
    assert.ok(await evaluate("document.querySelector('.partners-ledger tbody').textContent.includes('100,000원')"));
    await waitFor(async () => evaluate("(()=>{if(document.querySelector('.partners-ledger__detail'))return true;document.querySelector('.partners-ledger tbody button')?.click();return false;})()"));
    assert.ok(await evaluate("document.querySelector('.partners-ledger__detail').textContent.includes('대관료')"));
    assert.ok(await evaluate("document.querySelector('.partners-ledger__detail').textContent.includes('100,000원')"));
    await evaluate("document.querySelector('input[name=query]').value='찾을 수 없는 대관처';document.querySelector('.partners-ledger form').requestSubmit()");
    await waitFor(async () => evaluate("Boolean(document.querySelector('.staff-empty'))"));
    await evaluate("document.querySelector('.partners-ledger button[type=reset]').click()");
    await waitFor(async () => evaluate("document.querySelectorAll('.partners-ledger tbody tr').length===2"));
    await evaluate("document.querySelector('.partners-ledger select[name=status]').value='PENDING';document.querySelector('.partners-ledger form').requestSubmit()");
    await waitFor(async () => evaluate("document.querySelectorAll('.partners-ledger tbody tr').length===1 && document.querySelector('.partners-ledger tbody').textContent.includes('대관처 02')"));
    assert.ok(await evaluate("document.querySelector('.partners-ledger tbody').textContent.includes('미수납')"));
    assert.ok(await evaluate("!document.querySelector('.partners-ledger tbody').textContent.includes('100,000원')"));
  } finally {
    if (closeBrowser) await Promise.race([closeBrowser().catch(() => {}), delay(3000)]);
    socket?.close();
    for (const process of [chrome,server]) process.kill('SIGTERM');
    await Promise.all([chrome,server].map(async process => { if (process.exitCode === null && process.signalCode === null) await Promise.race([once(process,'exit'),delay(5000)]); if (process.exitCode === null && process.signalCode === null) process.kill('SIGKILL'); }));
    await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:250});
  }
});
