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

test('fixture member type navigation in Chrome', { timeout: 90000 }, async () => {
  const port = await freePort(), debuggerPort = await freePort();
  const origin = `http://127.0.0.1:${port}`, debug = `http://127.0.0.1:${debuggerPort}`;
  const profile = await mkdtemp(join(tmpdir(), 'vintad3e-admin-browser-'));
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)], { env:{...process.env,NODE_ENV:'development',VINTAD3E_ADMIN_FIXTURE:'1'}, stdio:'ignore' });
  const chrome = spawn('google-chrome', ['--headless=new','--no-sandbox','--disable-dev-shm-usage',`--user-data-dir=${profile}`,`--remote-debugging-port=${debuggerPort}`,'about:blank'], { stdio:'ignore' });
  let socket, closeBrowser;
  try {
    await waitFor(async () => (await fetch(`${origin}/members`)).ok);
    assert.equal((await fetch(`${origin}/members/unknown`)).status, 404);
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
    await waitFor(async () => evaluate("document.querySelectorAll('.home-matrix tbody tr').length === 11"));
    assert.ok(await evaluate("document.querySelector('.home-matrix tbody').textContent.includes('직원 01')"));
    assert.ok(await evaluate("document.querySelector('.home-matrix tbody').textContent.includes('정상')"));
    assert.equal(await evaluate("document.querySelectorAll('.home-matrix a').length"),0);
    await send('Page.navigate',{url:`${origin}/members`});
    await waitFor(async () => evaluate("document.querySelector('.staff-table tbody')?.textContent.includes('staff01@example.invalid')"));
    assert.equal(await evaluate("document.querySelectorAll('.staff-table tbody tr').length"),2);
    assert.equal(await evaluate("document.querySelectorAll('.staff-table tbody a').length"),2);
    await evaluate("document.querySelector('.staff-table tbody a').click()");
    await waitFor(async () => evaluate("document.querySelector('.staff-console')?.textContent.includes('staff01@example.invalid') && document.querySelector('.staff-console')?.textContent.includes('Portal')"));
    assert.ok(await evaluate("document.querySelector('.staff-console').textContent.includes('크루')"));
    await evaluate("document.querySelector('.admin-actions a').click()");
    await waitFor(async () => evaluate("Boolean(document.querySelector('.permissions-matrix'))"));
    assert.ok(await evaluate("document.querySelector('.permissions-matrix tbody').textContent.includes('관리자 01') && document.querySelector('.permissions-matrix tbody').textContent.includes('어드민')"));
    await waitFor(async () => evaluate("(()=>{if(document.querySelector('.permissions-matrix tbody')?.textContent.includes('직원 01'))return true;const s=document.querySelector('select');if(s&&!s.disabled){s.value='crew';s.dispatchEvent(new Event('change',{bubbles:true}));}return false;})()"));
    assert.ok(await evaluate("document.querySelector('.permissions-matrix tbody').textContent.includes('크루')"));
    await waitFor(async () => evaluate("(()=>{if(document.querySelector('.permissions-matrix tbody')?.textContent.includes('외부 구성원 01'))return true;const s=document.querySelector('select');if(s&&!s.disabled){s.value='guest';s.dispatchEvent(new Event('change',{bubbles:true}));}return false;})()"));
    assert.ok(await evaluate("document.querySelector('.permissions-matrix tbody').textContent.includes('게스트')"));
    await send('Page.navigate',{url:`${origin}/permissions/apps?app=partners`});
    await waitFor(async () => evaluate("document.querySelectorAll('.staff-table')[1]?.textContent.includes('외부 구성원 01')"));
    assert.ok(await evaluate("document.querySelectorAll('.staff-table')[1].textContent.includes('게스트')"));
    assert.ok(await evaluate("document.querySelectorAll('.staff-table')[1].textContent.includes('관리자 01') && document.querySelectorAll('.staff-table')[1].textContent.includes('어드민')"));
    assert.ok(await evaluate("document.querySelector('.preview-menu-permissions').textContent.includes('대관')"));
    assert.deepEqual(await evaluate("[...document.querySelector('.preview-menu-permissions tbody tr:first-child').cells].map(cell=>cell.textContent)"), ['DJ', '전체', '없음', '없음']);
    assert.deepEqual(await evaluate("[...document.querySelector('.preview-menu-permissions tbody tr:last-child').cells].map(cell=>cell.textContent)"), ['협업처', '전체', '없음', '읽기만']);
    await waitFor(async () => evaluate("(()=>{if(document.querySelectorAll('.staff-table')[1]?.textContent.includes('직원 01'))return true;const s=document.querySelector('select');if(s&&!s.disabled){s.value='portal';s.dispatchEvent(new Event('change',{bubbles:true}));}return false;})()"));
    assert.ok(await evaluate("document.querySelectorAll('.staff-table')[1].textContent.includes('크루')"));
    await send('Page.navigate',{url:`${origin}/members`});
    await waitFor(async () => evaluate("document.querySelector('.staff-table tbody')?.textContent.includes('staff01@example.invalid')"));
    await evaluate("document.querySelector('[href=\"/members?type=partner\"]').click()");
    await waitFor(async () => evaluate("document.querySelector('.staff-table tbody')?.textContent.includes('partner01@example.invalid')"));
    assert.equal(await evaluate("document.querySelector('[href=\"/members?type=partner\"]').getAttribute('aria-current')"),'page');
    assert.equal(await evaluate("document.querySelector('.staff-table tbody').textContent.includes('staff01@example.invalid')"),false);
    await evaluate("document.querySelector('.staff-table tbody a').click()");
    await waitFor(async () => evaluate("document.querySelector('.staff-console')?.textContent.includes('partner01@example.invalid') && document.querySelector('.staff-console')?.textContent.includes('Partners')"));
    assert.ok(await evaluate("document.querySelector('.staff-console').textContent.includes('게스트')"));
    await send('Page.navigate',{url:`${origin}/members?type=employee&type=partner`});
    await waitFor(async () => evaluate("document.querySelector('[role=alert]')?.textContent.includes('이 목록을 이어서 볼 수 없습니다.')"));
    await send('Page.navigate',{url:`${origin}/members`});
    await waitFor(async () => evaluate("Boolean(document.querySelector('[href=\"/audit\"]'))"));
    await evaluate("document.querySelector('[href=\"/audit\"]').click()");
    await waitFor(async () => evaluate("document.querySelectorAll('.audit-card').length === 10"));
    assert.ok(await evaluate("document.querySelector('.load-more-pager').textContent.includes('10 / 21')"));
    await evaluate("document.querySelector('.audit-card details summary').click()");
    assert.equal(await evaluate("document.querySelector('.audit-card details').open"),true);
    assert.ok(await evaluate("document.querySelector('.audit-card details').textContent.includes('admin.app-grant.set')"));
    await waitFor(async () => evaluate("(()=>{if(document.querySelectorAll('.audit-card').length===20)return true;document.querySelector('.load-more-pager button')?.click();return false;})()"));
    await waitFor(async () => evaluate("(()=>{if(document.querySelectorAll('.audit-card').length===21)return true;document.querySelector('.load-more-pager button')?.click();return false;})()"));
    assert.ok(await evaluate("document.querySelector('.load-more-pager').textContent.includes('21 / 21') && !document.querySelector('.load-more-pager button')"));
    await waitFor(async () => {
      if (await evaluate("document.querySelectorAll('.audit-card').length === 1 && document.querySelector('.audit-card').textContent.includes('외부 구성원 01')")) return true;
      await evaluate("(()=>{const x=document.querySelector('.audit-filter-bar input[type=search]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(x,'외부');x.dispatchEvent(new Event('input',{bubbles:true}));})()");
      await delay(200);
      await evaluate("document.querySelector('.audit-filter-bar').requestSubmit()");
      return false;
    });
    await waitFor(async () => evaluate("(()=>{if(document.querySelectorAll('.audit-card').length===10&&document.querySelector('.load-more-pager')?.textContent.includes('10 / 21'))return true;[...document.querySelectorAll('.audit-filter-bar button')].find(button=>button.textContent==='초기화')?.click();return false;})()"));
    await waitFor(async () => {
      if (await evaluate("document.querySelector('.load-more-pager')?.textContent.includes('10 / 19')")) return true;
      await evaluate("(()=>{const x=document.querySelectorAll('.audit-filter-bar select')[1];x.value='직원 02';x.dispatchEvent(new Event('change',{bubbles:true}));})()");
      await delay(200);
      await evaluate("document.querySelector('.audit-filter-bar').requestSubmit()");
      return false;
    });
    await waitFor(async () => evaluate("(()=>{if(document.querySelectorAll('.audit-card').length===19)return true;document.querySelector('.load-more-pager button')?.click();return false;})()"));
  } finally {
    if (closeBrowser) await Promise.race([closeBrowser().catch(() => {}), delay(3000)]);
    socket?.close();
    for (const process of [chrome,server]) process.kill('SIGTERM');
    await Promise.all([chrome,server].map(async process => { if (process.exitCode === null && process.signalCode === null) await Promise.race([once(process,'exit'),delay(5000)]); if (process.exitCode === null && process.signalCode === null) process.kill('SIGKILL'); }));
    await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:250});
  }
});
