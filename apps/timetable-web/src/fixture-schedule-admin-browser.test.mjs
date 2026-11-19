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
test('synthetic schedule edits require a memo and survive reload and deletion', { timeout: 120000 }, async () => {
  const port = await freePort(), debugPort = await freePort();
  const origin = `http://127.0.0.1:${port}`, debug = `http://127.0.0.1:${debugPort}`;
  const profile = await mkdtemp(join(tmpdir(), 'vintad3e-schedule-admin-'));
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)], { env: { ...process.env, NODE_ENV:'development', VINTAD3E_TIMETABLE_FIXTURE:'1', VINTAD3E_TIMETABLE_FIXTURE_ADMIN:'1' }, stdio:'ignore' });
  const chrome = spawn('google-chrome', ['--headless=new','--no-sandbox','--disable-dev-shm-usage',`--user-data-dir=${profile}`,`--remote-debugging-port=${debugPort}`,'about:blank'], { stdio:'ignore' });
  let socket, closeBrowser;
  try {
    await waitFor(async () => (await fetch(origin)).ok); await waitFor(async () => (await fetch(`${debug}/json/version`)).ok);
    const target = await (await fetch(`${debug}/json/new?about:blank`, { method:'PUT' })).json(); socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject) => { socket.addEventListener('open',resolve,{once:true}); socket.addEventListener('error',reject,{once:true}); });
    let sequence=0; const pending = new Map();
    socket.addEventListener('message', event => { const message=JSON.parse(event.data); if (message.id && pending.has(message.id)) { const { resolve,reject }=pending.get(message.id); pending.delete(message.id); message.error ? reject(new Error(message.error.message)) : resolve(message.result); } });
    const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
    closeBrowser=()=>send('Browser.close');
    const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text);return result.result.value;};
    const card="[data-schedule-date='2026-02-08'] button.schedule-calendar__shift[data-hydrated=true]";
    await send('Page.navigate',{url:`${origin}/?view=schedule&month=2026-02`});
    await waitFor(async()=>evaluate(`Boolean(document.querySelector("${card}"))`));
    await evaluate(`document.querySelector("${card}").click()`); await waitFor(async()=>evaluate("Boolean(document.querySelector('dialog[open]'))"));
    await evaluate("document.querySelector('dialog form').requestSubmit()");
    await waitFor(async()=>evaluate("document.querySelector('[role=alert]')?.textContent.includes('메모를 작성해주세요')"));
    await evaluate("(()=>{const x=document.querySelector('dialog input[name=note]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(x,'업무 조정');x.dispatchEvent(new Event('input',{bubbles:true}))})()");
    await evaluate("(()=>{const x=document.querySelector('dialog input[name=startsAt]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(x,'2026-02-08T09:30');x.dispatchEvent(new Event('input',{bubbles:true}));x.dispatchEvent(new Event('change',{bubbles:true}))})()");
    await evaluate("document.querySelector('dialog form').requestSubmit()");
    await waitFor(async()=>evaluate(`!document.querySelector('dialog[open]') && document.querySelector("${card}")?.getAttribute('aria-label').includes('09:30')`));
    await evaluate('window.__scheduleBeforeReload = true'); await send('Page.reload');
    await waitFor(async()=>evaluate(`window.__scheduleBeforeReload !== true && document.querySelector("${card}")?.getAttribute('aria-label').includes('09:30')`));
    await evaluate(`document.querySelector("${card}").click()`); await waitFor(async()=>evaluate("document.querySelector('dialog input[name=note]')?.value === '업무 조정'"));
    await evaluate("[...document.querySelectorAll('dialog button')].find(x=>x.textContent==='삭제').click()");
    await waitFor(async()=>evaluate("Boolean([...document.querySelectorAll('dialog button')].find(x=>x.textContent==='삭제 확인'))"));
    await evaluate("[...document.querySelectorAll('dialog button')].find(x=>x.textContent==='삭제 확인').click()");
    await waitFor(async()=>evaluate(`!document.querySelector('dialog[open]') && !document.querySelector("${card}")`));
    await evaluate('window.__scheduleBeforeReload = true'); await send('Page.reload');
    await waitFor(async()=>evaluate("window.__scheduleBeforeReload !== true && Boolean(document.querySelector('[data-calendar-month]'))"));
    assert.equal(await evaluate(`Boolean(document.querySelector("${card}"))`), false);
  } finally {
    if (closeBrowser) await Promise.race([closeBrowser().catch(()=>{}),delay(3000)]); socket?.close();
    for (const child of [chrome,server]) child.kill('SIGTERM');
    await Promise.all([chrome,server].map(async child=>{if(child.exitCode===null&&child.signalCode===null)await Promise.race([once(child,'exit'),delay(5000)]);if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');}));
    await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:250});
  }
});
