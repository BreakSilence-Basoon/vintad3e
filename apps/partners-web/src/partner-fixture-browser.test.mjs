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

test('DJ entry is unavailable without the development fixture', { timeout: 60000 }, async () => {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)], { env:{...process.env,NODE_ENV:'development',VINTAD3E_PARTNERS_FIXTURE:''}, stdio:'ignore' });
  try {
    const response = await waitFor(async () => { const result = await fetch(`${origin}/dj`); return result.status === 404 ? result : false; });
    assert.equal(response.status, 404);
    assert.ok(!(await response.text()).includes('세무사 전달문'));
    assert.equal((await fetch(`${origin}/proj-bedroom`)).status, 404);
    assert.equal((await fetch(`${origin}/proj-bedroom/partner-01`)).status, 404);
  } finally {
    server.kill('SIGTERM');
    if (server.exitCode === null && server.signalCode === null) await Promise.race([once(server,'exit'),delay(5000)]);
    if (server.exitCode === null && server.signalCode === null) server.kill('SIGKILL');
  }
});

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
    await send('Page.navigate',{url:origin});
    await waitFor(async () => evaluate("Boolean(document.querySelector('.partners-calendar__chip[href=\"/proj-bedroom\"]'))"));
    await evaluate("document.querySelector('.partners-calendar__chip[href=\"/proj-bedroom\"]').click()");
    await waitFor(async () => evaluate("Boolean(document.querySelector('.partners-counterpart-card'))"));
    assert.equal(await evaluate("document.querySelector('.partners-counterpart-card').getAttribute('href')"), '/proj-bedroom/partner-01');
    await waitFor(async () => evaluate("(()=>{if(location.pathname==='/proj-bedroom/partner-01')return true;document.querySelector('.partners-counterpart-card')?.click();return false;})()"));
    await waitFor(async () => evaluate("Boolean(document.querySelector('.partners-settlement-terms'))"));
    assert.ok(await evaluate("document.querySelector('.partners-counterpart-heading h1').textContent.includes('협업처 01')"));
    assert.ok(await evaluate("document.querySelector('.partners-ledger tbody').textContent.includes('5,000원')"));
    await evaluate("document.querySelector('.partners-settlement-terms summary').click()");
    assert.ok(await evaluate("document.querySelector('.partners-settlement-terms').textContent.includes('판매금액의 5%')"));
    await send('Page.navigate',{url:`${origin}/proj-bedroom`});
    await waitFor(async () => evaluate("document.querySelectorAll('.partners-counterpart-card').length === 2"));
    await waitFor(async () => evaluate("(()=>{if(location.pathname==='/proj-bedroom/partner-02')return true;document.querySelector('.partners-counterpart-card[href=\"/proj-bedroom/partner-02\"]')?.click();return false;})()"));
    await waitFor(async () => evaluate("document.querySelector('.partners-counterpart-heading h1')?.textContent === '협업처 02'"));
    assert.ok(await evaluate("document.querySelector('.partners-ledger tbody').textContent.includes('7,000원') && !document.querySelector('.partners-ledger tbody').textContent.includes('5,000원')"));
    await evaluate("document.querySelector('.partners-settlement-terms summary').click()");
    assert.ok(await evaluate("document.querySelector('.partners-settlement-terms').textContent.includes('판매금액의 7%') && !document.querySelector('.partners-settlement-terms').textContent.includes('판매금액의 5%')"));
    assert.equal((await fetch(`${origin}/proj-bedroom/unknown`)).status, 404);
    await send('Page.navigate',{url:origin});
    await waitFor(async () => evaluate("Boolean(document.querySelector('.partners-calendar__chip[href=\"/dj\"]'))"));
    await evaluate("document.querySelector('.partners-calendar__chip[href=\"/dj\"]').click()");
    await waitFor(async () => evaluate("Boolean(document.querySelector('.partners-accountant'))"));
    await waitFor(async () => evaluate("document.querySelectorAll('.partners-ledger tbody tr').length === 2"));
    assert.ok(await evaluate("document.querySelector('.partners-ledger tbody').textContent.includes('지급 완료') && document.querySelector('.partners-ledger tbody').textContent.includes('지급 대기')"));
    await waitFor(async () => evaluate("(()=>{if(document.querySelector('.partners-ledger__detail'))return true;document.querySelector('.partners-ledger tbody button')?.click();return false;})()"));
    assert.ok(await evaluate("document.querySelector('.partners-ledger__detail').textContent.includes('출연료')"));
    await waitFor(async () => evaluate("(()=>{if(document.querySelectorAll('.partners-accountant__row').length===2)return true;[...document.querySelectorAll('.partners-accountant button')].find(x=>x.textContent==='DJ 추가')?.click();return false;})()"));
    await evaluate("document.querySelector('[aria-label=\"DJ 2 삭제\"]').click()");
    await waitFor(async () => evaluate("document.querySelectorAll('.partners-accountant__row').length===1"));
    await evaluate("(()=>{const inputs=document.querySelectorAll('.partners-accountant__row input');const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;[['DJ A',inputs[0]],['0000000000000',inputs[1]],['10000',inputs[2]]].forEach(([value,input])=>{set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});})()");
    await waitFor(async () => evaluate("document.querySelector('.partners-accountant__preview')?.textContent.includes('DJ A ******-******* 10,000원')"));
    assert.ok(await evaluate("!document.querySelector('.partners-accountant__preview').textContent.includes('0000000000000')"));
    await evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copied=text;}}});[...document.querySelectorAll('.partners-accountant button')].find(x=>x.textContent==='전달문 복사').click()");
    await waitFor(async () => evaluate("window.copied?.includes('DJ A 000000-0000000 10,000원')"));
    await send('Page.navigate',{url:`${origin}/rental`});
    await waitFor(async () => evaluate("location.pathname === '/rental' && Boolean(document.querySelector('.partners-ledger'))"));
    await send('Page.navigate',{url:`${origin}/dj`});
    await waitFor(async () => evaluate("Boolean(document.querySelector('.partners-accountant__row input'))"));
    assert.equal(await evaluate("document.querySelector('.partners-accountant__row input').value"), '');
  } finally {
    if (closeBrowser) await Promise.race([closeBrowser().catch(() => {}), delay(3000)]);
    socket?.close();
    for (const process of [chrome,server]) process.kill('SIGTERM');
    await Promise.all([chrome,server].map(async process => { if (process.exitCode === null && process.signalCode === null) await Promise.race([once(process,'exit'),delay(5000)]); if (process.exitCode === null && process.signalCode === null) process.kill('SIGKILL'); }));
    await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:250});
  }
});
