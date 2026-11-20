import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

async function freePort() { const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening'); const port = socket.address().port; await new Promise(resolve => socket.close(resolve)); return port; }
async function waitFor(fn) { for (let i = 0; i < 120; i++) { try { const result = await fn(); if (result) return result; } catch {} await delay(250); } throw new Error('Timed out'); }

test('fixture administrator edits, reloads and deletes attendance with required memo', { timeout: 120000 }, async () => {
  const port = await freePort(), debugPort = await freePort();
  const origin = `http://127.0.0.1:${port}`, debug = `http://127.0.0.1:${debugPort}`;
  const profile = await mkdtemp(join(tmpdir(), 'vintad3e-timetable-admin-'));
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)], { env: { ...process.env, NODE_ENV:'development', VINTAD3E_TIMETABLE_FIXTURE:'1', VINTAD3E_TIMETABLE_FIXTURE_ORIGIN:origin, VINTAD3E_TIMETABLE_FIXTURE_ADMIN:'1' }, stdio:'ignore' });
  const chrome = spawn('google-chrome', ['--headless=new','--no-sandbox','--disable-dev-shm-usage',`--user-data-dir=${profile}`,`--remote-debugging-port=${debugPort}`,'about:blank'], { stdio:'ignore' });
  let socket, closeBrowser;
  try {
    await waitFor(async () => (await fetch(origin)).ok);
    await waitFor(async () => (await fetch(`${debug}/json/version`)).ok);
    const target = await (await fetch(`${debug}/json/new?about:blank`, { method:'PUT' })).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject) => { socket.addEventListener('open',resolve,{once:true}); socket.addEventListener('error',reject,{once:true}); });
    let sequence=0; const pending = new Map();
    socket.addEventListener('message', event => { const message=JSON.parse(event.data); if (message.id && pending.has(message.id)) { const { resolve,reject }=pending.get(message.id); pending.delete(message.id); message.error ? reject(new Error(message.error.message)) : resolve(message.result); } });
    const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
    closeBrowser=()=>send('Browser.close');
    const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text);return result.result.value;};
    await send('Page.navigate',{url:`${origin}/sign-in`});
    await waitFor(async()=>evaluate("Boolean(document.querySelector('form button'))"));
    await evaluate("document.querySelector('form button').click()"); await waitFor(async()=>evaluate("location.pathname === '/'"));
    await send('Page.navigate',{url:`${origin}/?view=history&range=last7`});
    await waitFor(async()=>evaluate("document.querySelectorAll('button.attendance-history-card[data-hydrated=true]').length === 7"));
    await evaluate("document.querySelectorAll('button.attendance-history-card')[1].click()");
    await waitFor(async()=>evaluate("Boolean(document.querySelector('dialog[open]'))"));
    await evaluate("document.querySelector('dialog form').requestSubmit()");
    assert.ok(await evaluate("document.querySelector('[role=alert]').textContent.includes('메모를 작성해주세요')"));
    await evaluate("(()=>{const x=document.querySelector('dialog input[name=reason]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(x,'합성 사유');x.dispatchEvent(new Event('input',{bubbles:true}))})()");
    await evaluate("(()=>{const x=document.querySelector('dialog input[name=checkInAt]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(x,x.value.slice(0,11)+'08:55');x.dispatchEvent(new Event('input',{bubbles:true}));x.dispatchEvent(new Event('change',{bubbles:true}))})()");
    await evaluate("(()=>{const x=document.querySelector('dialog input[name=checkOutAt]');window.originalCheckout=x.value;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(x,'2099-01-01T17:00');x.dispatchEvent(new Event('input',{bubbles:true}));x.dispatchEvent(new Event('change',{bubbles:true}));})()");
    await evaluate("document.querySelector('dialog form').requestSubmit()");
    await waitFor(async()=>evaluate("document.querySelector('[role=alert]')?.textContent.includes('미래 시각')"));
    await evaluate("(()=>{const x=document.querySelector('dialog input[name=checkOutAt]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(x,window.originalCheckout);x.dispatchEvent(new Event('input',{bubbles:true}));x.dispatchEvent(new Event('change',{bubbles:true}));})()");
    await evaluate("document.querySelector('dialog form').requestSubmit()");
    await waitFor(async()=>evaluate("!document.querySelector('dialog[open]') && document.querySelector('.attendance-history-card__note')?.textContent === '합성 사유'"));
    await evaluate('window.__historyBeforeReload = true');
    await send('Page.reload');
    await waitFor(async()=>evaluate("window.__historyBeforeReload !== true && document.querySelector('.attendance-history-card__note')?.textContent === '합성 사유' && Boolean(document.querySelector('.attendance-history-card__note').closest('button'))"));
    assert.ok(await evaluate("document.querySelector('.attendance-history-card__note').closest('button').textContent.includes('8:55')"));
    await evaluate("document.querySelector('.attendance-history-card__note').closest('button').click()");
    await waitFor(async()=>evaluate("Boolean(document.querySelector('dialog[open]'))"));
    await evaluate("document.querySelector('dialog form').requestSubmit()");
    await waitFor(async()=>evaluate("document.querySelector('[role=alert]')?.textContent.includes('변경된 출퇴근 시각이 없습니다')"));
    await evaluate("(()=>{const x=document.querySelector('dialog input[name=reason]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(x,'  정정 메모  ');x.dispatchEvent(new Event('input',{bubbles:true}))})()");
    await evaluate("document.querySelector('dialog form').requestSubmit()");
    await waitFor(async()=>evaluate("!document.querySelector('dialog[open]') && document.querySelector('.attendance-history-card__note')?.textContent === '정정 메모'"));
    await evaluate('window.__historyBeforeReload = true');
    await send('Page.reload');
    await waitFor(async()=>evaluate("window.__historyBeforeReload !== true && document.querySelector('.attendance-history-card__note')?.textContent === '정정 메모' && Boolean(document.querySelector('.attendance-history-card__note').closest('button'))"));
    await evaluate("document.querySelector('.attendance-history-card__note').closest('button').click()");
    await waitFor(async()=>evaluate("Boolean(document.querySelector('dialog[open]'))"));
    await evaluate("[...document.querySelectorAll('dialog button')].find(x=>x.textContent==='삭제').click()");
    await waitFor(async()=>evaluate("Boolean([...document.querySelectorAll('dialog button')].find(x=>x.textContent==='삭제 확인'))"));
    await evaluate("[...document.querySelectorAll('dialog button')].find(x=>x.textContent==='삭제 확인').click()");
    await waitFor(async()=>evaluate("!document.querySelector('dialog[open]') && document.querySelectorAll('button.attendance-history-card').length === 6"));
    await evaluate('window.__historyBeforeReload = true');
    await send('Page.reload');
    await waitFor(async()=>evaluate("window.__historyBeforeReload !== true && document.querySelectorAll('button.attendance-history-card').length === 6"));
    assert.equal(await evaluate("Boolean(document.querySelector('.attendance-history-card__note'))"), false);
    await evaluate("sessionStorage.setItem('vintad3e-timetable-history-fixture','{bad');window.__historyBeforeReload=true");
    await send('Page.reload');
    await waitFor(async()=>evaluate("window.__historyBeforeReload !== true && document.querySelectorAll('button.attendance-history-card[data-hydrated=true]').length === 7"));
    await evaluate("document.querySelectorAll('button.attendance-history-card')[1].click()");
    await waitFor(async()=>evaluate("Boolean(document.querySelector('dialog[open] input[name=reason]'))"));
    await evaluate("(()=>{const x=document.querySelector('dialog input[name=reason]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(x,'업무 메모');x.dispatchEvent(new Event('input',{bubbles:true}))})()");
    await evaluate("document.querySelector('dialog form').requestSubmit()");
    await waitFor(async()=>evaluate("document.querySelector('dialog [role=alert]')?.textContent.includes('출퇴근 시각을 저장하지 못했습니다')"));
    assert.equal(await evaluate("sessionStorage.getItem('vintad3e-timetable-history-fixture')"), '{bad');
  } finally {
    if (closeBrowser) await Promise.race([closeBrowser().catch(()=>{}),delay(3000)]);
    socket?.close();
    for (const child of [chrome,server]) child.kill('SIGTERM');
    await Promise.all([chrome,server].map(async child=>{if(child.exitCode===null&&child.signalCode===null)await Promise.race([once(child,'exit'),delay(5000)]);if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');}));
    await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:250});
  }
});
