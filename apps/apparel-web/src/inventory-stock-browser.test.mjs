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

test('fixture stock validation, save and unsaved-change confirmations in Chrome', { timeout: 90000 }, async () => {
  const port = await freePort(), debuggerPort = await freePort();
  const origin = `http://127.0.0.1:${port}`, debug = `http://127.0.0.1:${debuggerPort}`;
  const profile = await mkdtemp(join(tmpdir(), 'vintad3e-apparel-browser-'));
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)], { env:{...process.env,NODE_ENV:'development',VINTAD3E_APPAREL_FIXTURE:'1'}, stdio:'ignore' });
  const chrome = spawn('google-chrome', ['--headless=new','--no-sandbox','--disable-dev-shm-usage',`--user-data-dir=${profile}`,`--remote-debugging-port=${debuggerPort}`,'about:blank'], { stdio:'ignore' });
  let socket;
  try {
    await waitFor(async () => (await fetch(`${origin}/admin/products`)).ok);
    await waitFor(async () => (await fetch(`${debug}/json/version`)).ok);
    const target = await (await fetch(`${debug}/json/new?about:blank`, {method:'PUT'})).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject) => { socket.addEventListener('open',resolve,{once:true}); socket.addEventListener('error',reject,{once:true}); });
    let sequence = 0; const pending = new Map();
    socket.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { const {resolve,reject} = pending.get(message.id); pending.delete(message.id); message.error ? reject(new Error(message.error.message)) : resolve(message.result); } });
    const send = (method,params={}) => new Promise((resolve,reject) => { const id = ++sequence; pending.set(id,{resolve,reject}); socket.send(JSON.stringify({id,method,params})); });
    const evaluate = async (expression) => { const result = await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true}); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; };
    const run = async expression => { await evaluate(expression); await delay(150); };
    await send('Page.navigate',{url:`${origin}/admin/products`});
    await waitFor(async () => evaluate("Boolean(document.querySelector('.product-card__view-button'))"));
    // The server-rendered button can appear before React attaches its handler.
    await waitFor(async () => evaluate("(()=>{if(document.querySelector('.shortage-table__row')) return true; document.querySelector('.product-card__view-button')?.click(); return false;})()"));
    const setNumber = async (index,value) => run(`(()=>{const x=document.querySelectorAll('.shortage-table__row')[0].querySelectorAll('input[type=number]')[${index}];Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(x,${JSON.stringify(value)});x.dispatchEvent(new Event('input',{bubbles:true}));x.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await setNumber(1,'10'); await setNumber(0,'3');
    assert.equal(await evaluate("document.querySelectorAll('.shortage-table__row')[0].querySelectorAll('input[type=number]')[2].value"),'7');
    await setNumber(2,'11'); await run("document.querySelector('.shortage-save-button').click()");
    assert.ok(await evaluate("document.querySelector('.admin-toast--error')?.textContent.includes('목표재고보다 클 수 없습니다')"));
    await setNumber(2,'7'); await run("document.querySelector('.shortage-save-button').click()");
    assert.ok(await evaluate("document.querySelector('.admin-toast--success')?.textContent.includes('저장했습니다')"));
    await setNumber(0,'4');
    await run("window.confirm = message => { window.lastConfirm = message; return false; }; document.querySelectorAll('.graphic-tabs button')[1].click()");
    assert.ok(await evaluate("window.lastConfirm.includes('탭을 바꿀까요?')"));
    assert.equal(await evaluate("document.querySelectorAll('.graphic-tabs button')[0].getAttribute('aria-selected')"),'true');
    await run("window.confirm = message => { window.lastConfirm = message; return true; }; document.querySelectorAll('.graphic-tabs button')[1].click()");
    assert.equal(await evaluate("document.querySelectorAll('.graphic-tabs button')[1].getAttribute('aria-selected')"),'true');
    await run("document.querySelectorAll('.graphic-tabs button')[0].click()");
    assert.equal(await evaluate("document.querySelectorAll('.shortage-table__row')[0].querySelectorAll('input[type=number]')[0].value"),'3');
    await setNumber(0,'5');
    await run("window.confirm = message => { window.lastConfirm = message; return false; }; document.querySelector('.graphic-dialog__close').click()");
    assert.ok(await evaluate("window.lastConfirm.includes('이대로 창을 닫을까요?')"));
    assert.ok(await evaluate("Boolean(document.querySelector('.graphic-dialog'))"));
    await run("window.confirm = () => true; document.querySelector('.graphic-dialog__close').click()");
    assert.equal(await evaluate("Boolean(document.querySelector('.graphic-dialog'))"),false);
    await run("document.querySelector('.product-card__view-button').click()");
    await run("document.querySelector('.shortage-table__row input[role=switch]').click()");
    assert.equal(await evaluate("document.querySelector('.shortage-table__row input[role=switch]').checked"),false);
    assert.equal(await evaluate("document.querySelectorAll('.shortage-table__row')[0].querySelectorAll('input[type=number]')[1].disabled"),true);
    assert.ok(await evaluate("document.querySelector('.admin-toast--success')?.textContent.includes('OFF으로 저장되었습니다')"));
    await run("document.querySelector('.shortage-table__row input[role=switch]').click()");
    assert.equal(await evaluate("document.querySelector('.shortage-table__row input[role=switch]').checked"),true);
  } finally {
    socket?.close();
    for (const process of [chrome,server]) process.kill('SIGTERM');
    await Promise.all([chrome,server].map(async process => { if (process.exitCode === null && process.signalCode === null) await Promise.race([once(process,'exit'),delay(5000)]); if (process.exitCode === null && process.signalCode === null) process.kill('SIGKILL'); }));
    await rm(profile,{recursive:true,force:true});
  }
});
