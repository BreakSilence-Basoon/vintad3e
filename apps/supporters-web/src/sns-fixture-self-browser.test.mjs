import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
async function freePort() { const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));return port; }
async function waitFor(fn) { for(let i=0;i<120;i++){try{const value=await fn();if(value)return value;}catch{}await delay(250);}throw new Error('Timed out'); }

test('synthetic self registration and connections stay in this tab without SNS requests', { timeout: 120000 }, async () => {
  const port=await freePort(),debugPort=await freePort(),origin=`http://127.0.0.1:${port}`,debug=`http://127.0.0.1:${debugPort}`;
  const profile=await mkdtemp(join(tmpdir(),'vintad3e-supporters-self-'));
  const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,NODE_ENV:'development',VINTAD3E_SUPPORTERS_FIXTURE:'1',VINTAD3E_SUPPORTERS_FIXTURE_ORIGIN:origin,VINTAD3E_SUPPORTERS_FIXTURE_SELF:'1'},stdio:'ignore'});
  const chrome=spawn('google-chrome',['--headless=new','--no-sandbox','--disable-dev-shm-usage',`--user-data-dir=${profile}`,`--remote-debugging-port=${debugPort}`,'about:blank'],{stdio:'ignore'});
  let socket,closeBrowser;
  try {
    await waitFor(async()=>(await fetch(`${origin}/instagram`)).ok);await waitFor(async()=>(await fetch(`${debug}/json/version`)).ok);
    const target=await(await fetch(`${debug}/json/new?about:blank`,{method:'PUT'})).json();socket=new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
    let sequence=0;const pending=new Map();socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const {resolve,reject}=pending.get(message.id);pending.delete(message.id);message.error?reject(new Error(message.error.message)):resolve(message.result);}});
    const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});closeBrowser=()=>send('Browser.close');
    const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text);return result.result.value;};
    const guard=async()=>evaluate("window.snsRequests=0;window.originalFetch=window.fetch.bind(window);window.fetch=(input,init)=>{if(new URL(typeof input==='string'?input:input.url,location.href).pathname.startsWith('/api/')){window.snsRequests++;return Promise.reject(new Error('unexpected request'));}return window.originalFetch(input,init)}");
    await send('Page.navigate',{url:`${origin}/instagram`});
    await waitFor(async()=>evaluate("location.pathname === '/sign-in' && Boolean(document.querySelector('form button'))"));
    await evaluate("document.querySelector('form button').click()");
    await waitFor(async()=>evaluate("document.querySelectorAll('.register-toggle-button:not(:disabled)').length===2"));
    await guard();
    assert.equal(await evaluate("Boolean(document.querySelector('.gtm-page select[name=staff]'))"),false);
    assert.equal(await evaluate("document.querySelector('.register-toggle-button').getAttribute('aria-pressed')"),'true');
    await evaluate("document.querySelector('.register-toggle-button').click()");
    await waitFor(async()=>evaluate("document.querySelector('.register-toggle-button').getAttribute('aria-pressed')==='false'"));
    assert.equal(await evaluate('window.snsRequests'),0);
    await evaluate('window.__selfBeforeReload = true');
    await send('Page.reload');
    await waitFor(async()=>evaluate("window.__selfBeforeReload !== true && document.querySelector('.register-toggle-button:not(:disabled)')?.getAttribute('aria-pressed')==='false'"));
    await guard();
    await evaluate("window.confirm=()=>false;[...document.querySelectorAll('button')].find(x=>x.textContent==='연결 해제').click()");
    assert.ok(await evaluate("Boolean(document.querySelector('.gtm-sns-performance-table'))"));
    await evaluate("window.confirm=()=>true;[...document.querySelectorAll('button')].find(x=>x.textContent==='연결 해제').click()");
    await waitFor(async()=>evaluate("Boolean(document.querySelector('.gtm-section--connect a'))"));
    assert.equal(await evaluate('window.snsRequests'),0);
    await evaluate('window.__selfBeforeReload = true');
    await send('Page.reload');
    await waitFor(async()=>evaluate("window.__selfBeforeReload !== true && Boolean(document.querySelector('.gtm-section--connect a'))"));
    await guard();
    await evaluate("document.querySelector('.gtm-section--connect a').click()");
    await waitFor(async()=>evaluate("document.querySelector('.register-toggle-button:not(:disabled)')?.getAttribute('aria-pressed')==='false'"));
    assert.equal(await evaluate('window.snsRequests'),0);
    await send('Page.navigate',{url:`${origin}/tiktok`});
    await waitFor(async()=>evaluate("location.pathname === '/tiktok' && document.querySelector('.register-toggle-button:not(:disabled)')?.getAttribute('aria-pressed')==='true'"));
    await guard();
    await evaluate("window.savedSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new Error('unavailable')};document.querySelector('.register-toggle-button').click()");
    assert.equal(await evaluate("document.querySelector('.register-toggle-button').getAttribute('aria-pressed')"),'true');
    assert.equal(await evaluate('window.snsRequests'),0);
    await evaluate("Storage.prototype.setItem=window.savedSetItem");
  } finally {
    if(closeBrowser)await Promise.race([closeBrowser().catch(()=>{}),delay(3000)]);socket?.close();
    for(const child of [chrome,server])child.kill('SIGTERM');
    await Promise.all([chrome,server].map(async child=>{if(child.exitCode===null&&child.signalCode===null)await Promise.race([once(child,'exit'),delay(5000)]);if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');}));
    await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:250});
  }
});
