import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
async function freePort() { const server=createServer(); server.listen(0,'127.0.0.1'); await once(server,'listening'); const port=server.address().port; await new Promise(resolve=>server.close(resolve)); return port; }
async function waitFor(fn) { for(let i=0;i<120;i++){try{const result=await fn();if(result)return result;}catch{}await delay(250);}throw new Error('Timed out'); }
test('self fixture shows only own schedule and attendance without edit controls', {timeout:120000}, async()=>{
  const port=await freePort(),debugPort=await freePort(),origin=`http://127.0.0.1:${port}`,debug=`http://127.0.0.1:${debugPort}`;
  const profile=await mkdtemp(join(tmpdir(),'vintad3e-timetable-self-'));
  const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,NODE_ENV:'development',VINTAD3E_TIMETABLE_FIXTURE:'1',VINTAD3E_TIMETABLE_FIXTURE_ADMIN:'',VINTAD3E_TIMETABLE_FIXTURE_SELF:'1'},stdio:'ignore'});
  const chrome=spawn('google-chrome',['--headless=new','--no-sandbox','--disable-dev-shm-usage',`--user-data-dir=${profile}`,`--remote-debugging-port=${debugPort}`,'about:blank'],{stdio:'ignore'});
  let socket,closeBrowser;
  try {
    await waitFor(async()=>(await fetch(origin)).ok); await waitFor(async()=>(await fetch(`${debug}/json/version`)).ok);
    const target=await(await fetch(`${debug}/json/new?about:blank`,{method:'PUT'})).json(); socket=new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
    let sequence=0;const pending=new Map();socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const {resolve,reject}=pending.get(message.id);pending.delete(message.id);message.error?reject(new Error(message.error.message)):resolve(message.result);}});
    const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});closeBrowser=()=>send('Browser.close');
    const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text);return result.result.value;};
    await send('Page.navigate',{url:`${origin}/?view=schedule&month=2026-02`});
    await waitFor(async()=>evaluate("Boolean(document.querySelector('[data-calendar-month] button[data-hydrated=true]'))"));
    await evaluate(`sessionStorage.setItem('vintad3e:timetable-schedule', JSON.stringify({
      '2026-02-08-employee-1':{startInput:'2026-02-08T09:00',endInput:'2026-02-08T18:00',note:'본인 업무',attendance:{startsAt:'2026-02-08T00:00:00.000Z',endsAt:'2026-02-08T09:00:00.000Z'}},
      '2026-02-18-employee-2':{startInput:'2026-02-18T09:00',endInput:'2026-02-18T18:00',note:'다른 직원 업무',attendance:{startsAt:'2026-02-18T00:00:00.000Z',endsAt:'2026-02-18T09:00:00.000Z'}}}));window.__beforeReload=true`);
    await send('Page.reload');
    await waitFor(async()=>evaluate("window.__beforeReload!==true && document.querySelector('[data-schedule-date=\"2026-02-08\"] button[data-hydrated=true]')?.classList.contains('schedule-calendar__shift--checked-out')"));
    assert.equal(await evaluate("Boolean(document.querySelector('[data-schedule-date=\"2026-02-18\"] button.schedule-calendar__shift'))"),false);
    await evaluate("document.querySelector('[data-schedule-date=\"2026-02-08\"] button').click()");
    await waitFor(async()=>evaluate("Boolean(document.querySelector('dialog[open]'))"));
    assert.equal(await evaluate("document.querySelector('dialog input[aria-label=\"예정 시작\"]').disabled"),true);
    assert.equal(await evaluate("[...document.querySelectorAll('dialog button')].some(x=>x.textContent==='수정' || x.textContent==='삭제')"),false);
    await send('Page.navigate',{url:`${origin}/?view=history&range=all&employee=00000000-0000-4000-8000-000000000003`});
    await waitFor(async()=>evaluate("document.querySelector('article.attendance-history-card')?.textContent.includes('직원 01')"));
    assert.equal(await evaluate("document.querySelectorAll('article.attendance-history-card').length"),1);
    assert.equal(await evaluate("Boolean(document.querySelector('button.attendance-history-card'))"),false);
    assert.equal(await evaluate("document.querySelector('.attendance-history-list').textContent.includes('다른 직원 업무')"),false);
    await evaluate('window.__beforeReload=true');await send('Page.reload');
    await waitFor(async()=>evaluate("window.__beforeReload!==true && document.querySelector('article.attendance-history-card')?.textContent.includes('본인 업무')"));
    await evaluate("sessionStorage.setItem('vintad3e:timetable-schedule','{bad');window.__beforeReload=true");await send('Page.reload');
    await waitFor(async()=>evaluate("window.__beforeReload!==true && document.querySelector('.attendance-history-list [role=alert]')?.textContent.includes('출근부를 불러오지 못했습니다')"));
    await send('Page.navigate',{url:`${origin}/?view=schedule&month=2026-02`});
    await waitFor(async()=>evaluate("document.querySelector('.schedule-calendar-page [role=alert]')?.textContent.includes('근무시간표를 불러오지 못했습니다')"));
    assert.equal(await evaluate("Boolean(document.querySelector('button.schedule-calendar__shift'))"),false);
  } finally {
    if(closeBrowser)await Promise.race([closeBrowser().catch(()=>{}),delay(3000)]);socket?.close();
    for(const child of [chrome,server])child.kill('SIGTERM');
    await Promise.all([chrome,server].map(async child=>{if(child.exitCode===null&&child.signalCode===null)await Promise.race([once(child,'exit'),delay(5000)]);if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');}));
    await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:250});
  }
});
